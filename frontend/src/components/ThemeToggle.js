/**
 * Theme Toggle Component
 * 
 * Animated toggle switch for light/dark mode.
 * Shows sun/moon icons with smooth transitions.
 */

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/themeProvider';
import { Button } from './ui/button';

export function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      data-testid="theme-toggle"
      className={`relative h-9 w-9 p-0 rounded-ministry hover:bg-ministry-bg-hover ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {/* Sun icon - visible in dark mode */}
      <Sun
        size={18}
        className={`absolute transition-all duration-200 ${
          isDark 
            ? 'rotate-0 scale-100 opacity-100' 
            : 'rotate-90 scale-0 opacity-0'
        }`}
        style={{ color: 'var(--theme-text-secondary)' }}
      />
      {/* Moon icon - visible in light mode */}
      <Moon
        size={18}
        className={`absolute transition-all duration-200 ${
          isDark 
            ? '-rotate-90 scale-0 opacity-0' 
            : 'rotate-0 scale-100 opacity-100'
        }`}
        style={{ color: 'var(--theme-text-secondary)' }}
      />
      <span className="sr-only">
        {isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      </span>
    </Button>
  );
}

/**
 * Compact theme toggle for tight spaces
 */
export function ThemeToggleCompact({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      data-testid="theme-toggle-compact"
      className={`flex items-center justify-center h-7 w-7 rounded-ministry-sm 
        hover:bg-ministry-bg-hover transition-colors ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun size={14} style={{ color: 'var(--theme-text-secondary)' }} />
      ) : (
        <Moon size={14} style={{ color: 'var(--theme-text-secondary)' }} />
      )}
    </button>
  );
}

export default ThemeToggle;
