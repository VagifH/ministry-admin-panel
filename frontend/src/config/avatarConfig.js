/**
 * Avatar Configuration
 * Centralized configuration for avatars used throughout the application
 */

// Avatar IDs and names
export const AVATAR_CONFIG = {
  'Avatar 1': { id: 'avatar-1', name: 'Avatar 1' },
  'Avatar 2': { id: 'avatar-2', name: 'Avatar 2' },
  'Avatar 3': { id: 'avatar-3', name: 'Avatar 3' },
};

// List of avatar names for dropdowns
export const AVATAR_LIST = ['Avatar 1', 'Avatar 2', 'Avatar 3'];

// Get avatar ID from name
export const getAvatarId = (avatarName) => {
  return AVATAR_CONFIG[avatarName]?.id || null;
};

// Get avatar name from ID
export const getAvatarName = (avatarId) => {
  const entry = Object.entries(AVATAR_CONFIG).find(([, config]) => config.id === avatarId);
  return entry ? entry[0] : null;
};

// Upload constraints
export const AVATAR_UPLOAD_CONSTRAINTS = {
  maxSizeMB: 5,
  maxSizeBytes: 5 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
};

// Validate file before upload
export const validateAvatarFile = (file) => {
  const errors = [];
  
  if (!AVATAR_UPLOAD_CONSTRAINTS.allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Only JPG, PNG, WebP allowed.`);
  }
  
  if (file.size > AVATAR_UPLOAD_CONSTRAINTS.maxSizeBytes) {
    errors.push(`File too large. Maximum size is ${AVATAR_UPLOAD_CONSTRAINTS.maxSizeMB}MB.`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};
