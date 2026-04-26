// TrendyWheels Design Tokens
// Source of truth for all colors, spacing, typography across mobile and web.
// Brand values sourced from official brand guide (see /opt/trendywheels-brand-source).

export const colors = {
  // Friendly Blue — brand primary. Scale built around #2B0FF8.
  primary: {
    50: "#EEECFF",
    100: "#D3CDFE",
    200: "#A8A0FD",
    300: "#7D6FFC",
    400: "#523FFA",
    500: "#2B0FF8",
    600: "#2309CC",
    700: "#1B079A",
    800: "#130568",
    900: "#0C0342",
  },
  // Trendy Pink — brand accent, used for CTAs and highlights.
  accent: {
    DEFAULT: "#FF0065",
    light: "#FF4D8F",
    dark: "#CC0051",
  },
  // Full named brand palette from the brand guide.
  brand: {
    friendlyBlue: "#2B0FF8",
    trendyPink: "#FF0065",
    ecoLimelight: "#A9F453",
    poolBlue: "#00C7EA",
    ultraRed: "#FF0000",
    trustWorth: "#02011F",
    loyalty: "#FFFFFF",
  },
  // Dark mode — anchored on Trust Worth navy.
  dark: {
    bg: "#02011F",
    card: "#0A0833",
    border: "#1E1B4B",
  },
  light: {
    bg: "#FFFFFF",
    card: "#FFFFFF",
    border: "#E5E7EB",
  },
  success: "#A9F453",
  warning: "#F59E0B",
  error: "#FF0000",
  info: "#00C7EA",
  text: {
    primary: "#02011F",
    secondary: "#6B7280",
    light: "#F3F4F6",
    placeholder: "#9CA3AF",
  },
  // Tonal ink scale — bridges pure white and Trust Worth navy.
  ink: {
    50: "#F4F4F7",
    100: "#E8E8EE",
    200: "#CBCAD6",
    300: "#9B9AAE",
    500: "#4B4A6B",
    700: "#1E1B4B",
    900: "#02011F",
  },
} as const;

// Mode-aware palette resolver — returns the concrete colors a UI surface should use
// for background/card/border/text/etc. given the current dark-mode flag.
export type Palette = {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  muted: string;
  faint: string;
  hairline: string;
  tabInactive: string;
  chipBg: string;
  blue: string;
  pink: string;
  lime: string;
  pool: string;
  red: string;
};

export function twPalette(dark: boolean): Palette {
  if (dark) {
    return {
      bg: colors.brand.trustWorth,
      card: colors.dark.card,
      cardAlt: "#120F3D",
      border: colors.dark.border,
      text: colors.brand.loyalty,
      muted: "rgba(255,255,255,0.58)",
      faint: "rgba(255,255,255,0.14)",
      hairline: "rgba(255,255,255,0.08)",
      tabInactive: "rgba(255,255,255,0.42)",
      chipBg: "rgba(255,255,255,0.06)",
      blue: colors.brand.friendlyBlue,
      pink: colors.brand.trendyPink,
      lime: colors.brand.ecoLimelight,
      pool: colors.brand.poolBlue,
      red: colors.brand.ultraRed,
    };
  }
  return {
    bg: "#F7F7FB",
    card: colors.brand.loyalty,
    cardAlt: colors.ink[50],
    border: colors.ink[100],
    text: colors.brand.trustWorth,
    muted: "#6B6A85",
    faint: colors.ink[100],
    hairline: "rgba(2,1,31,0.08)",
    tabInactive: colors.ink[300],
    chipBg: colors.ink[50],
    blue: colors.brand.friendlyBlue,
    pink: colors.brand.trendyPink,
    lime: colors.brand.ecoLimelight,
    pool: colors.brand.poolBlue,
    red: colors.brand.ultraRed,
  };
}

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
    display: "Anton, Impact, 'Bebas Neue', system-ui, sans-serif",
    body: "'Source Sans 3', 'Source Sans Pro', 'Myriad Pro', system-ui, sans-serif",
    arabic: "'Cairo', 'Noto Sans Arabic', 'Tajawal', system-ui, sans-serif",
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

// Motion tokens — single ease curve + durations per TrendyWheels.html.
export const motion = {
  ease: "cubic-bezier(.2,.7,.3,1)",
  duration: {
    fast: 180,
    medium: 320,
    slow: 420,
  },
  stagger: 50,
} as const;

// Currency helpers — consumed by every pricing UI in both EN and AR.
export function twEGP(amount: number, rtl = false): string {
  const s = amount.toLocaleString("en-US");
  return rtl ? `${s} ج.م` : `EGP ${s}`;
}

export function twPrice(amount: number, rtl = false): string {
  const s = amount.toLocaleString("en-US");
  return rtl ? `${s} ج.م/يوم` : `EGP ${s}/day`;
}

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
        brand: colors.brand,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
        info: colors.info,
        dark: colors.dark,
      },
      fontFamily: {
        display: [typography.fontFamily.display],
        body: [typography.fontFamily.body],
        arabic: [typography.fontFamily.arabic],
        mono: [typography.fontFamily.mono],
      },
      transitionTimingFunction: {
        tw: motion.ease,
      },
      transitionDuration: {
        "tw-fast": `${motion.duration.fast}ms`,
        "tw-medium": `${motion.duration.medium}ms`,
        "tw-slow": `${motion.duration.slow}ms`,
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
