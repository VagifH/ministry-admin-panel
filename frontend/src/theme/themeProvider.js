/**
 * Theme Provider - Enterprise Dark Mode System
 * 
 * Provides theme context and management for the application.
 * - Persists preference to localStorage
 * - Applies theme class to document root
 * - Injects CSS variables dynamically
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { THEMES, generateCSSVariables } from './themeTokens';

// =============================================================================
// CONSTANTS
// =============================================================================
const THEME_STORAGE_KEY = 'ministry-theme';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';

// =============================================================================
// THEME CONTEXT
// =============================================================================
const ThemeContext = createContext({
  theme: THEME_LIGHT,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

// =============================================================================
// THEME PROVIDER COMPONENT
// =============================================================================
export function ThemeProvider({ children }) {
  // Initialize theme from localStorage or system preference
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === THEME_LIGHT || stored === THEME_DARK) {
        return stored;
      }
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return THEME_DARK;
      }
    }
    return THEME_LIGHT;
  });

  // Apply theme to document and inject CSS variables
  useEffect(() => {
    const root = document.documentElement;
    const themeTokens = THEMES[theme];
    const cssVars = generateCSSVariables(themeTokens);

    // Remove previous theme class and add new one
    root.classList.remove(THEME_LIGHT, THEME_DARK);
    root.classList.add(theme);

    // Inject CSS variables
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Store preference
    localStorage.setItem(THEME_STORAGE_KEY, theme);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeTokens.bg.base);
    }
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only auto-switch if user hasn't explicitly set a preference
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        setThemeState(e.matches ? THEME_DARK : THEME_LIGHT);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Theme toggle function
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === THEME_LIGHT ? THEME_DARK : THEME_LIGHT));
  }, []);

  // Set specific theme
  const setTheme = useCallback((newTheme) => {
    if (newTheme === THEME_LIGHT || newTheme === THEME_DARK) {
      setThemeState(newTheme);
    }
  }, []);

  const value = {
    theme,
    isDark: theme === THEME_DARK,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// =============================================================================
// EXPORTS
// =============================================================================
export { THEME_LIGHT, THEME_DARK };
export default ThemeProvider;
