import { toast } from 'sonner';

// Track recent toasts to prevent duplicates
const recentToasts = new Map();
const DEDUP_WINDOW_MS = 3000;

function deduplicatedToast(type, message, options = {}) {
  const key = `${type}:${message}`;
  const now = Date.now();
  
  // Check if we've shown this toast recently
  const lastShown = recentToasts.get(key);
  if (lastShown && now - lastShown < DEDUP_WINDOW_MS) {
    return; // Skip duplicate
  }
  
  // Record this toast
  recentToasts.set(key, now);
  
  // Clean up old entries
  for (const [k, timestamp] of recentToasts.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentToasts.delete(k);
    }
  }
  
  // Show the toast
  toast[type](message, options);
}

export const showToast = {
  success: (message, options) => deduplicatedToast('success', message, options),
  error: (message, options) => deduplicatedToast('error', message, options),
  info: (message, options) => deduplicatedToast('info', message, options),
  warning: (message, options) => deduplicatedToast('warning', message, options),
};

export function showApiError(error, defaultMessage = 'An error occurred') {
  const message = error?.response?.data?.detail || error?.message || defaultMessage;
  showToast.error(message);
  return message;
}
