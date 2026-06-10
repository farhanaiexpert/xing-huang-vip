import { useI18n } from '../contexts/I18nContext';

/**
 * Renders a sport / league name with locale-aware wording.
 *
 * When the UI language is Chinese AND we have an explicit dictionary term for
 * this name, render that term wrapped in `translate="no"` so Google Translate
 * leaves our preferred wording untouched. For every other language — or any
 * name we don't have a dictionary term for — render the raw English so Google
 * Translate handles it exactly as before (no regressions).
 */
export function SportName({ name, className }: { name: string; className?: string }) {
  const { lang, t } = useI18n();
  const isZh = lang === 'zh' || lang === 'zh-CN';
  const translated = t(name);

  if (isZh && translated !== name) {
    return <span translate="no" className={className}>{translated}</span>;
  }
  if (className) return <span className={className}>{name}</span>;
  return <>{name}</>;
}
