import { isRTL, t, type Locale } from "@trendywheels/i18n";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";
import { useCallback } from "react";
import { Alert, I18nManager } from "react-native";
import { create } from "zustand";

const LOCALE_STORAGE_KEY = "tw_locale";
const LOCALE_CHOSEN_KEY = "tw_locale_chosen";

type TranslationKey = Parameters<typeof t>[0];

interface LocaleState {
  locale: Locale;
  // Has the user explicitly picked a language on the first-launch gate yet?
  // Distinct from `locale` because the default "en" must NOT skip the gate.
  chosen: boolean;
  // True once the SecureStore reads have resolved — the gate waits for this
  // so it never flashes before we know whether a choice was already made.
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
  markChosen: () => Promise<void>;
}

export const useLocale = create<LocaleState>((set) => ({
  locale: "en",
  chosen: false,
  hydrated: false,
  setLocale: (locale) => set({ locale }),
  markChosen: async () => {
    set({ chosen: true });
    try {
      await SecureStore.setItemAsync(LOCALE_CHOSEN_KEY, "1");
    } catch {
      // Non-fatal: worst case the gate shows once more next launch.
    }
  },
}));

// Hydrate persisted locale + chosen flag at module load. Defaults stand until
// the SecureStore reads resolve; `hydrated` flips true when they do.
void (async () => {
  try {
    const [stored, chosen] = await Promise.all([
      SecureStore.getItemAsync(LOCALE_STORAGE_KEY),
      SecureStore.getItemAsync(LOCALE_CHOSEN_KEY),
    ]);
    useLocale.setState({
      locale: stored === "en" || stored === "ar" ? stored : "en",
      chosen: chosen === "1",
      hydrated: true,
    });
  } catch {
    useLocale.setState({ hydrated: true });
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
