
/**
 * Financial calculation utilities to help with goal planning
 */

/**
 * Calculate daily spending limit based on monthly income and savings goal
 * @param monthlyIncome Total monthly income
 * @param targetSavingPercentage Percentage of income to save (0-100)
 * @param daysInMonth Days in the month (default: 30)
 * @returns Daily spending limit
 */
export const calculateDailySpendingLimit = (
  monthlyIncome: number,
  targetSavingPercentage: number,
  daysInMonth: number = 30
): number => {
  // Calculate amount to save monthly
  const monthlySavingsTarget = (monthlyIncome * targetSavingPercentage) / 100;
  
  // Calculate remaining disposable income
  const disposableIncome = monthlyIncome - monthlySavingsTarget;
  
  // Calculate daily spending limit
  return disposableIncome / daysInMonth;
};

/**
 * Calculate time to reach a financial goal
 * @param goalAmount Total amount needed
 * @param monthlySavings Amount saved per month
 * @returns Number of months to reach goal
 */
export const calculateMonthsToGoal = (
  goalAmount: number,
  monthlySavings: number
): number => {
  if (monthlySavings <= 0) return Infinity;
  return Math.ceil(goalAmount / monthlySavings);
};

/**
 * Calculate monthly savings needed to reach a goal by a specific date
 * @param goalAmount Total amount needed
 * @param monthsToTarget Number of months until target date
 * @returns Monthly savings needed
 */
export const calculateRequiredMonthlySavings = (
  goalAmount: number,
  monthsToTarget: number
): number => {
  if (monthsToTarget <= 0) return Infinity;
  return goalAmount / monthsToTarget;
};

/**
 * Calculate compound interest for savings
 * @param principal Initial amount
 * @param interestRate Annual interest rate (percentage)
 * @param years Number of years
 * @param compoundingPerYear Number of times interest compounds per year
 * @param regularContribution Regular contribution amount (default: 0)
 * @returns Final amount after compound interest
 */
export const calculateCompoundInterest = (
  principal: number,
  interestRate: number,
  years: number,
  compoundingPerYear: number = 12,
  regularContribution: number = 0
): number => {
  const rate = interestRate / 100;
  
  // If there are no regular contributions, use the simple compound interest formula
  if (regularContribution === 0) {
    return principal * Math.pow(1 + rate / compoundingPerYear, compoundingPerYear * years);
  }
  
  // With regular contributions (assuming end of period contributions)
  let future = principal;
  
  // Calculate month by month
  for (let i = 0; i < years * compoundingPerYear; i++) {
    // Add interest for this period
    future *= (1 + rate / compoundingPerYear);
    
    // Add regular contribution
    future += regularContribution / compoundingPerYear;
  }
  
  return future;
};

/**
 * Format currency amount based on currency code
 * @param amount The amount to format
 * @param currencyCode Currency code (USD, KHR, KRW)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currencyCode: string): string => {
  let formatter: Intl.NumberFormat;
  
  switch (currencyCode) {
    case "KHR":
      formatter = new Intl.NumberFormat('km-KH', { style: 'currency', currency: 'KHR' });
      break;
    case "KRW":
      formatter = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' });
      break;
    case "USD":
    default:
      formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
      break;
  }
  
  return formatter.format(amount);
};
