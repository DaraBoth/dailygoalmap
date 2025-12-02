
import React from "react";
import { ThemeProvider as ThemeProviderInternal } from "@/hooks/use-theme";

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  defaultTheme?: "dark" | "light" | "system";
  storageKey?: string;
}> = ({ children, defaultTheme = "system", storageKey = "ui-theme" }) => {
  return (
    <ThemeProviderInternal defaultTheme={defaultTheme} storageKey={storageKey}>
      {children}
    </ThemeProviderInternal>
  );
};
