import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useFetcher } from '@remix-run/react';
import { Theme, getSystemTheme, applyTheme } from '~/lib/theme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  systemTheme: Theme;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
  specifiedTheme?: Theme | null;
}

export function ThemeProvider({ children, specifiedTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme-preference');
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return specifiedTheme ?? 'light';
  });
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme);
  const fetcher = useFetcher();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Update system theme when it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme to DOM and update localStorage
  useEffect(() => {
    applyTheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme-preference', theme);
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (!isHydrated) return; // Prevent updates during hydration
    
    setThemeState(newTheme);
    
    // Update server-side cookie with error handling
    try {
      fetcher.submit(
        { theme: newTheme },
        { 
          method: 'POST', 
          action: '/api/theme',
          preventScrollReset: true
        }
      );
    } catch (error) {
      console.warn('Failed to update theme on server:', error);
    }
  }, [isHydrated, fetcher]);

  // Handle fetcher errors gracefully
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && typeof fetcher.data === 'object' && 'error' in fetcher.data) {
      console.warn('Theme server update failed:', fetcher.data.error);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, systemTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 