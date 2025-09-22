
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/financialCalculations";
import { calculateDailySpendingLimit } from "@/utils/financialCalculations";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface BudgetCalculatorProps {
  monthlyIncome: number;
  currency: string;
  dailySpending: number;
}

const BudgetCalculator = ({ 
  monthlyIncome, 
  currency, 
  dailySpending 
}: BudgetCalculatorProps) => {
  const [savingsPercentage, setSavingsPercentage] = useState(20); // Default 20% savings
  const [dailyBudget, setDailyBudget] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  
  useEffect(() => {
    if (monthlyIncome > 0) {
      const calculatedDailyBudget = calculateDailySpendingLimit(monthlyIncome, savingsPercentage);
      setDailyBudget(calculatedDailyBudget);
      setMonthlySavings((monthlyIncome * savingsPercentage) / 100);
    }
  }, [monthlyIncome, savingsPercentage]);

  const handleSliderChange = (value: number[]) => {
    setSavingsPercentage(value[0]);
  };

  const currentDailyDifference = dailyBudget - dailySpending;
  const monthlyDifference = currentDailyDifference * 30;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Budget Calculator</CardTitle>
        <CardDescription>
          Adjust your savings goal to see how it affects your daily budget
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="savings-slider">
                Savings goal: <span className="font-medium">{savingsPercentage}%</span>
              </Label>
              <span className="text-sm text-muted-foreground">
                {formatCurrency(monthlySavings, currency)}/month
              </span>
            </div>
            <Slider
              id="savings-slider"
              defaultValue={[savingsPercentage]} 
              max={50}
              step={1}
              onValueChange={handleSliderChange}
              className="w-full"
            />
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-baseline">
              <div className="text-sm font-medium">Recommended daily budget</div>
              <div className="text-lg font-semibold">
                {formatCurrency(dailyBudget, currency)}
              </div>
            </div>
            
            <div className="flex justify-between items-baseline">
              <div className="text-sm font-medium">Your current daily spending</div>
              <div className="text-lg font-semibold">
                {formatCurrency(dailySpending, currency)}
              </div>
            </div>
            
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-baseline">
                <div className="text-sm font-medium">Daily difference</div>
                <div className={`text-lg font-semibold ${currentDailyDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentDailyDifference >= 0 ? '+' : ''}{formatCurrency(currentDailyDifference, currency)}
                </div>
              </div>
              
              <div className="flex justify-between items-baseline mt-1">
                <div className="text-sm font-medium">Monthly impact</div>
                <div className={`text-lg font-semibold ${monthlyDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {monthlyDifference >= 0 ? '+' : ''}{formatCurrency(monthlyDifference, currency)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetCalculator;
