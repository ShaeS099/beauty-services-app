import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

const light = {
  primary: "#C9963A",
  text: "#1A1510",
  subtext: "#7A7068",
  border: "#E8E2D9",
  background: "#FAF7F2",
  surface: "#FFFFFF",
  danger: "#B85C38",
  success: "#5C7A6A",
  warning: "#B8860B",
};

const dark = {
  primary: "#C9963A",
  text: "#FAF7F2",
  subtext: "#B0A99E",
  border: "#3A332A",
  background: "#1A1510",
  surface: "#2A241D",
  danger: "#B85C38",
  success: "#5C7A6A",
  warning: "#B8860B",
};

export type ThemeColors = typeof light;

export const fonts = {
  heading: "PlayfairDisplay_700Bold",
  body: "DMSans_400Regular",
  mono: "DMMono_500Medium",
};

export function getStatusColors(colors: ThemeColors): Record<string, string> {
  return {
    pending: colors.warning,
    confirmed: colors.success,
    completed: colors.subtext,
    cancelled: colors.danger,
  };
}

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({ colors: light, isDark: false });

/** Wraps the app; `useColorScheme()` re-renders this (and everything reading `useTheme()`) the
 * instant the OS theme changes, unlike the old module-load-once `Appearance.getColorScheme()`. */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const scheme = useColorScheme();
  const value = useMemo<ThemeContextValue>(() => {
    const isDark = scheme === "dark";
    return { colors: isDark ? dark : light, isDark };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
