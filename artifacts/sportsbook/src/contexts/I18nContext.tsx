import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { zh } from '../i18n/zh';
import { getOverrides, onOverridesChanged } from '../i18n/translator';

const DICTIONARIES: Record<string, Record<string, string>> = {
  'zh-CN': zh,
  'zh':    zh,
};

interface I18nContextValue {
  lang: string;
  setLang: (code: string) => void;
  t: (key: string) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  lang:    'en',
  setLang: () => {},
  t:       (key) => key,
});

const STORAGE_KEY = 'cupbett_lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // Only English + Chinese are supported; sanitize any stale value.
      return stored === 'en' || stored === 'zh-CN' ? stored : 'zh-CN';
    } catch { return 'zh-CN'; }
  });

  const setLang = useCallback((code: string) => {
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  // Bump on every operator-override poll so t()-based renders (e.g. league
  // names via <SportName>) pick up live edits without a rebuild.
  const [overridesVersion, setOverridesVersion] = useState(0);
  useEffect(() => onOverridesChanged(() => setOverridesVersion((v) => v + 1)), []);

  const t = useCallback((key: string): string => {
    // Operator overrides win over the static dict, mirroring the DOM translator.
    const override = getOverrides()[key];
    if (override != null) return override;
    const dict = DICTIONARIES[lang];
    return dict?.[key] ?? key;
    // overridesVersion is intentionally part of the dep list to refresh on poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, overridesVersion]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
