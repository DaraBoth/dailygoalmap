# 💰 Monetization Strategy Assessment for DailyGoalMap

## Original Monetization Plan

### 1. Freemium Subscription Model
This is the most common and proven approach for productivity apps:

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 3 goals, basic templates, limited AI suggestions |
| Pro | $9.99/mo | Unlimited goals, all templates, full AI task generation, priority support |
| Team | $19.99/mo | Everything in Pro + team collaboration, shared goals, admin dashboard |

### 2. AI Credits System
Since you have AI-powered features (task generation, chat assistant):
- Give users limited free AI credits monthly
- Sell additional AI credit packs ($4.99 for 100 credits)
- This aligns costs with actual usage

### 3. Premium Templates Marketplace
- Offer basic templates for free
- Sell specialized premium templates ($2.99 - $9.99 each):
  - "12-Week Fitness Transformation"
  - "Side Hustle Launch Blueprint"
  - "FIRE Financial Independence Plan"
  - "Language Learning Accelerator"

### 4. Coaching/Expert Integration
- Partner with life coaches, financial advisors, fitness trainers
- They create branded goal templates
- Revenue share when users purchase their templates or book sessions

### 5. Enterprise/B2B Version
- Sell to companies for employee goal-setting (OKRs)
- White-label option for coaches/organizations
- Higher price point ($99-499/mo per organization)

### 6. One-Time Purchases
- Export/print beautiful goal progress reports (PDF)
- Advanced analytics dashboard
- Calendar integrations (Google Calendar, Outlook)

### Quick Wins to Start
1. Enable Stripe - You already have the infrastructure ready
2. Add a paywall around AI features (task generation uses API costs anyway)
3. Limit free tier to 3 active goals
4. Create 5-10 premium templates in high-demand niches (fitness, finance, career)

### Revenue Potential (Original Projections)
**If you get 1,000 users with 5% converting to Pro ($9.99/mo):**
- Monthly Revenue: ~$500/mo
- Annual Revenue: ~$6,000/year

**Scale to 10,000 users with 10% conversion:**
- Monthly Revenue: ~$10,000/mo
- Annual Revenue: ~$120,000/year

---

## ✅ Strengths of This Plan

### 1. Freemium Model - Perfect Fit
- **3 goals free tier** is a good balance (enough to see value, constrained enough to convert)
- **$9.99/mo Pro** is competitive with similar apps (Notion $10, Todoist Premium $8, Things 3 $50 one-time)
- **Team tier** makes sense since you already have goal sharing/collaboration features
- Established infrastructure for multi-user collaboration

### 2. AI Credits - Smart Move
- **Aligns costs with actual API usage** (OpenAI/Anthropic API costs)
- **Prevents abuse on free tier** - AI generation can be expensive
- **Creates upsell opportunities** - users who love AI will pay more
- **Predictable revenue model** - users pre-pay for credits

### 3. Premium Templates - High Margin
- You already have template infrastructure (`goalTemplates.ts`)
- **One-time creation, infinite sales** - perfect digital product
- **Good customer acquisition funnel**: free → premium templates → subscription
- Low maintenance, high profit margin
- **⚠️ Current Challenge**: Each premium template requires a separate n8n workflow (not scalable)

### 4. Enterprise/B2B - Growth Potential
- Higher price point with more stable, long-term contracts
- Company OKR/goal-setting is a proven market
- White-label option adds significant value

---

## ⚠️ Considerations & Improvements

### Priority Order (Recommended Implementation)
1. **Start with Freemium + AI limits** (easiest, immediate revenue)
2. **Premium templates** (scales well, no recurring costs)
3. **Team tier** (you already have sharing features)
4. **One-time purchases** (PDF exports, analytics)
5. **AI credits marketplace** (once AI usage is proven)
6. **Enterprise/B2B** (save for later - requires more support infrastructure)
7. **Marketplace/coaching integration** (complex, needs critical mass)

### Technical Gaps to Address
- [ ] No payment integration visible in codebase yet (Stripe/Supabase Payments)
- [ ] Need subscription state management (user tier tracking)
- [ ] Need feature flags for tier-based access control
- [ ] Need usage tracking for AI credits
- [ ] Need analytics dashboard for monitoring conversions
- [ ] Need billing portal for subscription management
- [ ] Need webhook handlers for payment events

### Missing from Original Plan

#### 1. Annual Discount Strategy
- **Offer**: $99/year (saves $20, ~2 months free)
- **Benefits**: Improved retention, upfront cash flow, reduces monthly churn
- **Implementation**: Add annual toggle in pricing page

#### 2. Lifetime Deals for Early Adopters
- **Offer**: $199-299 one-time payment for lifetime Pro access
- **Benefits**: Fast cash injection, creates loyal ambassadors
- **Risk**: Reduces recurring revenue, but great for initial traction
- **Limit**: Cap at first 100-500 users to maintain exclusivity

#### 3. Affiliate/Referral Program
- **Offer**: 10-20% commission on referrals or free months for referring users
- **Benefits**: User-driven growth, viral coefficient increase
- **Implementation**: Unique referral links, tracking system
- **Example**: "Refer 3 friends → get 1 month Pro free"

#### 4. "Pay What You Want" Upgrade Option
- **Offer**: Let users choose their price above minimum ($9.99+)
- **Benefits**: Some users will pay $15-20/mo if they love the product
- **Implementation**: Slider on upgrade page with suggested tiers
- **Psychology**: Creates goodwill and allows customers to self-segment

#### 5. Student/Non-Profit Discount
- **Offer**: 50% off Pro tier with valid .edu email or non-profit verification
- **Benefits**: Market expansion, word-of-mouth in educational institutions
- **Implementation**: Email verification system

#### 6. Add-On Features (À la carte)
Instead of bundling everything in Pro, offer individual features:
- **Advanced Analytics**: $2.99/mo
- **Calendar Sync**: $1.99/mo
- **AI Chat Assistant**: $4.99/mo
- **PDF Reports**: $0.99 per export

Allows users to customize their plan and increases ARPU (Average Revenue Per User).

---

## 🚀 Recommended Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. **Set up Stripe integration**
   - Create Stripe account and get API keys
   - Add Stripe SDK to project
   - Create subscription products in Stripe dashboard
   
2. **Database schema for subscriptions**
   ```sql
   -- Add to Supabase migrations
   CREATE TABLE user_subscriptions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     stripe_customer_id TEXT UNIQUE,
     stripe_subscription_id TEXT UNIQUE,
     tier TEXT CHECK (tier IN ('free', 'pro', 'team')),
     status TEXT CHECK (status IN ('active', 'canceled', 'past_due')),
     current_period_end TIMESTAMPTZ,
     ai_credits_remaining INTEGER DEFAULT 10,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE TABLE ai_credit_usage (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     credits_used INTEGER,
     action_type TEXT, -- 'task_generation', 'chat_message', etc.
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Feature gates/middleware**
   - Create `useSubscription` hook
   - Add feature flag checks before AI operations
   - Add goal limit enforcement

### Phase 2: Core Monetization (Week 3-4)
1. **Pricing page**
   - Create comparison table for tiers
   - Add Stripe Checkout integration
   - Implement "Upgrade" CTAs throughout app

2. **Subscription management**
   - Customer portal for managing billing
   - Webhook handlers for subscription events
   - Grace period for failed payments

3. **Goal limits for free tier**
   - Enforce 3-goal limit
   - Show upgrade prompt when limit reached
   - Allow viewing (but not creating) more goals

### Phase 3: Premium Templates (Week 5-6)
1. **Create 5-10 premium templates**
   - Fitness: "12-Week Transformation", "Marathon Training"
   - Finance: "FIRE Plan", "Debt Freedom in 12 Months"
   - Career: "Job Search Accelerator", "Side Hustle Launch"
   - Learning: "Language Mastery", "Learn to Code"

2. **Template marketplace UI**
   - Browse/search templates
   - Preview before purchase
   - One-click purchase and apply

3. **Template delivery system**
   - Stripe Products for each template
   - Unlock purchased templates for user
   - Track template purchases and usage

4. **🔧 N8N Workflow Automation (Critical)**
   - See "N8N Premium Template Automation" section below
   - Implement dynamic workflow routing instead of separate workflows per template

---

## 🤖 N8N Premium Template Automation Solutions

### Current Problem
Each premium template requires creating a separate n8n workflow manually with its own AI agent logic. This doesn't scale when you want to offer 10, 20, or 100+ premium templates.

### Solution 1: Dynamic Master Workflow (Recommended) ⭐

**Architecture:**
```
User purchases template 
  → Webhook to n8n with template metadata
    → Master workflow receives: {templateId, templateType, userGoal, userId}
      → Route to appropriate AI agent based on templateType
        → Generate customized tasks/content
          → Send back to DailyGoalMap API
```

**Implementation:**

1. **Create one master n8n workflow with conditional routing:**

```json
{
  "name": "Master Premium Template Processor",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "premium-template",
        "responseMode": "lastNode"
      }
    },
    {
      "name": "Parse Template Request",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Extract template metadata\nconst templateId = $input.item.json.templateId;\nconst templateType = $input.item.json.templateType;\nconst userGoal = $input.item.json.userGoal;\nconst userId = $input.item.json.userId;\n\nreturn {\n  json: {\n    templateId,\n    templateType,\n    userGoal,\n    userId,\n    // Load template config from database or static config\n    templateConfig: getTemplateConfig(templateType)\n  }\n};"
      }
    },
    {
      "name": "Route By Template Type",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "rules": {
          "rules": [
            {"output": 0, "conditions": {"templateType": "fitness"}},
            {"output": 1, "conditions": {"templateType": "finance"}},
            {"output": 2, "conditions": {"templateType": "career"}},
            {"output": 3, "conditions": {"templateType": "learning"}},
            {"output": 4, "conditions": {"templateType": "default"}}
          ]
        }
      }
    },
    {
      "name": "Fitness AI Agent",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "systemPrompt": "You are a fitness coach...",
        "prompt": "Create a 12-week fitness plan for: {{$json.userGoal}}"
      }
    },
    {
      "name": "Finance AI Agent",
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "systemPrompt": "You are a financial advisor...",
        "prompt": "Create a FIRE plan for: {{$json.userGoal}}"
      }
    }
    // ... other agents
  ]
}
```

2. **Store template configurations in database:**

```sql
-- Add to Supabase migrations
CREATE TABLE premium_template_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id TEXT UNIQUE NOT NULL,
  template_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  n8n_agent_prompt TEXT NOT NULL,
  system_instructions JSONB,
  default_tasks JSONB,
  customization_options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example data
INSERT INTO premium_template_configs (template_id, template_type, template_name, n8n_agent_prompt, system_instructions) VALUES
(
  'fitness-12week-transformation',
  'fitness',
  '12-Week Fitness Transformation',
  'You are an expert fitness coach. Create a detailed 12-week transformation plan...',
  '{
    "workoutsPerWeek": 4,
    "progressionModel": "linear",
    "includeNutrition": true
  }'
);
```

3. **Update your DailyGoalMap to send template metadata:**

```typescript
// In your template purchase/application logic
async function applyPremiumTemplate(templateId: string, userGoal: Goal) {
  // Get template config
  const template = await supabase
    .from('premium_template_configs')
    .select('*')
    .eq('template_id', templateId)
    .single();

  // Send to n8n master workflow
  const response = await fetch('https://your-n8n.app/webhook/premium-template', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateId: template.data.template_id,
      templateType: template.data.template_type,
      templateName: template.data.template_name,
      systemInstructions: template.data.system_instructions,
      userGoal: {
        id: userGoal.id,
        title: userGoal.title,
        description: userGoal.description,
        targetDate: userGoal.target_date
      },
      userId: userGoal.user_id,
      agentPrompt: template.data.n8n_agent_prompt
    })
  });

  return response.json();
}
```

**Benefits:**
- ✅ One workflow handles all templates
- ✅ Add new templates without touching n8n
- ✅ Centralized monitoring and logging
- ✅ Easy to update AI prompts via database

---

### Solution 2: Config-Driven Generic AI Agent

**Architecture:**
Create one ultra-flexible AI agent that adapts based on JSON configuration.

**Template Configuration File (`src/data/premiumTemplateConfigs.ts`):**

```typescript
export interface PremiumTemplateConfig {
  id: string;
  type: 'fitness' | 'finance' | 'career' | 'learning' | 'custom';
  name: string;
  price: number;
  aiAgent: {
    systemPrompt: string;
    userPromptTemplate: string;
    outputFormat: 'tasks' | 'milestones' | 'mixed';
    examples?: string[];
  };
  taskGeneration: {
    minTasks: number;
    maxTasks: number;
    taskTypes: string[];
    includeSubtasks: boolean;
  };
  customFields?: Record<string, any>;
}

export const premiumTemplateConfigs: PremiumTemplateConfig[] = [
  {
    id: 'fitness-12week-transformation',
    type: 'fitness',
    name: '12-Week Fitness Transformation',
    price: 9.99,
    aiAgent: {
      systemPrompt: `You are an expert fitness coach specializing in body transformations.
        Create detailed, progressive workout plans with proper periodization.
        Include rest days, deload weeks, and progressive overload principles.`,
      userPromptTemplate: `Create a 12-week fitness transformation plan for:
        Goal: {{goal.title}}
        Description: {{goal.description}}
        Target Date: {{goal.targetDate}}
        
        Structure the plan into 3 phases (Foundation, Building, Peak).
        Each week should have 4-5 workout days.
        Include nutrition guidelines and recovery protocols.`,
      outputFormat: 'mixed',
      examples: [
        'Week 1-4: Foundation Phase (3x10 reps, focus on form)',
        'Week 5-8: Building Phase (4x8 reps, increase weight 5-10%)',
        'Week 9-12: Peak Phase (5x5 reps, maximum intensity)'
      ]
    },
    taskGeneration: {
      minTasks: 36,
      maxTasks: 60,
      taskTypes: ['workout', 'meal_prep', 'recovery', 'progress_check'],
      includeSubtasks: true
    },
    customFields: {
      includeNutrition: true,
      trackBodyMetrics: true,
      workoutsPerWeek: 4
    }
  },
  {
    id: 'finance-fire-plan',
    type: 'finance',
    name: 'FIRE Financial Independence Plan',
    price: 14.99,
    aiAgent: {
      systemPrompt: `You are a certified financial planner specializing in FIRE (Financial Independence, Retire Early).
        Create detailed financial roadmaps with realistic savings rates and investment strategies.
        Include emergency fund building, debt payoff, and investment allocation.`,
      userPromptTemplate: `Create a FIRE financial plan for:
        Goal: {{goal.title}}
        Description: {{goal.description}}
        Target Date: {{goal.targetDate}}
        
        Include monthly milestones for:
        - Emergency fund (3-6 months expenses)
        - Debt elimination
        - Investment contributions (401k, IRA, taxable accounts)
        - Net worth tracking
        - Savings rate progression`,
      outputFormat: 'milestones'
    },
    taskGeneration: {
      minTasks: 12,
      maxTasks: 24,
      taskTypes: ['savings', 'investment', 'budget_review', 'net_worth_check'],
      includeSubtasks: true
    },
    customFields: {
      trackNetWorth: true,
      investmentAllocation: '80/20 stocks/bonds',
      savingsRateTarget: 0.5
    }
  }
  // Add more templates here...
];
```

**N8N Generic Workflow:**

```javascript
// In n8n Code node
const config = $input.item.json.templateConfig;
const userGoal = $input.item.json.userGoal;

// Build dynamic prompt
let prompt = config.aiAgent.userPromptTemplate
  .replace('{{goal.title}}', userGoal.title)
  .replace('{{goal.description}}', userGoal.description)
  .replace('{{goal.targetDate}}', userGoal.targetDate);

// Add examples if provided
if (config.aiAgent.examples?.length > 0) {
  prompt += '\n\nExamples:\n' + config.aiAgent.examples.join('\n');
}

return [{
  json: {
    systemPrompt: config.aiAgent.systemPrompt,
    userPrompt: prompt,
    outputFormat: config.aiAgent.outputFormat,
    taskConfig: config.taskGeneration,
    userId: $input.item.json.userId,
    goalId: userGoal.id
  }
}];
```

**Benefits:**
- ✅ Add new templates by editing TypeScript config (no n8n changes)
- ✅ Version control for all template logic
- ✅ Easy to test and iterate on prompts
- ✅ Reusable across different AI providers

---

### Solution 3: Workflow Template Generator (Advanced)

**Concept:** Programmatically generate n8n workflow JSON from template definitions.

**Implementation:**

```typescript
// tools/generateN8NWorkflow.ts
interface WorkflowTemplate {
  templateId: string;
  agentConfig: {
    systemPrompt: string;
    model: 'gpt-4' | 'claude-3-opus';
    temperature: number;
  };
}

function generateN8NWorkflow(template: WorkflowTemplate): any {
  return {
    name: `Premium Template: ${template.templateId}`,
    nodes: [
      {
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        parameters: {
          path: `premium-template/${template.templateId}`
        }
      },
      {
        name: 'AI Agent',
        type: 'n8n-nodes-base.openAi',
        parameters: {
          model: template.agentConfig.model,
          systemPrompt: template.agentConfig.systemPrompt,
          temperature: template.agentConfig.temperature
        }
      },
      {
        name: 'Send to Supabase',
        type: 'n8n-nodes-base.supabase',
        parameters: {
          operation: 'insert',
          table: 'tasks'
        }
      }
    ],
    connections: {
      'Webhook Trigger': {
        main: [[{ node: 'AI Agent', type: 'main', index: 0 }]]
      },
      'AI Agent': {
        main: [[{ node: 'Send to Supabase', type: 'main', index: 0 }]]
      }
    }
  };
}

// Generate and upload to n8n via API
async function deployWorkflow(template: WorkflowTemplate) {
  const workflow = generateN8NWorkflow(template);
  
  const response = await fetch('https://your-n8n.app/api/v1/workflows', {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': process.env.N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workflow)
  });
  
  return response.json();
}
```

**Benefits:**
- ✅ Programmatically create workflows
- ✅ Can use CI/CD to deploy workflows automatically
- ✅ Version control for workflow definitions

---

### Solution 4: Template Registry + Router Pattern

**Architecture:**

1. **Central Template Registry** (in your app):

```typescript
// src/services/templateRegistry.ts
export class PremiumTemplateRegistry {
  private templates = new Map<string, TemplateHandler>();

  register(templateId: string, handler: TemplateHandler) {
    this.templates.set(templateId, handler);
  }

  async process(templateId: string, userGoal: Goal): Promise<Task[]> {
    const handler = this.templates.get(templateId);
    if (!handler) throw new Error(`Template ${templateId} not found`);
    
    return handler.generate(userGoal);
  }
}

interface TemplateHandler {
  generate(goal: Goal): Promise<Task[]>;
}
```

2. **N8N Router Workflow** (one workflow that routes to sub-workflows):

```
Webhook → Parse Request → Query Template Config → 
  → If fitness: Execute fitness sub-workflow
  → If finance: Execute finance sub-workflow
  → If custom: Execute generic AI workflow with config
```

3. **Sub-workflows as reusable modules:**
   - Create sub-workflows for common patterns (fitness, finance, career)
   - Main workflow calls sub-workflows via "Execute Workflow" node
   - Sub-workflows can be reused and composed

**Benefits:**
- ✅ Modular and maintainable
- ✅ Reuse common patterns
- ✅ Easy to debug individual components

---

## 📋 Recommended Approach: Hybrid Solution

**Combine Solution 1 + 2** for maximum flexibility:

1. **Database-driven template configs** (Solution 1)
   - Store all template metadata in Supabase
   - Easy to update without code deploys

2. **TypeScript config for complex logic** (Solution 2)
   - Use for templates with complex branching logic
   - Better IDE support and type safety

3. **One master n8n workflow** (Solution 1)
   - Receives template config from database
   - Routes to appropriate AI agent
   - Falls back to generic agent if no specific logic needed

### Implementation Steps:

1. **Week 1: Database Schema**
   ```sql
   CREATE TABLE premium_template_configs (
     id UUID PRIMARY KEY,
     template_id TEXT UNIQUE,
     template_type TEXT,
     ai_system_prompt TEXT,
     ai_user_prompt_template TEXT,
     task_generation_rules JSONB,
     custom_config JSONB
   );
   ```

2. **Week 2: Master N8N Workflow**
   - Create webhook endpoint
   - Add template config fetching
   - Implement switch/router logic
   - Add 3-4 specialized agents (fitness, finance, career)
   - Add one generic fallback agent

3. **Week 3: Integration**
   - Update `applyPremiumTemplate` in your app
   - Send requests to master workflow
   - Handle responses (tasks, milestones, etc.)
   - Add error handling and retries

4. **Week 4: Testing & Optimization**
   - Test each template type
   - Monitor AI costs per template
   - Optimize prompts for quality/cost balance
   - Add caching for similar requests

### Cost Optimization:
- Cache common template structures
- Use GPT-4 only for initial generation, GPT-3.5 for refinements
- Implement rate limiting per user
- Pre-generate templates for popular goals (cache results)

---

## 🔑 API Key Management & AI Cost Control

### The Problem
AI API calls (OpenAI, Anthropic) are expensive. If you use your API key for all users:
- **Free tier users** drain your budget
- **Abuse risk**: Users could spam AI generation
- **Unpredictable costs**: Hard to forecast expenses

### Solution: Tiered API Key Strategy

#### **Free Tier: BYOK (Bring Your Own Key)**
Users must provide their own OpenAI/Anthropic API key.

**Benefits:**
- ✅ Zero AI costs for you
- ✅ Users understand AI isn't free
- ✅ Prevents abuse (they pay for their usage)
- ✅ Educational (users learn about AI costs)

**Implementation:**

1. **Database Schema:**
```sql
CREATE TABLE user_ai_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  encrypted_openai_key TEXT,
  encrypted_anthropic_key TEXT,
  key_name TEXT, -- Optional: user-friendly name
  is_valid BOOLEAN DEFAULT true,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track usage even for user keys
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key_source TEXT CHECK (key_source IN ('user', 'platform')),
  model TEXT, -- 'gpt-4', 'gpt-3.5-turbo', 'claude-3-opus'
  tokens_used INTEGER,
  cost_estimate DECIMAL(10,4),
  request_type TEXT, -- 'task_generation', 'chat', 'template_application'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_user_date ON ai_usage_logs(user_id, created_at);
```

2. **Settings Page for API Key:**

```typescript
// src/components/settings/AIKeySettings.tsx
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Key, Shield } from 'lucide-react';

export function AIKeySettings() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'valid' | 'invalid' | null>(null);

  const handleValidateAndSave = async () => {
    setIsValidating(true);
    
    // Validate key by making a test API call
    const isValid = await validateOpenAIKey(apiKey);
    
    if (isValid) {
      // Store encrypted in Supabase
      const { error } = await supabase
        .from('user_ai_keys')
        .upsert({
          encrypted_openai_key: apiKey, // Encrypt on server-side
          is_valid: true,
          last_validated_at: new Date().toISOString()
        });
      
      if (!error) {
        setKeyStatus('valid');
        toast.success('API key saved successfully!');
      }
    } else {
      setKeyStatus('invalid');
      toast.error('Invalid API key. Please check and try again.');
    }
    
    setIsValidating(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Key className="w-5 h-5" />
        <h3 className="text-lg font-semibold">AI API Key</h3>
      </div>

      <Alert>
        <Shield className="w-4 h-4" />
        <AlertDescription>
          Free tier requires your own OpenAI API key. Your key is encrypted and only used for your AI requests.
          Upgrade to Pro to use our platform key with unlimited AI generation.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="api-key">OpenAI API Key</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button 
            onClick={handleValidateAndSave}
            disabled={isValidating || !apiKey}
          >
            {isValidating ? 'Validating...' : 'Save'}
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" className="underline">OpenAI Dashboard</a>
        </p>
      </div>

      {keyStatus === 'valid' && (
        <Alert className="border-green-500">
          <AlertDescription>✅ API key validated and saved</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

async function validateOpenAIKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

3. **N8N Workflow: Dynamic API Key Selection:**

```javascript
// In n8n "Prepare AI Request" Code Node
const userId = $input.item.json.userId;
const userSubscription = $input.item.json.userSubscription; // From previous node

let apiKey;
let keySource;

if (userSubscription?.tier === 'pro' || userSubscription?.tier === 'team') {
  // Paid users: use platform key
  apiKey = $env.PLATFORM_OPENAI_KEY;
  keySource = 'platform';
} else {
  // Free users: use their own key
  const userKey = await $supabase
    .from('user_ai_keys')
    .select('encrypted_openai_key')
    .eq('user_id', userId)
    .single();
  
  if (!userKey.data?.encrypted_openai_key) {
    throw new Error('NO_API_KEY: User must provide API key in settings');
  }
  
  apiKey = decrypt(userKey.data.encrypted_openai_key);
  keySource = 'user';
}

return [{
  json: {
    ...($input.item.json),
    apiKey,
    keySource,
    model: userSubscription?.tier === 'pro' ? 'gpt-4' : 'gpt-3.5-turbo'
  }
}];
```

4. **Supabase Edge Function (Alternative to N8N):**

```typescript
// supabase/functions/ai-generate/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { userId, prompt, requestType } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Get user subscription
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();
  
  let apiKey: string;
  let keySource: 'user' | 'platform';
  
  if (subscription?.tier === 'pro' || subscription?.tier === 'team') {
    // Pro users: use platform key
    apiKey = Deno.env.get('OPENAI_API_KEY')!;
    keySource = 'platform';
  } else {
    // Free users: use their key
    const { data: userKey } = await supabase
      .from('user_ai_keys')
      .select('encrypted_openai_key')
      .eq('user_id', userId)
      .single();
    
    if (!userKey?.encrypted_openai_key) {
      return new Response(
        JSON.stringify({ 
          error: 'NO_API_KEY',
          message: 'Please add your OpenAI API key in settings to use AI features'
        }),
        { status: 400 }
      );
    }
    
    apiKey = decrypt(userKey.encrypted_openai_key);
    keySource = 'user';
  }
  
  // Make OpenAI request
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: subscription?.tier === 'pro' ? 'gpt-4' : 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  const data = await openaiResponse.json();
  
  // Log usage
  await supabase.from('ai_usage_logs').insert({
    user_id: userId,
    key_source: keySource,
    model: data.model,
    tokens_used: data.usage?.total_tokens,
    cost_estimate: calculateCost(data.model, data.usage?.total_tokens),
    request_type: requestType
  });
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

#### **Pro Tier: Platform API Key (Included)**

**Benefits:**
- ✅ Seamless UX (no setup required)
- ✅ Use better models (GPT-4 vs GPT-3.5)
- ✅ Marketing: "Unlimited AI generation included"
- ✅ You control costs with usage limits

**Cost Management:**

1. **Soft Limits per User:**
```typescript
// Check before AI request
const monthlyLimit = {
  pro: 1000, // 1000 AI requests/month (~$20 cost)
  team: 5000 // 5000 AI requests/month (~$100 cost)
};

const usage = await supabase
  .from('ai_usage_logs')
  .select('count')
  .eq('user_id', userId)
  .eq('key_source', 'platform')
  .gte('created_at', startOfMonth())
  .single();

if (usage.count >= monthlyLimit[subscription.tier]) {
  return { 
    error: 'LIMIT_REACHED',
    message: 'Monthly AI limit reached. Resets on 1st of next month.'
  };
}
```

2. **Cost Monitoring Dashboard (Admin):**
```typescript
// Track platform AI costs
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as requests,
  SUM(tokens_used) as total_tokens,
  SUM(cost_estimate) as total_cost,
  AVG(cost_estimate) as avg_cost_per_request
FROM ai_usage_logs
WHERE key_source = 'platform'
GROUP BY date
ORDER BY date DESC;
```

3. **Alert when costs spike:**
```typescript
// Daily cron job in Supabase
if (dailyAICost > budget * 1.5) {
  sendAlert('AI costs exceeded budget by 50%!');
  // Auto-downgrade to GPT-3.5 or pause AI features
}
```

---

#### **Hybrid Model: AI Credits (Recommended)** ⭐

**Best of both worlds:**
- Free tier: 10 AI credits/month (BYOK for more)
- Pro tier: 500 AI credits/month (included)
- Pay-as-you-go: Buy credit packs ($4.99 for 100 credits)

**Implementation:**

```sql
CREATE TABLE ai_credit_balance (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INTEGER DEFAULT 0,
  credits_included INTEGER DEFAULT 0, -- Monthly allowance from subscription
  credits_purchased INTEGER DEFAULT 0, -- One-time purchased credits
  next_reset_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reset monthly credits (run via cron)
CREATE OR REPLACE FUNCTION reset_monthly_ai_credits()
RETURNS void AS $$
BEGIN
  UPDATE ai_credit_balance
  SET 
    credits_remaining = credits_included,
    next_reset_date = DATE_TRUNC('month', NOW() + INTERVAL '1 month')
  WHERE next_reset_date <= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
```

**Credit Usage:**
```typescript
// Before AI request
const creditCost = {
  'gpt-3.5-turbo': 1,
  'gpt-4': 5,
  'claude-3-opus': 7
};

const { data: balance } = await supabase
  .from('ai_credit_balance')
  .select('credits_remaining')
  .eq('user_id', userId)
  .single();

const cost = creditCost[model];

if (balance.credits_remaining < cost) {
  // Fallback to user's own API key if available
  const { data: userKey } = await supabase
    .from('user_ai_keys')
    .select('encrypted_openai_key')
    .eq('user_id', userId)
    .single();
  
  if (userKey?.encrypted_openai_key) {
    // Use user's key
    apiKey = decrypt(userKey.encrypted_openai_key);
  } else {
    return { 
      error: 'INSUFFICIENT_CREDITS',
      message: 'Add your API key or purchase credits to continue'
    };
  }
} else {
  // Deduct credits
  await supabase.rpc('deduct_ai_credits', { 
    user_id: userId, 
    amount: cost 
  });
}
```

---

### Security Best Practices

1. **Encrypt User API Keys:**
```typescript
// Use Supabase Vault or encrypt before storing
import { createCipheriv, createDecipheriv } from 'crypto';

function encrypt(text: string): string {
  const cipher = createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(encrypted: string): string {
  const decipher = createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}
```

2. **Never Log API Keys:**
```typescript
// In ai_usage_logs table, never store the actual key
await supabase.from('ai_usage_logs').insert({
  user_id: userId,
  key_source: keySource, // 'user' or 'platform', not the actual key
  // ... other fields
});
```

3. **Validate User Keys Periodically:**
```typescript
// Cron job to check if stored keys are still valid
async function validateAllUserKeys() {
  const { data: keys } = await supabase
    .from('user_ai_keys')
    .select('*')
    .eq('is_valid', true);
  
  for (const key of keys) {
    const isValid = await validateOpenAIKey(decrypt(key.encrypted_openai_key));
    if (!isValid) {
      await supabase
        .from('user_ai_keys')
        .update({ is_valid: false })
        .eq('id', key.id);
      
      // Notify user their key is invalid
      await sendNotification(key.user_id, 'Your OpenAI API key is no longer valid');
    }
  }
}
```

4. **Rate Limiting:**
```typescript
// Prevent abuse even with user's own key
const rateLimits = {
  free: { requests: 50, window: '1 hour' },
  pro: { requests: 500, window: '1 hour' }
};

// Use Redis or Supabase to track requests
const recentRequests = await countRecentRequests(userId, '1 hour');
if (recentRequests >= rateLimits[tier].requests) {
  return { error: 'RATE_LIMIT_EXCEEDED' };
}
```

---

### N8N Implementation: Complete Flow

```javascript
// Master N8N Workflow with API Key Management

// Node 1: Webhook Receive
const { userId, goalId, templateId } = $input.item.json;

// Node 2: Fetch User Subscription & Keys
const userData = await Promise.all([
  $supabase.from('user_subscriptions').select('*').eq('user_id', userId).single(),
  $supabase.from('user_ai_keys').select('*').eq('user_id', userId).single(),
  $supabase.from('ai_credit_balance').select('*').eq('user_id', userId).single()
]);

const [subscription, userKey, credits] = userData;

// Node 3: Determine API Key & Model
let apiKey, keySource, model;

if (subscription.tier === 'pro' || subscription.tier === 'team') {
  // Check credits first
  if (credits.credits_remaining > 0) {
    apiKey = $env.PLATFORM_OPENAI_KEY;
    keySource = 'platform';
    model = 'gpt-4';
    // Will deduct credits after successful request
  } else if (userKey.encrypted_openai_key) {
    // Fallback to user key
    apiKey = decrypt(userKey.encrypted_openai_key);
    keySource = 'user';
    model = 'gpt-3.5-turbo';
  } else {
    throw new Error('NO_CREDITS_OR_KEY');
  }
} else {
  // Free tier: must have their own key
  if (!userKey.encrypted_openai_key) {
    throw new Error('API_KEY_REQUIRED');
  }
  apiKey = decrypt(userKey.encrypted_openai_key);
  keySource = 'user';
  model = 'gpt-3.5-turbo';
}

// Node 4: Rate Limit Check
const recentRequests = await $supabase
  .from('ai_usage_logs')
  .select('count')
  .eq('user_id', userId)
  .gte('created_at', oneHourAgo());

if (recentRequests.count > getRateLimit(subscription.tier)) {
  throw new Error('RATE_LIMIT_EXCEEDED');
}

// Node 5: Make OpenAI Request
const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model,
    messages: [{ role: 'user', content: prompt }]
  })
});

const result = await openaiResponse.json();

// Node 6: Log Usage & Deduct Credits
await Promise.all([
  $supabase.from('ai_usage_logs').insert({
    user_id: userId,
    key_source: keySource,
    model,
    tokens_used: result.usage.total_tokens,
    cost_estimate: calculateCost(model, result.usage.total_tokens),
    request_type: 'template_application'
  }),
  
  // Deduct credits if using platform key
  keySource === 'platform' 
    ? $supabase.rpc('deduct_ai_credits', { user_id: userId, amount: creditCost[model] })
    : null
]);

// Node 7: Return Result
return { json: result };
```

---

## 📊 Cost Analysis per Tier

### Free Tier (BYOK)
- **Your cost**: $0
- **User cost**: ~$0.002 per request (GPT-3.5)
- **Limit**: User-controlled (their API budget)

### Pro Tier ($9.99/mo with 500 credits)
- **Your cost per user/month**: ~$10-15 (500 requests × $0.002-0.03)
- **Margin**: Break-even to slight loss
- **Strategy**: Make up margin with:
  - Annual subscriptions (upfront cash)
  - Credit upsells
  - Premium templates
  - Fewer users will max out credits

### Team Tier ($19.99/mo with 5000 credits)
- **Your cost per team/month**: ~$50-100
- **Margin**: Negative if fully utilized
- **Strategy**: 
  - Most teams won't use full allowance
  - Charge overages ($0.99 per 10 credits)
  - Cross-subsidize with unused credits from other users

### Reality Check
- Only 20-30% of users will use >50% of their credits
- Average usage: ~100-200 credits/month
- Your actual cost per Pro user: ~$2-5/mo
- Healthy margin: $5-8 per user

---

## 🎯 Recommended Strategy

**Implement the Hybrid AI Credits Model:**

1. **Free tier**: 
   - 10 credits/month (platform key)
   - BYOK for unlimited usage
   - Forces upgrade for heavy users

2. **Pro tier ($9.99/mo)**:
   - 500 credits/month (platform key, GPT-4 access)
   - Can add BYOK for extra usage
   - Buy credit packs if needed

3. **Team tier ($19.99/mo)**:
   - 5000 credits/month shared
   - Priority support
   - Admin dashboard

4. **Credit packs**: 
   - $4.99 for 100 credits
   - Never expire
   - Good for power users

This model:
- ✅ Lets you test free → paid conversion
- ✅ Gives free users a taste without draining budget
- ✅ Pro users get real value (don't manage API keys)
- ✅ You can adjust credit pricing based on costs
- ✅ Creates upsell opportunities

---

## 🎯 Updated Phase 3 Roadmap
1. **AI credit packs**
   - Purchase additional credits
   - Credit balance display
   - Usage analytics for users

2. **One-time purchases**
   - PDF export generation
   - Advanced analytics dashboard
   - Calendar integration setup

### Phase 5: Growth & Optimization (Ongoing)
1. **Analytics dashboard**
   - Conversion rate tracking
   - Churn analysis
   - Revenue metrics (MRR, ARR, ARPU)

2. **Referral program**
   - Unique referral links
   - Reward tracking
   - Automated credit/month distribution

3. **A/B testing**
   - Pricing variations
   - Feature bundling experiments
   - CTA optimization

---

## 📊 Realistic Revenue Projections

### Adjusted Assumptions
- **Conversion rate**: 2-3% (not 5-10%) - typical for B2C SaaS
- **Monthly churn**: 5-7% - productivity apps have moderate churn
- **Average plan**: $9.99 Pro (assume 90% Pro, 10% Team)
- **Template sales**: 15% of users buy 1-2 templates/year
- **AI credit upsells**: 10% of Pro users buy extra credits

### Scenario 1: 1,000 Active Users
- **Pro subscriptions**: 1,000 × 2.5% = 25 users
- **Monthly subscription revenue**: 25 × $9.99 = $250/mo
- **Template sales**: 1,000 × 15% × $5 avg / 12 months = $62/mo
- **Total MRR**: ~$312/mo
- **Annual Revenue**: ~$3,750/year

### Scenario 2: 10,000 Active Users
- **Pro subscriptions**: 10,000 × 2.5% = 250 users
- **Team subscriptions**: Assume 5 teams × $19.99 = $100/mo
- **Monthly subscription revenue**: (250 × $9.99) + $100 = $2,598/mo
- **Template sales**: 10,000 × 15% × $5 avg / 12 months = $625/mo
- **AI credit packs**: 250 × 10% × $4.99 = $62/mo
- **Total MRR**: ~$3,285/mo
- **Annual Revenue**: ~$39,420/year

### Scenario 3: 50,000 Active Users (Scale)
- **Pro subscriptions**: 50,000 × 3% = 1,500 users
- **Team subscriptions**: 50 teams × $19.99 = $1,000/mo
- **Monthly subscription revenue**: (1,500 × $9.99) + $1,000 = $15,985/mo
- **Template sales**: 50,000 × 15% × $5 avg / 12 months = $3,125/mo
- **AI credit packs**: 1,500 × 10% × $4.99 = $749/mo
- **Enterprise deals**: 2-3 × $299/mo = $600/mo
- **Total MRR**: ~$20,459/mo
- **Annual Revenue**: ~$245,500/year

### Break-Even Analysis
**Assumptions:**
- Development time: 200 hours @ $50/hr = $10,000 (sunk cost)
- Monthly costs:
  - Hosting (Supabase Pro): $25/mo
  - AI API (OpenAI): ~$50-200/mo (scales with usage)
  - Stripe fees: 2.9% + $0.30 per transaction
  - Domain/SSL: ~$2/mo

**Break-even point**: ~30-50 paying users (~$300-500 MRR) to cover monthly costs

---

## 🎯 Key Success Metrics to Track

### Acquisition Metrics
- **New user signups** (daily/weekly/monthly)
- **Activation rate** (% who create first goal)
- **Virality coefficient** (users referred per user)

### Conversion Metrics
- **Free → Pro conversion rate**
- **Time to convert** (days from signup to upgrade)
- **Upgrade trigger** (which feature/limit causes upgrade)
- **Template purchase rate**

### Retention Metrics
- **Monthly churn rate** (% subscribers who cancel)
- **Day 7, 30, 90 retention rates**
- **Net Revenue Retention** (expansion revenue - churn)

### Revenue Metrics
- **MRR (Monthly Recurring Revenue)**
- **ARR (Annual Recurring Revenue)**
- **ARPU (Average Revenue Per User)**
- **LTV (Lifetime Value)** / **CAC (Customer Acquisition Cost)** ratio
- **Gross margin** (revenue - COGS)

### Product Metrics
- **AI credits usage** (avg per user, per feature)
- **Goals per user** (free vs paid)
- **Feature usage** (which Pro features are most valuable)
- **Template popularity** (best sellers)

---

## 🔧 Technical Implementation Checklist

### Stripe Integration
- [ ] Install `@stripe/stripe-js` SDK
- [ ] Create Stripe products and prices
- [ ] Implement checkout session creation
- [ ] Set up webhook endpoints for subscription events
- [ ] Create customer portal for subscription management
- [ ] Handle payment failures and retry logic

### Database Changes
- [ ] Create `user_subscriptions` table
- [ ] Create `ai_credit_usage` table
- [ ] Create `template_purchases` table
- [ ] Add RLS policies for subscription data
- [ ] Create indexes for performance

### Feature Gates
- [ ] `useSubscription()` hook to check user tier
- [ ] `requirePro()` middleware for protected features
- [ ] Goal limit enforcement
- [ ] AI credit checking before operations
- [ ] Template access control

### UI Components
- [ ] Pricing page with tier comparison
- [ ] Upgrade prompts/modals throughout app
- [ ] Subscription status widget
- [ ] AI credit balance display
- [ ] Template marketplace
- [ ] Billing settings page

### Analytics
- [ ] Track conversion events (Stripe → Supabase)
- [ ] Usage analytics (goals created, tasks generated, AI usage)
- [ ] Revenue dashboard for admin
- [ ] Cohort analysis

---

## 💡 Additional Monetization Ideas

### 1. "Accountability Partner" Feature (Premium)
- Match users with similar goals for mutual accountability
- Paid feature: $4.99/mo or included in Team tier
- Creates network effects and increases stickiness

### 2. "Expert Reviews" Service
- Users can pay for a coach/expert to review their goal plan
- Platform takes 20-30% commission
- Marketplace model scales without your direct involvement

### 3. "Goal Streaks & Gamification" Premium
- Advanced gamification features (badges, leaderboards, streaks)
- Social sharing of achievements
- $2.99/mo add-on or included in Pro

### 4. "Focus Mode" with Deep Work Tools
- Pomodoro timer integration
- Distraction blocking
- Focus session analytics
- $3.99/mo add-on

### 5. White-Label Licensing
- Sell the entire platform to coaches/consultants as their branded app
- One-time setup fee: $2,000-5,000
- Monthly hosting/maintenance: $99-299/mo
- High margin, B2B sales

---

## 🚨 Common Pitfalls to Avoid

1. **Don't over-complicate initial pricing**
   - Start with 2 tiers (Free, Pro)
   - Add Team/Enterprise later

2. **Don't make free tier too generous**
   - 3 goals is good, 10 goals removes incentive to upgrade
   - Limit AI to 5-10 requests/month on free

3. **Don't undervalue your product**
   - $9.99 is reasonable, don't go lower
   - Premium features should feel premium

4. **Don't ignore payment failures**
   - Set up dunning (retry logic for failed payments)
   - Grace period before canceling
   - Email reminders

5. **Don't forget about taxes**
   - Stripe Tax can handle this automatically
   - VAT, sales tax compliance varies by region

6. **Don't launch without analytics**
   - You can't optimize what you don't measure
   - Track everything from day 1

---

## 🎬 Conclusion

This is a **solid, executable monetization plan** with clear priorities and realistic projections. The freemium model with AI-powered features is a proven formula, and your existing infrastructure (Supabase, PWA, real-time collaboration) supports it well.

### Immediate Next Steps:
1. ✅ Set up Stripe account
2. ✅ Implement subscription database schema
3. ✅ Build pricing page
4. ✅ Add feature gates for Pro features
5. ✅ Launch with soft paywall (3 goal limit)

### 90-Day Target:
- Launch paid tiers within 30 days
- Get first 10 paying customers
- Create 5 premium templates
- Set up analytics dashboard

### 12-Month Vision:
- 1,000+ users, 3% conversion = ~30 paying users
- $300-500 MRR
- Premium template marketplace live
- Referral program generating 10% of new signups

**Revenue projection at 12 months**: $5,000-8,000 ARR is realistic and achievable. From there, focus on growth (10K users) to reach $30K-40K ARR.

---

*Generated: January 16, 2026*
