import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
const KEY = 'profelink-theme';
const ThemeContext = createContext<{ theme: Theme; toggle(): void } | null>(null);

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* sin almacenamiento */
  }
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initial);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignorar */
    }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
