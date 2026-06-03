
import React from "react";
import { ThemeProvider as ThemeProviderInternal } from "@/hooks/use-theme";
import { useTheme } from "@/hooks/use-theme";
import { createTheme, CssBaseline, ThemeProvider as MuiThemeProvider } from "@mui/material";

const MuiThemeBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useTheme();
  const getSystemMode = React.useCallback((): "light" | "dark" => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }, []);

  const [systemMode, setSystemMode] = React.useState<"light" | "dark">(getSystemMode);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemMode(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const mode = theme === "system" ? systemMode : theme;

  const muiTheme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === "dark" ? "#60a5fa" : "#2563eb",
          },
          background: {
            default: mode === "dark" ? "#09090b" : "#f8fafc",
            paper: mode === "dark" ? "#111827" : "#ffffff",
          },
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiPaper: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 600,
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline enableColorScheme />
      {children}
    </MuiThemeProvider>
  );
};

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  defaultTheme?: "dark" | "light" | "system";
  storageKey?: string;
}> = ({ children, defaultTheme = "system", storageKey = "ui-theme" }) => {
  return (
    <ThemeProviderInternal defaultTheme={defaultTheme} storageKey={storageKey}>
      <MuiThemeBridge>{children}</MuiThemeBridge>
    </ThemeProviderInternal>
  );
};
