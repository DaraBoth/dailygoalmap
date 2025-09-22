
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for suggestions to reduce API calls
const suggestionCache: Record<string, {suggestions: string[], timestamp: number}> = {};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, dedicatedCall = false } = await req.json();
    const cacheKey = message.trim().toLowerCase();
    
    // Check cache for recent suggestions (less than 10 minutes old)
    const cachedResult = suggestionCache[cacheKey];
    if (cachedResult && (Date.now() - cachedResult.timestamp < 10 * 60 * 1000)) {
      console.log("Using cached suggestions for:", cacheKey.substring(0, 30));
      return new Response(
        JSON.stringify({ suggestions: cachedResult.suggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Always prioritize using the dedicated suggestions API key
    const apiKey = await getGeminiApiKey(dedicatedCall);
    
    if (!apiKey) {
      console.error("No API key available for suggestions");
      return new Response(
        JSON.stringify({ 
          suggestions: getDefaultSuggestions(message),
          error: "No API key available"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call Gemini API to generate suggestions
    const suggestions = await generateSuggestions(message, apiKey);
    
    // Cache the result
    suggestionCache[cacheKey] = {
      suggestions,
      timestamp: Date.now()
    };
    
    console.log(`Generated ${suggestions.length} suggestions for: ${cacheKey.substring(0, 30)}`);
    
    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error generating suggestions:", error);
    
    return new Response(
      JSON.stringify({ 
        suggestions: getDefaultSuggestions(message),
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Fetches API key - prioritizing the dedicated suggestions key
async function getGeminiApiKey(dedicatedCall: boolean): Promise<string> {
  try {
    // Check for dedicated suggestions environment variable first
    const dedicatedApiKey = Deno.env.get('SUGGESTIONS_GEMINI_API_KEY');
    if (dedicatedApiKey) {
      console.log("Using dedicated SUGGESTIONS_GEMINI_API_KEY");
      return dedicatedApiKey;
    }
    
    // Fall back to regular Gemini API key
    const envApiKey = Deno.env.get('GEMINI_API_KEY');
    if (envApiKey) return envApiKey;
    
    // Attempt to get API key from database
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = Deno.env.toObject();
    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const supabaseClient = {
        url: SUPABASE_URL,
        key: SUPABASE_ANON_KEY,
      };

      // Try getting a dedicated suggestions API key first
      if (dedicatedCall) {
        const response = await fetch(`${supabaseClient.url}/rest/v1/api_keys?key_type=eq.gemini&key_name=ilike.*suggestion*`, {
          headers: {
            'ApiKey': supabaseClient.key,
            'Authorization': `Bearer ${supabaseClient.key}`,
          },
        });

        if (response.ok) {
          const keys = await response.json();
          if (keys.length > 0 && keys[0].key_value) {
            console.log("Using dedicated suggestions API key from database");
            return keys[0].key_value;
          }
        }
      }

      // Fall back to default Gemini key
      const response = await fetch(`${supabaseClient.url}/rest/v1/api_keys?key_type=eq.gemini&is_default=eq.true`, {
        headers: {
          'ApiKey': supabaseClient.key,
          'Authorization': `Bearer ${supabaseClient.key}`,
        },
      });

      if (response.ok) {
        const keys = await response.json();
        if (keys.length > 0 && keys[0].key_value) {
          return keys[0].key_value;
        }
      }
    }
    
    // Fallback key as last resort
    return "AIzaSyBKFsXn9J02iATYPlmDjWN0EmNmTHbVhL0"; // This is just a placeholder
  } catch (error) {
    console.error("Error fetching API key:", error);
    return "AIzaSyBKFsXn9J02iATYPlmDjWN0EmNmTHbVhL0"; // Default fallback
  }
}

// Generate suggestions using Gemini API
async function generateSuggestions(message: string, apiKey: string): Promise<string[]> {
  try {
    const prompt = `
Given the following message from an AI assistant that is helping a user create a goal plan:
"${message}"

Generate 3-4 possible high-quality responses the user might give. Make each response:
1. Concise (under 80 characters)
2. Direct and informative
3. Realistic and helpful for goal planning
4. Varied in style and content
5. Natural sounding

FORMAT: Return ONLY a JSON array of strings without any explanation.
`;

    // Use the flash model which has higher quotas and is cheaper
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          { 
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 200,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status}`, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      throw new Error("Invalid response from Gemini API");
    }

    const content = data.candidates[0].content.parts[0].text;
    
    // Try to parse JSON array from the response
    try {
      // Look for array pattern in the text, handles when model adds extra text
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        return Array.isArray(suggestions) ? suggestions : getDefaultSuggestions(message);
      }
      return getDefaultSuggestions(message);
    } catch (err) {
      console.error("Error parsing suggestions:", err);
      return getDefaultSuggestions(message);
    }
  } catch (error) {
    console.error("Error generating suggestions with Gemini:", error);
    return getDefaultSuggestions(message);
  }
}

// Fallback suggestions if API call fails
function getDefaultSuggestions(message?: string): string[] {
  if (!message) {
    return [
      "I'd like to create a fitness goal.",
      "Help me plan a vacation.",
      "I need to save money for something important."
    ];
  }
  
  // Generate context-aware default suggestions based on message keywords
  if (message.toLowerCase().includes("timeline") || message.toLowerCase().includes("how long")) {
    return [
      "3 months should be enough.",
      "I'm thinking around 6 months.",
      "1 year would be ideal for me."
    ];
  } else if (message.toLowerCase().includes("destination") || message.toLowerCase().includes("travel")) {
    return [
      "I'd love to visit Japan.",
      "Europe, particularly Italy and France.",
      "A tropical beach destination like Bali."
    ];
  } else if (message.toLowerCase().includes("budget") || message.toLowerCase().includes("cost")) {
    return [
      "Around $3,000 total.",
      "I can save about $500 per month.",
      "I'm on a tight budget, under $1,000 if possible."
    ];
  } else {
    return [
      "That sounds good to me.",
      "Could you give me more details?",
      "I'd like to explore other options.",
      "Yes, let's move forward with this plan."
    ];
  }
}
