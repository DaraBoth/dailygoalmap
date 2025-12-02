
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from "react";
import { CurrencyOption } from "./CurrencySelector";

interface MoneyInputFieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currencyIcon: React.ReactNode;
  currencySymbol: string;
  min?: string;
  step?: string;
}

const MoneyInputField = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  currencyIcon,
  currencySymbol,
  min = "0",
  step = "1"
}: MoneyInputFieldProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label} ({currencySymbol})</Label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
          {currencyIcon}
        </div>
        <Input
          id={id}
          type="number"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="pl-10 bg-white/70"
          min={min}
          step={step}
          required
        />
      </div>
    </div>
  );
};

export default MoneyInputField;
