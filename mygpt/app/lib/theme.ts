// Theme types and utilities
export type Theme = 'light' | 'dark';

export const THEME_COOKIE_NAME = 'theme-preference';

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function getThemeFromCookie(request: Request): Theme | null {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;
  
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>);
  
  const theme = cookies[THEME_COOKIE_NAME];
  return theme === 'light' || theme === 'dark' ? theme : null;
}

export function createThemeCookie(theme: Theme): string {
  return `${THEME_COOKIE_NAME}=${theme}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
} 