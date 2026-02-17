import { useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Upload, Trash2, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useAvatars } from '../context/AvatarContext';
import avatarService from '../services/avatarService';
import { validateAvatarFile } from '../config/avatarConfig';
import { showToast, showApiError } from '../lib/toast';

/**
 * AvatarCard - Individual avatar management card
 */
function AvatarCard({ avatar, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      showToast.error(validation.errors.join(' '));
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      await avatarService.uploadPhoto(avatar.id, file);
      showToast.success(`Photo uploaded for ${avatar.name}`);
      onUpdate();
    } catch (err) {
      showApiError(err, 'Failed to upload photo');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await avatarService.deletePhoto(avatar.id);
      showToast.success(`Photo removed from ${avatar.name}`);
      onUpdate();
    } catch (err) {
      showApiError(err, 'Failed to remove photo');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div
      className="bg-ministry-bg-secondary border border-ministry-border-default rounded-ministry p-4 flex items-center gap-4"
      data-testid={`avatar-card-${avatar.id}`}
    >
      {/* Avatar Preview */}
      <div
        className="w-12 h-12 rounded-full bg-ministry-bg-tertiary border border-ministry-border-default flex items-center justify-center overflow-hidden flex-shrink-0"
        data-testid={`avatar-preview-${avatar.id}`}
      >
        {avatar.has_photo && avatar.photo_data ? (
          <img
            src={avatar.photo_data}
            alt={avatar.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User size={24} className="text-ministry-text-secondary" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-ministry-text-primary">{avatar.name}</h3>
        <div className="flex items-center gap-1.5 mt-0.5">
          {avatar.has_photo ? (
            <>
              <CheckCircle size={14} className="text-ministry-status-approved" />
              <span className="text-xs text-ministry-status-approved">Photo set</span>
            </>
          ) : (
            <>
              <AlertCircle size={14} className="text-ministry-text-secondary" />
              <span className="text-xs text-ministry-text-secondary">Not set</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          data-testid={`avatar-file-input-${avatar.id}`}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={uploading || removing}
          className="border-ministry-border-default rounded-ministry text-ministry-text-primary hover:bg-ministry-bg-tertiary"
          data-testid={`avatar-upload-btn-${avatar.id}`}
        >
          <Upload size={14} className="mr-1.5" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        {avatar.has_photo && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={uploading || removing}
            className="border-ministry-border-default rounded-ministry text-ministry-status-rejected hover:bg-ministry-bg-tertiary"
            data-testid={`avatar-remove-btn-${avatar.id}`}
          >
            <Trash2 size={14} className="mr-1.5" />
            {removing ? 'Removing...' : 'Remove'}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * AvatarsSettings - Settings page section for managing avatars
 */
export default function AvatarsSettings() {
  const { avatars, loading, error, fetchAvatars } = useAvatars();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-ministry-bg-secondary border border-ministry-border-default rounded-ministry p-4 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-ministry-bg-tertiary" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-ministry-bg-tertiary rounded mb-2" />
                <div className="h-3 w-16 bg-ministry-bg-tertiary rounded" />
              </div>
              <div className="h-8 w-20 bg-ministry-bg-tertiary rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-ministry-status-rejected/10 border border-ministry-status-rejected text-ministry-status-rejected p-4 rounded-ministry">
        {error}. <button onClick={fetchAvatars} className="underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="avatars-settings">
      {avatars.map((avatar) => (
        <AvatarCard key={avatar.id} avatar={avatar} onUpdate={fetchAvatars} />
      ))}
      <p className="text-xs text-ministry-text-secondary mt-4">
        Supported formats: JPG, PNG, WebP. Maximum size: 2MB.
      </p>
    </div>
  );
}
