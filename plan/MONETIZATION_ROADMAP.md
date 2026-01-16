# DailyGoalMap Monetization Implementation Roadmap

## Executive Summary

This is a comprehensive 10-week implementation plan to transform DailyGoalMap from a free service into a profitable SaaS product using a freemium subscription model with Stripe integration.

---

## Phase 1: Foundation Setup (Week 1-2)

### Step 1.1: Fix Existing Build Errors
**Priority: Critical - Must do first**

**Files to modify:**
- `src/types/goal.ts` - Make `members` property optional

**Changes:**
```typescript
// In src/types/goal.ts, change line 62:
members?: GoalMember[]  // Make optional with ?
```

---

### Step 1.2: Enable Stripe Integration
**Action:** Use Lovable's built-in Stripe tool to connect your Stripe account

**What this provides:**
- Automatic product/price creation
- Payment processing
- Subscription management
- Webhook handling

---

### Step 1.3: Create Subscription Database Schema
**New Supabase tables to create:**

```sql
-- 1. User Subscriptions Table
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'team')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- 2. AI Usage Tracking Table
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  usage_type TEXT NOT NULL, -- 'task_generation', 'chat', 'suggestions'
  credits_used INTEGER DEFAULT 1,
  goal_id UUID REFERENCES goals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own AI usage"
  ON ai_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Monthly Usage Summary
CREATE TABLE monthly_usage_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  month_year TEXT NOT NULL, -- '2026-01'
  ai_credits_used INTEGER DEFAULT 0,
  goals_created INTEGER DEFAULT 0,
  tasks_generated INTEGER DEFAULT 0,
  chat_messages_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE monthly_usage_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own usage summary"
  ON monthly_usage_summary FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own usage summary"
  ON monthly_usage_summary FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage summary"
  ON monthly_usage_summary FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Credit Purchases Table
CREATE TABLE credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  stripe_payment_id TEXT,
  credits_purchased INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'usd',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own credit purchases"
  ON credit_purchases FOR SELECT
  USING (auth.uid() = user_id);
```

---

### Step 1.4: Create User Tier System
**New file:** `src/services/subscriptionService.ts`

**Tier definitions:**

| Feature | Free | Pro ($9/mo) | Team ($19/mo) |
|---------|------|-------------|---------------|
| Active Goals | 3 | Unlimited | Unlimited |
| AI Task Generation | 10/month | 100/month | 500/month |
| AI Chat Messages | 20/month | Unlimited | Unlimited |
| Goal Templates | Basic (5) | All (20+) | All + Custom |
| Goal Sharing | 2 members | 5 members | Unlimited |
| Priority Support | No | Email | Email + Chat |
| Analytics | Basic | Advanced | Advanced |

**Implementation:**
```typescript
// src/services/subscriptionService.ts
export type PlanType = 'free' | 'pro' | 'team';

export interface PlanLimits {
  maxGoals: number;
  aiCreditsPerMonth: number;
  chatMessagesPerMonth: number;
  maxMembersPerGoal: number;
  hasAdvancedAnalytics: boolean;
  hasPrioritySupport: boolean;
  availableTemplates: 'basic' | 'all' | 'all_custom';
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxGoals: 3,
    aiCreditsPerMonth: 10,
    chatMessagesPerMonth: 20,
    maxMembersPerGoal: 2,
    hasAdvancedAnalytics: false,
    hasPrioritySupport: false,
    availableTemplates: 'basic'
  },
  pro: {
    maxGoals: Infinity,
    aiCreditsPerMonth: 100,
    chatMessagesPerMonth: Infinity,
    maxMembersPerGoal: 5,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: true,
    availableTemplates: 'all'
  },
  team: {
    maxGoals: Infinity,
    aiCreditsPerMonth: 500,
    chatMessagesPerMonth: Infinity,
    maxMembersPerGoal: Infinity,
    hasAdvancedAnalytics: true,
    hasPrioritySupport: true,
    availableTemplates: 'all_custom'
  }
};

export const PLAN_PRICES = {
  pro: {
    monthly: 900, // $9.00 in cents
    yearly: 8640  // $86.40 in cents (20% off)
  },
  team: {
    monthly: 1900, // $19.00 in cents
    yearly: 18240  // $182.40 in cents (20% off)
  }
};
```

---

## Phase 2: Feature Gating (Week 3-4)

### Step 2.1: Add Goal Limits for Free Users
**Files to modify:**
- `src/hooks/useGoals.ts` - Check goal count before creation
- `src/pages/Dashboard.tsx` - Show upgrade prompt when limit reached
- `src/components/dashboard/GoalList.tsx` - Display limit indicator

**New hook:** `src/hooks/useSubscription.ts`
```typescript
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PLAN_LIMITS, PlanType } from '@/services/subscriptionService';

export interface UserSubscription {
  id: string;
  plan_type: PlanType;
  status: string;
  current_period_end: string | null;
}

export interface UsageSummary {
  ai_credits_used: number;
  goals_created: number;
  tasks_generated: number;
  chat_messages_sent: number;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      // Fetch subscription
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subData) {
        setSubscription(subData);
      } else {
        // Create default free subscription
        setSubscription({
          id: '',
          plan_type: 'free',
          status: 'active',
          current_period_end: null
        });
      }

      // Fetch current month usage
      const monthYear = new Date().toISOString().slice(0, 7);
      const { data: usageData } = await supabase
        .from('monthly_usage_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('month_year', monthYear)
        .single();

      setUsage(usageData || {
        ai_credits_used: 0,
        goals_created: 0,
        tasks_generated: 0,
        chat_messages_sent: 0
      });

      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  const planType = subscription?.plan_type || 'free';
  const limits = PLAN_LIMITS[planType];

  const canCreateGoal = () => {
    if (!usage) return true;
    return usage.goals_created < limits.maxGoals;
  };

  const canUseAI = () => {
    if (!usage) return true;
    return usage.ai_credits_used < limits.aiCreditsPerMonth;
  };

  const canSendChatMessage = () => {
    if (!usage) return true;
    if (limits.chatMessagesPerMonth === Infinity) return true;
    return usage.chat_messages_sent < limits.chatMessagesPerMonth;
  };

  const getRemainingCredits = () => {
    if (!usage) return limits.aiCreditsPerMonth;
    return Math.max(0, limits.aiCreditsPerMonth - usage.ai_credits_used);
  };

  const getRemainingGoals = () => {
    if (!usage) return limits.maxGoals;
    if (limits.maxGoals === Infinity) return Infinity;
    return Math.max(0, limits.maxGoals - usage.goals_created);
  };

  return {
    subscription,
    usage,
    limits,
    loading,
    planType,
    canCreateGoal,
    canUseAI,
    canSendChatMessage,
    getRemainingCredits,
    getRemainingGoals,
    isPro: planType === 'pro' || planType === 'team',
    isTeam: planType === 'team'
  };
};
```

---

### Step 2.2: Gate AI Features
**Files to modify:**
- `src/components/goal/GoalAIChat.tsx` - Add credit check before sending messages
- `src/components/dashboard/AutoTaskGenerator.tsx` - Add credit check before generation
- `supabase/functions/generate-tasks/index.ts` - Verify credits server-side

**UI Changes:**
- Show remaining credits in chat header
- Display "Upgrade to Pro" button when credits depleted
- Add progress bar showing monthly usage

---

### Step 2.3: Create Upgrade Prompts
**New component:** `src/components/subscription/UpgradePrompt.tsx`

```typescript
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Sparkles } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  feature: 'goals' | 'ai' | 'templates' | 'members';
}

const FEATURE_MESSAGES = {
  goals: {
    title: 'Goal Limit Reached',
    description: 'You\'ve reached your limit of 3 active goals on the free plan.',
    benefit: 'Upgrade to Pro for unlimited goals'
  },
  ai: {
    title: 'AI Credits Exhausted',
    description: 'You\'ve used all your AI credits for this month.',
    benefit: 'Upgrade to Pro for 100 AI credits/month'
  },
  templates: {
    title: 'Premium Template',
    description: 'This template is only available on Pro and Team plans.',
    benefit: 'Upgrade to access 20+ premium templates'
  },
  members: {
    title: 'Member Limit Reached',
    description: 'Free plan allows up to 2 members per goal.',
    benefit: 'Upgrade to Pro for up to 5 members'
  }
};

export const UpgradePrompt = ({ open, onClose, feature }: UpgradePromptProps) => {
  const navigate = useNavigate();
  const message = FEATURE_MESSAGES[feature];

  const handleUpgrade = () => {
    navigate({ to: '/pricing' });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {message.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-muted-foreground">{message.description}</p>
          
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Check className="h-4 w-4" />
              {message.benefit}
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
            <Button onClick={handleUpgrade} className="flex-1">
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

**Trigger points:**
1. When user tries to create 4th goal (free limit)
2. When AI credits are exhausted
3. When trying to access premium templates
4. When adding more than 2 members to shared goal

---

### Step 2.4: Build Pricing Page
**New file:** `src/pages/Pricing.tsx`

**Content:**
- Three-tier comparison table
- Monthly/Annual toggle (20% discount for annual)
- Feature highlights with icons
- FAQ section
- Testimonials
- CTA buttons to checkout

---

## Phase 3: Subscription Flow (Week 5-6)

### Step 3.1: Checkout Integration
**New files:**
- `src/pages/Checkout.tsx` - Stripe checkout page
- `src/components/subscription/PlanSelector.tsx`
- `supabase/functions/create-checkout-session/index.ts`

**Edge Function:**
```typescript
// supabase/functions/create-checkout-session/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.0.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  const { priceId, userId, successUrl, cancelUrl } = await req.json();

  // Create or get customer
  let customer;
  // ... customer lookup/creation logic

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId }
  });

  return new Response(JSON.stringify({ sessionId: session.id }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Flow:**
1. User clicks "Upgrade" on pricing page
2. Redirect to Stripe Checkout
3. After payment, redirect to success page
4. Webhook updates database
5. User sees new plan immediately

---

### Step 3.2: Webhook Handlers
**New edge function:** `supabase/functions/stripe-webhook/index.ts`

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@13.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!;
  const body = await req.text();
  
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  );

  switch (event.type) {
    case 'checkout.session.completed':
      // Create subscription record
      break;
    case 'customer.subscription.updated':
      // Update plan status
      break;
    case 'customer.subscription.deleted':
      // Downgrade to free
      break;
    case 'invoice.payment_failed':
      // Mark as past_due
      break;
    case 'invoice.paid':
      // Reset monthly usage
      break;
  }

  return new Response(JSON.stringify({ received: true }));
});
```

**Handle events:**
- `checkout.session.completed` - Create subscription record
- `customer.subscription.updated` - Update plan status
- `customer.subscription.deleted` - Downgrade to free
- `invoice.payment_failed` - Mark as past_due
- `invoice.paid` - Reset monthly usage

---

### Step 3.3: Customer Portal
**New component:** `src/components/profile/SubscriptionManagement.tsx`

**Features:**
- Current plan display
- Usage statistics
- "Manage Subscription" button (Stripe Customer Portal)
- Billing history
- Cancel/upgrade options

---

### Step 3.4: Usage Tracking
**Implementation:**
- Track every AI API call in `ai_usage` table
- Update `monthly_usage_summary` with triggers
- Reset counters on billing period change
- Show real-time usage in profile

---

## Phase 4: Premium Features (Week 7-8)

### Step 4.1: AI Credits System
**Expansion of basic system:**

**Credit costs:**
| Action | Credits |
|--------|---------|
| Task generation | 2 |
| Chat message | 1 |
| Goal suggestions | 1 |
| Template customization | 3 |

**New feature:** Purchase additional credits
| Package | Price | Credits |
|---------|-------|---------|
| Starter | $4.99 | 50 |
| Popular | $9.99 | 150 |
| Power User | $24.99 | 500 |

---

### Step 4.2: Premium Templates
**Gate existing templates:**

**Free templates (5):**
- General Goal
- Basic Fitness
- Simple Budget
- Learning Goal
- Personal Project

**Pro templates (15+):**
- All career templates
- Advanced fitness templates
- Investment tracking
- Travel planning
- Business goals
- Creative projects

**Team templates:**
- Team OKRs
- Department goals
- Company milestones

---

### Step 4.3: Advanced Analytics
**New component:** `src/components/analytics/AdvancedAnalytics.tsx`

**Free tier:**
- Basic progress percentage
- Simple completion chart

**Pro tier:**
- Trend analysis over time
- Goal velocity metrics
- AI-powered insights
- Weekly progress reports
- Export to PDF/CSV

---

### Step 4.4: Team Features (Pro/Team plans)
**New capabilities:**
- Unlimited goal members
- Team dashboard
- Member role management
- Activity feed
- Team analytics

---

## Phase 5: Optimization (Week 9-10)

### Step 5.1: A/B Testing
**Test variations:**
- Pricing amounts ($7 vs $9 vs $12 for Pro)
- Free tier limits (3 vs 5 goals)
- Trial duration (7 vs 14 days)
- CTA button text
- Upgrade prompt timing

---

### Step 5.2: Conversion Tracking
**Analytics to implement:**
- Signup to paid conversion rate
- Feature engagement by tier
- Churn rate by plan
- Revenue per user
- Upgrade path analysis

**Tools:**
- Add Mixpanel or PostHog
- Stripe Dashboard for revenue
- Custom analytics table

---

### Step 5.3: User Onboarding
**Improvements:**
- Welcome email sequence
- In-app tour for new users
- Free trial of Pro features (7 days)
- Onboarding checklist
- Success milestones celebration

---

### Step 5.4: Launch & Marketing
**Launch checklist:**
1. Update Terms of Service (remove "100% free" language)
2. Update landing page with pricing
3. Create launch announcement
4. Email existing users about new features
5. Set up help documentation
6. Prepare customer support

---

## Files to Create Summary

| File Path | Purpose | Phase |
|-----------|---------|-------|
| `src/services/subscriptionService.ts` | Plan definitions & limits | 1 |
| `src/hooks/useSubscription.ts` | Subscription state & usage | 2 |
| `src/pages/Pricing.tsx` | Pricing page | 2 |
| `src/components/subscription/UpgradePrompt.tsx` | Upgrade modals | 2 |
| `src/components/subscription/PlanSelector.tsx` | Plan selection UI | 3 |
| `src/components/subscription/UsageIndicator.tsx` | Usage display | 3 |
| `src/components/profile/SubscriptionManagement.tsx` | Manage subscription | 3 |
| `src/components/subscription/CreditPurchase.tsx` | Buy credits | 4 |
| `src/components/analytics/AdvancedAnalytics.tsx` | Pro analytics | 4 |
| `supabase/functions/create-checkout-session/index.ts` | Stripe checkout | 3 |
| `supabase/functions/stripe-webhook/index.ts` | Handle Stripe events | 3 |
| `supabase/functions/create-portal-session/index.ts` | Customer portal | 3 |

---

## Database Tables Summary

| Table | Purpose | RLS |
|-------|---------|-----|
| `user_subscriptions` | Store subscription info | User can read/update own |
| `ai_usage` | Track every AI usage | User can read/insert own |
| `monthly_usage_summary` | Aggregated monthly usage | User can read/upsert own |
| `credit_purchases` | Track credit purchases | User can read own |

---

## Revenue Projections

### Conservative (1,000 users after 6 months)
| Tier | Users | Price | Monthly Revenue |
|------|-------|-------|-----------------|
| Free | 800 (80%) | $0 | $0 |
| Pro | 150 (15%) | $9 | $1,350 |
| Team | 50 (5%) | $19 | $950 |
| **Total** | **1,000** | | **$2,300/mo** |

**Annual Revenue: ~$27,600**

### Growth (5,000 users after 1 year)
| Tier | Users | Price | Monthly Revenue |
|------|-------|-------|-----------------|
| Free | 3,500 (70%) | $0 | $0 |
| Pro | 1,000 (20%) | $9 | $9,000 |
| Team | 500 (10%) | $19 | $9,500 |
| **Total** | **5,000** | | **$18,500/mo** |

**Annual Revenue: ~$222,000**

### Additional Revenue Streams
- Credit purchases: +$500-2,000/mo
- Annual subscriptions: +20% upfront cash
- Premium templates: +$200-500/mo

---

## Quick Start Checklist

### Week 1 Priority Tasks
- [ ] Fix build errors (make `members` optional)
- [ ] Enable Stripe integration via Lovable
- [ ] Create subscription database tables
- [ ] Create `subscriptionService.ts` with plan limits

### Week 2 Priority Tasks
- [ ] Create `useSubscription` hook
- [ ] Add goal count check before creation
- [ ] Create basic upgrade prompt component
- [ ] Create pricing page with 3 tiers

### Week 3 Priority Tasks
- [ ] Implement Stripe checkout flow
- [ ] Create webhook handler
- [ ] Add usage tracking to AI features
- [ ] Test end-to-end subscription flow

---

## Success Metrics

### Key Performance Indicators (KPIs)
1. **Conversion Rate**: Free to Paid (Target: 15-20%)
2. **Monthly Recurring Revenue (MRR)**: Track growth
3. **Churn Rate**: Monthly cancellations (Target: <5%)
4. **Average Revenue Per User (ARPU)**: Include free users
5. **Customer Lifetime Value (CLV)**: Revenue over customer lifespan

### Tracking Implementation
```sql
-- Create analytics view
CREATE VIEW subscription_analytics AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  plan_type,
  COUNT(*) as subscribers,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
  SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) as churned
FROM user_subscriptions
GROUP BY 1, 2
ORDER BY 1 DESC;
```

---

## Risk Mitigation

### Potential Risks & Solutions

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low conversion rate | Medium | High | A/B test pricing, improve value proposition |
| High churn | Medium | High | Improve onboarding, add engagement features |
| Payment failures | Low | Medium | Dunning emails, grace periods |
| Feature complaints | Medium | Medium | Clear feature comparison, trial period |
| Technical issues | Low | High | Thorough testing, monitoring |

---

## Support & Documentation

### User-Facing Documentation
- [ ] Pricing FAQ page
- [ ] Feature comparison guide
- [ ] Upgrade/downgrade instructions
- [ ] Billing & refund policy
- [ ] Credit usage guide

### Internal Documentation
- [ ] Stripe integration guide
- [ ] Webhook handling procedures
- [ ] Customer support playbook
- [ ] Refund processing guide

---

## Timeline Summary

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1-2 | Foundation | Stripe, DB schema, tier system |
| 3-4 | Feature Gating | Limits, prompts, pricing page |
| 5-6 | Subscription Flow | Checkout, webhooks, portal |
| 7-8 | Premium Features | Credits, templates, analytics |
| 9-10 | Optimization | Testing, tracking, launch |

---

## Contact & Resources

- **Stripe Documentation**: https://stripe.com/docs
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **Lovable Stripe Integration**: Built-in tool
- **Pricing Strategy Guide**: https://www.priceintelligently.com

---

*Last Updated: January 2026*
*Version: 1.0*
