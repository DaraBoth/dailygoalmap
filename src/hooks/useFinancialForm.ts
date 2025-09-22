
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface FinancialFormData {
  goalId: string;
  monthlyIncome: number;
  dailySpending: number;
  currency: string;
  updatedAt: Date;
}

interface UseFinancialFormProps {
  goalId: string;
  onSuccess: (financialData: any) => void;
}

export const useFinancialForm = ({ goalId, onSuccess }: UseFinancialFormProps) => {
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [dailySpending, setDailySpending] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const { toast } = useToast();

  // Load saved currency if available
  useEffect(() => {
    const existingData = JSON.parse(localStorage.getItem('financialData') || '[]');
    const goalData = existingData.find((data: any) => data.goalId === goalId);
    
    if (goalData) {
      setMonthlyIncome(goalData.monthlyIncome.toString());
      setDailySpending(goalData.dailySpending.toString());
      if (goalData.currency) {
        setCurrency(goalData.currency);
      }
    }
  }, [goalId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!monthlyIncome || !dailySpending) {
      toast({
        title: "Missing fields",
        description: "Please fill in all financial information.",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(Number(monthlyIncome)) || isNaN(Number(dailySpending))) {
      toast({
        title: "Invalid input",
        description: "Please enter valid numeric values.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Create financial data object
      const financialData = {
        goalId,
        monthlyIncome: Number(monthlyIncome),
        dailySpending: Number(dailySpending),
        currency,
        updatedAt: new Date()
      };
      
      // Get existing financial data from localStorage or initialize as empty array
      const existingData = JSON.parse(localStorage.getItem('financialData') || '[]');
      
      // Check if financial data already exists for this goal
      const dataIndex = existingData.findIndex((data: any) => data.goalId === goalId);
      
      if (dataIndex >= 0) {
        // Update existing data
        existingData[dataIndex] = financialData;
      } else {
        // Add new data
        existingData.push(financialData);
      }
      
      // Save updated data to localStorage
      localStorage.setItem('financialData', JSON.stringify(existingData));
      
      toast({
        title: "Financial information saved!",
        description: "Your financial details have been updated.",
      });
      
      // Call onSuccess callback with the financial data
      onSuccess(financialData);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error saving your financial information.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    monthlyIncome,
    setMonthlyIncome,
    dailySpending,
    setDailySpending,
    currency,
    setCurrency,
    isLoading,
    handleSubmit,
  };
};
