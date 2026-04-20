// TrendyWheels Design Tokens
// Source of truth for all colors, spacing, typography across mobile and web.

export const colors = {
  // Primary blue gradient
  primary: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1E50B4",
    800: "#1E40AF",
    900: "#1E3A8A",
  },
  // Neon green accent
  accent: {
    DEFAULT: "#00FF00",
    light: "#4AFF4A",
    dark: "#00CC00",
  },
  // Dark mode
  dark: {
    bg: "#0F172A",
    card: "#1F2937",
    border: "#374151",
  },
  // Light mode
  light: {
    bg: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E5E7EB",
  },
  // Semantic
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  // Text
  text: {
    primary: "#1F2937",
    secondary: "#6B7280",
    light: "#F3F4F6",
    placeholder: "#9CA3AF",
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    display: "Inter, Poppins, system-ui, sans-serif",
    body: "Inter, system-ui, sans-serif",
    mono: "Fira Code, monospace",
  },
  fontSize: {
    h1: 32,
    h2: 24,
    h3: 18,
    bodyLarge: 16,
    body: 14,
    caption: 12,
  },
  fontWeight: {
    regular: "400" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    h1: -0.5,
    h2: -0.25,
    h3: 0,
    body: 0,
  },
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px rgba(0, 0, 0, 0.07)",
  lg: "0 4px 12px rgba(0, 0, 0, 0.1)",
  xl: "0 8px 24px rgba(0, 0, 0, 0.12)",
} as const;

export const layout = {
  bottomTabHeight: 56,
  topNavHeight: 64,
  inputHeight: 44,
  buttonPaddingVertical: 12,
  buttonPaddingHorizontal: 24,
} as const;

// Tailwind CSS preset for web dashboards
export const tailwindPreset = {
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        accent: colors.accent,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
        dark: colors.dark,
      },
      fontFamily: {
        display: [typography.fontFamily.display],
        body: [typography.fontFamily.body],
        mono: [typography.fontFamily.mono],
      },
      spacing: {
        xs: `${spacing.xs}px`,
        sm: `${spacing.sm}px`,
        md: `${spacing.md}px`,
        lg: `${spacing.lg}px`,
        xl: `${spacing.xl}px`,
        "2xl": `${spacing["2xl"]}px`,
        "3xl": `${spacing["3xl"]}px`,
      },
      borderRadius: {
        sm: `${borderRadius.sm}px`,
        md: `${borderRadius.md}px`,
        lg: `${borderRadius.lg}px`,
        xl: `${borderRadius.xl}px`,
      },
      boxShadow: shadows,
    },
  },
} as const;
