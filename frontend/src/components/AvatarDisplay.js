import { useAvatars } from '../context/AvatarContext';

/**
 * AvatarDisplay - Unified avatar component used throughout the app
 * Shows avatar thumbnail (photo or initials fallback) with optional label
 * 
 * @param {string} avatarName - The avatar name (e.g., "Avatar 1")
 * @param {number} size - Size in pixels (default: 32)
 * @param {boolean} showLabel - Whether to show the display name label
 * @param {boolean} useDisplayName - Whether to use display_name instead of avatar name
 * @param {string} className - Additional CSS classes
 */
export function AvatarDisplay({ avatarName, size = 32, showLabel = false, useDisplayName = true, className = '' }) {
  const { getAvatarPhoto, getAvatarDisplayName, getAvatarInitials } = useAvatars();
  const photoUrl = getAvatarPhoto(avatarName);
  const displayName = useDisplayName ? getAvatarDisplayName(avatarName) : avatarName;
  const initials = getAvatarInitials(avatarName);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="rounded-full bg-ministry-bg-tertiary border border-ministry-border-default flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
        data-testid={`avatar-display-${avatarName?.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <span 
            className="text-ministry-text-secondary font-medium"
            style={{ fontSize: Math.max(size * 0.4, 10) }}
          >
            {initials}
          </span>
        )}
      </div>
      {showLabel && (
        <span className="text-ministry-text-secondary text-sm">{displayName}</span>
      )}
    </div>
  );
}

export default AvatarDisplay;
