
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BudgetCalculator from "./BudgetCalculator";
import SavingsProjection from "./SavingsProjection";
import { getSelectedCurrency } from "./CurrencySelector";
import { formatCurrency } from "@/utils/financialCalculations";

interface FinancialDashboardProps {
  monthlyIncome: number;
  dailySpending: number;
  currency: string;
}

const FinancialDashboard = ({ 
  monthlyIncome, 
  dailySpending, 
  currency 
}: FinancialDashboardProps) => {
  const selectedCurrency = getSelectedCurrency(currency);
  const monthlySavings = monthlyIncome * 0.2; // Default 20% savings
  const monthlySpending = dailySpending * 30;
  const monthlyRemaining = monthlyIncome - monthlySpending;
  const savingsRate = (monthlyRemaining / monthlyIncome) * 100;

  return (
    <div className="space-y-6">
      <Card className="bg-white/90 dark:bg-slate-800/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl">Financial Overview</CardTitle>
          <CardDescription>
            Summary of your financial situation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/50">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Monthly Income</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(monthlyIncome, currency)}</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/50">
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Monthly Spending</p>
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">{formatCurrency(monthlySpending, currency)}</p>
            </div>
            <div className={`p-4 rounded-lg ${monthlyRemaining >= 0 ? 'bg-green-50 dark:bg-green-900/50' : 'bg-red-50 dark:bg-red-900/50'}`}>
              <p className={`text-sm font-medium ${monthlyRemaining >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                Monthly Remaining
              </p>
              <p className={`text-2xl font-bold ${monthlyRemaining >= 0 ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'}`}>
                {formatCurrency(monthlyRemaining, currency)}
                <span className="text-sm ml-2">
                  ({savingsRate.toFixed(1)}%)
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BudgetCalculator 
          monthlyIncome={monthlyIncome} 
          currency={currency} 
          dailySpending={dailySpending} 
        />
        <SavingsProjection 
          monthlySavings={monthlySavings} 
          currency={currency} 
          years={5} 
        />
      </div>
    </div>
  );
};

export default FinancialDashboard;
