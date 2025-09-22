
import { useState } from "react";
import { DollarSign, CircleDollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface CurrencyOption {
  value: string;
  label: string;
  symbol: string;
  icon: React.ReactNode;
}

interface CurrencySelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const currencyOptions: CurrencyOption[] = [
  { value: "USD", label: "US Dollar (USD)", symbol: "$", icon: <DollarSign className="h-4 w-4" /> },
  { value: "KHR", label: "Khmer Riel (KHR)", symbol: "៛", icon: <span className="text-sm font-medium">៛</span> },
  { value: "KRW", label: "Korean Won (KRW)", symbol: "₩", icon: <CircleDollarSign className="h-4 w-4" /> },
];

export const getSelectedCurrency = (currencyCode: string): CurrencyOption => {
  return currencyOptions.find(option => option.value === currencyCode) || currencyOptions[0];
};

const CurrencySelector = ({ value, onChange }: CurrencySelectorProps) => {
  const selectedCurrency = getSelectedCurrency(value);

  return (
    <div className="space-y-2">
      <Label htmlFor="currency">Currency</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-white/70">
          <SelectValue>
            <div className="flex items-center">
              {selectedCurrency.icon}
              <span className="ml-2">{selectedCurrency.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white">
          {currencyOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center">
                {option.icon}
                <span className="ml-2">{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CurrencySelector;
