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

  const value = {
    avatars,
    loading,
    error,
    fetchAvatars,
    getAvatarByName,
    getAvatarPhoto,
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
