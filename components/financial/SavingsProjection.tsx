
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateCompoundInterest, formatCurrency } from "@/utils/financialCalculations";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface SavingsProjectionProps {
  monthlySavings: number;
  currency: string;
  years: number;
}

const SavingsProjection = ({ monthlySavings, currency, years = 5 }: SavingsProjectionProps) => {
  // Generate projection data
  const generateProjectionData = () => {
    const data = [];
    const annualSavings = monthlySavings * 12;
    
    for (let i = 0; i <= years; i++) {
      // Calculate regular savings
      const regularSavings = annualSavings * i;
      
      // Calculate with 3% interest compound annually
      const withInterest = calculateCompoundInterest(0, 3, i, 1, annualSavings);
      
      // Calculate with 5% interest compound annually
      const withHigherInterest = calculateCompoundInterest(0, 5, i, 1, annualSavings);
      
      data.push({
        year: i,
        regular: regularSavings,
        interest3: withInterest,
        interest5: withHigherInterest,
      });
    }
    return data;
  };

  const projectionData = generateProjectionData();
  
  // Helper to format the tooltip values
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value, currency);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Savings Projection</CardTitle>
        <CardDescription>
          See how your savings could grow over the next {years} years
        </CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ChartContainer
          config={{
            regular: { label: "No Interest", color: "#94a3b8" },
            interest3: { label: "3% Interest", color: "#60a5fa" },
            interest5: { label: "5% Interest", color: "#8b5cf6" },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={projectionData}
              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis 
                dataKey="year"
                tickFormatter={(value) => `Year ${value}`}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value, currency).slice(0, -3)}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <ChartTooltipContent payload={payload} formatter={formatTooltipValue} />
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="regular"
                name="No Interest"
                stroke="#94a3b8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="interest3"
                name="3% Interest"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="interest5"
                name="5% Interest"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export default SavingsProjection;
