import { useState, useEffect } from 'react';
import { useTheme } from './use-theme';

const useSystemTheme = () => {

  const { theme:realTheme } = useTheme();

  const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light'; // Default to light if not in a browser environment or matchMedia is not supported
  };

  const [theme, setTheme] = useState(getSystemTheme);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (event) => {
        setTheme(event.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [realTheme]);

  return theme;
};

export default useSystemTheme;