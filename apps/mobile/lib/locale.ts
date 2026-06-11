import { isRTL, t, type Locale } from "@trendywheels/i18n";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { useCallback } from "react";
import { Alert, I18nManager } from "react-native";
import { create } from "zustand";

const LOCALE_STORAGE_KEY = "tw_locale";

type TranslationKey = Parameters<typeof t>[0];

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocale = create<LocaleState>((set) => ({
  locale: "en",
  setLocale: (locale) => set({ locale }),
}));

// Hydrate the persisted locale at module load. The store defaults to "en"
// until the SecureStore read resolves.
void (async () => {
  try {
    const stored = await SecureStore.getItemAsync(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "ar") {
      useLocale.setState({ locale: stored });
    }
  } catch {
    // Keep the "en" default if the read fails.
  }
})();

/** Returns a t(key) function bound to the current locale. Re-renders on locale change. */
export function useT(): (key: TranslationKey) => string {
  const locale = useLocale((s) => s.locale);
  return useCallback((key: TranslationKey) => t(key, locale), [locale]);
}

/** Translate with the current locale outside React components. */
export function translate(key: TranslationKey): string {
  return t(key, useLocale.getState().locale);
}

/**
 * Persists the locale, then applies layout direction. React Native only reads
 * I18nManager's RTL flag at startup, so switching between LTR and RTL requires
 * a full app reload for the new layout direction to take effect.
 */
export async function applyLanguage(locale: Locale): Promise<void> {
  useLocale.getState().setLocale(locale);
  await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, locale);

  const rtl = isRTL(locale);
  if (rtl !== I18nManager.isRTL) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    try {
      await Updates.reloadAsync();
    } catch {
      // Updates.reloadAsync throws in dev clients; ask for a manual restart.
      Alert.alert(translate("settings.languageChanged"), translate("settings.restartToApply"));
    }
  }
}
