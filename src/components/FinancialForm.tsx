
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CurrencySelector, { getSelectedCurrency } from "./financial/CurrencySelector";
import MoneyInputField from "./financial/MoneyInputField";
import SubmitButton from "./financial/SubmitButton";
import FinancialDashboard from "./financial/FinancialDashboard";
import { useFinancialForm } from "@/hooks/useFinancialForm";
import { useState } from "react";

interface FinancialFormProps {
  goalId: string;
  onSuccess: (financialData: any) => void;
}

const FinancialForm = ({ goalId, onSuccess }: FinancialFormProps) => {
  const {
    monthlyIncome,
    setMonthlyIncome,
    dailySpending,
    setDailySpending,
    currency,
    setCurrency,
    isLoading,
    handleSubmit,
  } = useFinancialForm({ goalId, onSuccess });

  const [showDashboard, setShowDashboard] = useState(false);

  const selectedCurrency = getSelectedCurrency(currency);
  const monthlyIncomeNumber = Number(monthlyIncome) || 0;
  const dailySpendingNumber = Number(dailySpending) || 0;

  // Show dashboard if we have valid financial data
  const hasValidData = monthlyIncomeNumber > 0 && dailySpendingNumber > 0;

  return (
    <div className="space-y-6">
      <Card className="w-full glass-card">
        <CardHeader>
          <CardTitle className="text-xl">Financial Information</CardTitle>
          <CardDescription>
            Add your financial details to help calculate realistic daily tasks for your goal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <CurrencySelector 
              value={currency}
              onChange={setCurrency}
            />
            
            <MoneyInputField
              id="monthlyIncome"
              label="Monthly Income"
              placeholder="5000"
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              currencyIcon={selectedCurrency.icon}
              currencySymbol={selectedCurrency.symbol}
              min="0"
              step="1"
            />
            
            <MoneyInputField
              id="dailySpending"
              label="Average Daily Spending"
              placeholder="50"
              value={dailySpending}
              onChange={(e) => setDailySpending(e.target.value)}
              currencyIcon={selectedCurrency.icon}
              currencySymbol={selectedCurrency.symbol}
              min="0"
              step="0.01"
            />
            
            <SubmitButton
              isLoading={isLoading}
              text="Save Financial Information"
              loadingText="Saving..."
            />

            {hasValidData && (
              <div className="pt-2">
                <button 
                  type="button"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  onClick={() => setShowDashboard(!showDashboard)}
                >
                  {showDashboard ? "Hide financial insights" : "View financial insights"}
                </button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {showDashboard && hasValidData && (
        <FinancialDashboard 
          monthlyIncome={monthlyIncomeNumber}
          dailySpending={dailySpendingNumber}
          currency={currency}
        />
      )}
    </div>
  );
};

export default FinancialForm;
