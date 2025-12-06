import type { GoalTemplate } from '@/types/goalTemplate';

export const saveEmergencyFundTemplate: GoalTemplate = {
  id: 'save-emergency-fund',
  name: '💰 Build Emergency Fund',
  description: 'Save 3-6 months of expenses for financial security',
  icon: '💰',
  color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  category: 'finance',
  sections: [
    {
      id: 'financial-info',
      title: 'Financial Situation',
      icon: '💵',
      fields: [
        { id: 'monthlyIncome', type: 'number', label: 'Monthly Income ($)', placeholder: '5000', required: true, min: 0, step: 100 },
        { id: 'monthlyExpenses', type: 'number', label: 'Monthly Expenses ($)', placeholder: '3500', required: true, min: 0, step: 100 },
        { id: 'currentSavings', type: 'number', label: 'Current Emergency Savings ($)', placeholder: '1000', required: true, min: 0, step: 100 },
        { id: 'targetMonths', type: 'number', label: 'Target Months of Expenses', placeholder: '6', required: true, min: 1, max: 12 },
      ]
    },
    {
      id: 'savings-plan',
      title: 'Savings Plan',
      icon: '📊',
      fields: [
        { id: 'savingsGoal', type: 'number', label: 'Monthly Savings Goal ($)', placeholder: '500', required: true, min: 0, step: 50 },
        { id: 'saveDay', type: 'select', label: 'When to Transfer Savings', required: true, options: [
          { label: 'Every payday', value: 'payday' },
          { label: 'Beginning of month', value: 'month_start' },
          { label: 'End of month', value: 'month_end' },
          { label: 'Split weekly', value: 'weekly' },
        ]},
        { id: 'automatedSavings', type: 'select', label: 'Automated Transfers?', required: true, options: [
          { label: 'Yes, auto-transfer', value: 'yes' },
          { label: 'No, manual savings', value: 'no' },
          { label: 'Will set up automation', value: 'setup' },
        ]},
      ]
    },
    {
      id: 'strategies',
      title: 'Savings Strategies',
      icon: '💡',
      fields: [
        { id: 'cutExpenses', type: 'list', label: 'Expenses to Reduce (Optional)', placeholder: 'e.g., Dining out, Subscriptions, Coffee', required: false, minItems: 0, maxItems: 10 },
        { id: 'incomeBoost', type: 'list', label: 'Ways to Increase Income (Optional)', placeholder: 'e.g., Freelancing, Sell unused items, Side gig', required: false, minItems: 0, maxItems: 10 },
      ]
    },
  ],
  generatePrompt: (data) => {
    const targetAmount = (data.monthlyExpenses as number) * (data.targetMonths as number);
    const needToSave = targetAmount - (data.currentSavings as number);
    const monthsToGoal = Math.ceil(needToSave / (data.savingsGoal as number));
    
    return `Create an emergency fund savings plan:
    Target: ${data.targetMonths} months of expenses = $${targetAmount} (currently have $${data.currentSavings})
    Need to save: $${needToSave}
    Monthly income: $${data.monthlyIncome}, Expenses: $${data.monthlyExpenses}
    Savings goal: $${data.savingsGoal}/month
    Timeline: Approximately ${monthsToGoal} months
    Transfer schedule: ${data.saveDay}
    Automation: ${data.automatedSavings}
    ${data.cutExpenses && (data.cutExpenses as string[]).length > 0 ? `Reducing: ${(data.cutExpenses as string[]).join(', ')}` : ''}
    ${data.incomeBoost && (data.incomeBoost as string[]).length > 0 ? `Income boost: ${(data.incomeBoost as string[]).join(', ')}` : ''}
    
    Include weekly savings milestones, budget optimization tips, progress tracking, and motivation strategies.`;
  },
  generateDescription: (data) => {
    const targetAmount = (data.monthlyExpenses as number) * (data.targetMonths as number);
    return `Emergency Fund: Save $${targetAmount} (${data.targetMonths} months expenses) @ $${data.savingsGoal}/month`;
  }
};

export const payOffDebtTemplate: GoalTemplate = {
  id: 'pay-off-debt',
  name: '💳 Pay Off Debt',
  description: 'Eliminate debt using debt snowball or avalanche method',
  icon: '💳',
  color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  category: 'finance',
  sections: [
    {
      id: 'debt-info',
      title: 'Debt Overview',
      icon: '📋',
      fields: [
        { id: 'totalDebt', type: 'number', label: 'Total Debt Amount ($)', placeholder: '15000', required: true, min: 0, step: 100 },
        { id: 'monthlyIncome', type: 'number', label: 'Monthly Income ($)', placeholder: '4000', required: true, min: 0, step: 100 },
        { id: 'currentPayments', type: 'number', label: 'Current Monthly Debt Payments ($)', placeholder: '500', required: true, min: 0, step: 50 },
      ]
    },
    {
      id: 'strategy',
      title: 'Payoff Strategy',
      icon: '🎯',
      fields: [
        { id: 'method', type: 'select', label: 'Payoff Method', required: true, options: [
          { label: 'Debt Snowball (smallest balance first)', value: 'snowball' },
          { label: 'Debt Avalanche (highest interest first)', value: 'avalanche' },
          { label: 'Hybrid approach', value: 'hybrid' },
        ]},
        { id: 'extraPayment', type: 'number', label: 'Extra Monthly Payment ($)', placeholder: '200', required: true, min: 0, step: 50 },
        { id: 'debtTypes', type: 'list', label: 'Types of Debt', placeholder: 'e.g., Credit card $5000 @ 18%, Car loan $8000 @ 5%, Student loan $2000', required: true, minItems: 1, maxItems: 10 },
      ]
    },
    {
      id: 'optimization',
      title: 'Debt Reduction Strategies',
      icon: '💡',
      fields: [
        { id: 'incomeBoost', type: 'list', label: 'Ways to Increase Income', placeholder: 'e.g., Overtime, Side hustle, Sell items', required: false, minItems: 0, maxItems: 10 },
        { id: 'expenseCuts', type: 'list', label: 'Expenses to Cut', placeholder: 'e.g., Cancel subscriptions, Reduce dining out', required: false, minItems: 0, maxItems: 10 },
      ]
    },
  ],
  generatePrompt: (data) => {
    const totalPayment = (data.currentPayments as number) + (data.extraPayment as number);
    const roughMonths = Math.ceil((data.totalDebt as number) / totalPayment);
    
    return `Create a debt payoff plan using the ${data.method} method:
    Total debt: $${data.totalDebt}
    Monthly income: $${data.monthlyIncome}
    Current payments: $${data.currentPayments}/month + $${data.extraPayment} extra = $${totalPayment} total
    Estimated timeline: ~${roughMonths} months
    Debts: ${(data.debtTypes as string[]).join(', ')}
    ${data.incomeBoost && (data.incomeBoost as string[]).length > 0 ? `Income boost strategies: ${(data.incomeBoost as string[]).join(', ')}` : ''}
    ${data.expenseCuts && (data.expenseCuts as string[]).length > 0 ? `Expense cuts: ${(data.expenseCuts as string[]).join(', ')}` : ''}
    
    Include monthly payoff schedule, snowball/avalanche calculations, milestone celebrations, and debt-free date projection.`;
  },
  generateDescription: (data) => {
    return `Pay off $${data.totalDebt} debt using ${data.method} method ($${(data.currentPayments as number) + (data.extraPayment as number)}/month)`;
  }
};

export const investmentPortfolioTemplate: GoalTemplate = {
  id: 'investment-portfolio',
  name: '📈 Start Investing',
  description: 'Build an investment portfolio and grow wealth over time',
  icon: '📈',
  color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  category: 'finance',
  sections: [
    {
      id: 'investment-goals',
      title: 'Investment Goals',
      icon: '🎯',
      fields: [
        { id: 'initialInvestment', type: 'number', label: 'Initial Investment ($)', placeholder: '1000', required: true, min: 0, step: 100 },
        { id: 'monthlyContribution', type: 'number', label: 'Monthly Contribution ($)', placeholder: '500', required: true, min: 0, step: 50 },
        { id: 'timeHorizon', type: 'select', label: 'Investment Time Horizon', required: true, options: [
          { label: 'Short-term (1-3 years)', value: 'short' },
          { label: 'Medium-term (3-10 years)', value: 'medium' },
          { label: 'Long-term (10+ years)', value: 'long' },
          { label: 'Retirement (20+ years)', value: 'retirement' },
        ]},
        { id: 'goal', type: 'select', label: 'Investment Goal', required: true, options: [
          { label: 'Build wealth', value: 'wealth' },
          { label: 'Retirement', value: 'retirement' },
          { label: 'Buy house/car', value: 'purchase' },
          { label: 'Financial independence', value: 'fire' },
        ]},
      ]
    },
    {
      id: 'risk-profile',
      title: 'Risk Profile',
      icon: '⚠️',
      fields: [
        { id: 'riskTolerance', type: 'select', label: 'Risk Tolerance', required: true, options: [
          { label: 'Conservative (low risk, stable returns)', value: 'conservative' },
          { label: 'Moderate (balanced risk/reward)', value: 'moderate' },
          { label: 'Aggressive (high risk, high potential)', value: 'aggressive' },
        ]},
        { id: 'investmentTypes', type: 'list', label: 'Interested Investment Types', placeholder: 'e.g., Index funds, ETFs, Stocks, Bonds, Real estate', required: true, minItems: 1, maxItems: 10 },
      ]
    },
    {
      id: 'learning',
      title: 'Investment Knowledge',
      icon: '📚',
      fields: [
        { id: 'experience', type: 'select', label: 'Investment Experience', required: true, options: [
          { label: 'Complete beginner', value: 'beginner' },
          { label: 'Some knowledge', value: 'basic' },
          { label: 'Experienced investor', value: 'experienced' },
        ]},
        { id: 'platform', type: 'text', label: 'Preferred Platform (Optional)', placeholder: 'e.g., Vanguard, Fidelity, Robinhood', required: false },
      ]
    },
  ],
  generatePrompt: (data) => {
    const yearlyContribution = (data.monthlyContribution as number) * 12 + (data.initialInvestment as number);
    
    return `Create an investment plan to build wealth:
    Starting with: $${data.initialInvestment}
    Monthly contributions: $${data.monthlyContribution} (${yearlyContribution} first year)
    Time horizon: ${data.timeHorizon}
    Goal: ${data.goal}
    Risk tolerance: ${data.riskTolerance}
    Interest in: ${(data.investmentTypes as string[]).join(', ')}
    Experience level: ${data.experience}
    ${data.platform ? `Platform: ${data.platform}` : ''}
    
    Include asset allocation strategy, diversification plan, rebalancing schedule, dollar-cost averaging tips, and investment education resources.`;
  },
  generateDescription: (data) => {
    return `Start investing: $${data.initialInvestment} + $${data.monthlyContribution}/month (${data.timeHorizon}, ${data.riskTolerance} risk)`;
  }
};
