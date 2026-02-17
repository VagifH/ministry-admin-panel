import { useAvatars } from '../context/AvatarContext';
import { User } from 'lucide-react';

/**
 * AvatarDisplay - Shows avatar thumbnail with optional label
 * @param {string} avatarName - The avatar name (e.g., "Avatar 1")
 * @param {number} size - Size in pixels (default: 32)
 * @param {boolean} showLabel - Whether to show the avatar name
 * @param {string} className - Additional CSS classes
 */
export function AvatarDisplay({ avatarName, size = 32, showLabel = false, className = '' }) {
  const { getAvatarPhoto } = useAvatars();
  const photoUrl = getAvatarPhoto(avatarName);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="rounded-full bg-ministry-bg-tertiary border border-ministry-border-default flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{ width: size, height: size }}
        data-testid={`avatar-display-${avatarName?.toLowerCase().replace(' ', '-')}`}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={avatarName}
            className="w-full h-full object-cover"
          />
        ) : (
          <User
            size={size * 0.5}
            className="text-ministry-text-secondary"
          />
        )}
      </div>
      {showLabel && (
        <span className="text-ministry-text-secondary text-sm">{avatarName}</span>
      )}
    </div>
  );
}

export default AvatarDisplay;
