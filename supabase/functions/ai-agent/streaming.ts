/**
 * Streaming Handlers for Different AI Models
 */

import { ModelType } from './types.ts';
import { getApiEndpoint, getModelInfo } from './models.ts';

interface AIMessage {
  role: string;
  content: string;
}

export async function streamAIResponse(
  modelId: ModelType,
  apiKey: string,
  messages: AIMessage[],
  systemInstruction: string,
  keyLabel?: string
): Promise<Response> {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send key info if available
        if (keyLabel) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'key_info',
            content: keyLabel,
            model: modelId
          })}\n\n`));
        }
        
        // Send initial thinking message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'thinking',
          content: 'Analyzing your request...'
        })}\n\n`));

        console.log('📡 Sent thinking message');

        // Get model info and stream
        const modelInfo = getModelInfo(modelId);
        if (!modelInfo) {
          throw new Error(`Unknown model: ${modelId}`);
        }

        switch (modelInfo.provider) {
          case 'gemini':
            await streamGemini(modelId, apiKey, messages, systemInstruction, controller, encoder);
            break;
          case 'openai':
            await streamOpenAI(modelId, apiKey, messages, systemInstruction, controller, encoder);
            break;
          case 'claude':
            await streamClaude(modelId, apiKey, messages, systemInstruction, controller, encoder);
            break;
          default:
            throw new Error(`Unsupported provider: ${modelInfo.provider}`);
        }

        console.log('📡 Stream finished, sending done signal');

        // Send completion signal
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'done'
        })}\n\n`));
        
        controller.close();
      } catch (error) {
        console.error('📡 Streaming error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          content: error instanceof Error ? error.message : 'Streaming failed'
        })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

async function streamGemini(
  modelId: ModelType,
  apiKey: string,
  messages: AIMessage[],
  systemInstruction: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  console.log(`🔵 Starting Gemini stream (${modelId})...`);
  
  // Convert messages to Gemini format
  const geminiMessages = messages.map((m: AIMessage) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  
  const endpoint = getApiEndpoint(modelId, apiKey);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    })
  });

  console.log(`🔵 Gemini response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('🔵 Gemini error:', errorText);
    
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded. Please wait a moment and try again, or switch to a different model/key.`);
    }
    
    throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log(`🔵 Gemini stream done. Total chunks: ${chunkCount}`);
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '[' || trimmed === ']' || trimmed === ',') continue;
      
      try {
        const data = JSON.parse(trimmed.replace(/^,/, ''));
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
          chunkCount++;
          console.log(`🔵 Gemini chunk ${chunkCount}:`, text.substring(0, 50));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'content',
            content: text
          })}\n\n`));
        }
      } catch {
        console.error('🔵 Gemini parse error, line:', trimmed.substring(0, 100));
      }
    }
  }
}

async function streamOpenAI(
  modelId: ModelType,
  apiKey: string,
  messages: AIMessage[],
  systemInstruction: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  console.log(`🟢 Starting OpenAI stream (${modelId})...`);

  const openAIMessages = [
    { role: 'system', content: systemInstruction },
    ...messages
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelId,
      messages: openAIMessages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: true
    })
  });

  console.log(`🟢 OpenAI response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('🟢 OpenAI error:', errorText);
    
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded. Please wait a moment and try again, or switch to a different model/key.`);
    }
    
    throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log(`🟢 OpenAI stream done. Total chunks: ${chunkCount}`);
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      
      const data = trimmed.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        const text = parsed.choices?.[0]?.delta?.content;
        
        if (text) {
          chunkCount++;
          console.log(`🟢 OpenAI chunk ${chunkCount}:`, text.substring(0, 50));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'content',
            content: text
          })}\n\n`));
        }
      } catch {
        console.error('🟢 OpenAI parse error');
      }
    }
  }
}

async function streamClaude(
  modelId: ModelType,
  apiKey: string,
  messages: AIMessage[],
  systemInstruction: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  console.log(`🟣 Starting Claude stream (${modelId})...`);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 8192,
      temperature: 0.7,
      system: systemInstruction,
      messages: messages,
      stream: true
    })
  });

  console.log(`🟣 Claude response status: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('🟣 Claude error:', errorText);
    
    if (response.status === 429) {
      throw new Error(`Rate limit exceeded. Please wait a moment and try again, or switch to a different model/key.`);
    }
    
    throw new Error(`Claude API error: ${response.status} - ${errorText.substring(0, 100)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log(`🟣 Claude stream done. Total chunks: ${chunkCount}`);
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      
      const data = trimmed.slice(6);

      try {
        const parsed = JSON.parse(data);
        
        if (parsed.type === 'content_block_delta') {
          const text = parsed.delta?.text;
          if (text) {
            chunkCount++;
            console.log(`🟣 Claude chunk ${chunkCount}:`, text.substring(0, 50));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'content',
              content: text
            })}\n\n`));
          }
        }
      } catch {
        console.error('🟣 Claude parse error');
      }
    }
  }
}
