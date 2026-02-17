import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import avatarService from '../services/avatarService';

const AvatarContext = createContext(null);

export function AvatarProvider({ children }) {
  const [avatars, setAvatars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAvatars = useCallback(async () => {
    try {
      const data = await avatarService.getAvatars();
      setAvatars(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch avatars:', err);
      setError('Failed to load avatars');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  // Get avatar data by name (e.g., "Avatar 1")
  const getAvatarByName = useCallback((name) => {
    const idMap = {
      'Avatar 1': 'avatar-1',
      'Avatar 2': 'avatar-2',
      'Avatar 3': 'avatar-3',
    };
    const id = idMap[name];
    return avatars.find((a) => a.id === id) || null;
  }, [avatars]);

  // Get avatar photo URL (base64 data URL or null)
  const getAvatarPhoto = useCallback((name) => {
    const avatar = getAvatarByName(name);
    return avatar?.has_photo ? avatar.photo_data : null;
  }, [getAvatarByName]);

  // Get avatar display name
  const getAvatarDisplayName = useCallback((name) => {
    const avatar = getAvatarByName(name);
    return avatar?.display_name || name;
  }, [getAvatarByName]);

  // Check if avatar is active
  const isAvatarActive = useCallback((name) => {
    const avatar = getAvatarByName(name);
    return avatar?.is_active !== false; // Default to true if not set
  }, [getAvatarByName]);

  // Get only active avatars (for selection dropdowns)
  const getActiveAvatars = useCallback(() => {
    return avatars.filter((a) => a.is_active !== false);
  }, [avatars]);

  // Get avatar initials (A1, A2, A3)
  const getAvatarInitials = useCallback((name) => {
    const match = name?.match(/Avatar\s*(\d)/i);
    return match ? `A${match[1]}` : 'A';
  }, []);

  const value = {
    avatars,
    loading,
    error,
    fetchAvatars,
    getAvatarByName,
    getAvatarPhoto,
    getAvatarDisplayName,
    isAvatarActive,
    getActiveAvatars,
    getAvatarInitials,
  };

  return (
    <AvatarContext.Provider value={value}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatars() {
  const context = useContext(AvatarContext);
  if (!context) {
    throw new Error('useAvatars must be used within an AvatarProvider');
  }
  return context;
}
