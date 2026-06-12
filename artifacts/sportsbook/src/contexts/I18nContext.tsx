import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { zh } from '../i18n/zh';

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
    try { return localStorage.getItem(STORAGE_KEY) || 'zh-CN'; } catch { return 'zh-CN'; }
  });

  const setLang = useCallback((code: string) => {
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key: string): string => {
    const dict = DICTIONARIES[lang];
    return dict?.[key] ?? key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
