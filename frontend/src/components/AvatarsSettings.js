import { useState, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Upload, Trash2, Check, X } from 'lucide-react';
import { useAvatars } from '../context/AvatarContext';
import avatarService from '../services/avatarService';
import { validateAvatarFile } from '../config/avatarConfig';
import { showToast, showApiError } from '../lib/toast';
import { format } from 'date-fns';

/**
 * AvatarsSettings - Microsoft admin-style table for managing avatars
 * Columns: Avatar | Preview | Display Name | Active | Updated | Actions
 */
export default function AvatarsSettings() {
  const { avatars, loading, error, fetchAvatars, getAvatarInitials } = useAvatars();
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState({});
  const fileInputRefs = useRef({});

  // Start inline editing for display_name
  const startEditing = (avatar) => {
    setEditingId(avatar.id);
    setEditValue(avatar.display_name || avatar.name);
  };

  // Cancel inline editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Save display_name
  const saveDisplayName = async (avatarId) => {
    if (!editValue.trim()) {
      showToast.error('Display name cannot be empty');
      return;
    }

    setSaving((prev) => ({ ...prev, [avatarId]: true }));
    try {
      await avatarService.updateAvatar(avatarId, { display_name: editValue.trim() });
      showToast.success('Display name updated');
      fetchAvatars();
      setEditingId(null);
      setEditValue('');
    } catch (err) {
      showApiError(err, 'Failed to update display name');
    } finally {
      setSaving((prev) => ({ ...prev, [avatarId]: false }));
    }
  };

  // Toggle is_active
  const toggleActive = async (avatar) => {
    setSaving((prev) => ({ ...prev, [`active-${avatar.id}`]: true }));
    try {
      await avatarService.updateAvatar(avatar.id, { is_active: !avatar.is_active });
      showToast.success(`${avatar.display_name || avatar.name} ${!avatar.is_active ? 'activated' : 'deactivated'}`);
      fetchAvatars();
    } catch (err) {
      showApiError(err, 'Failed to update status');
    } finally {
      setSaving((prev) => ({ ...prev, [`active-${avatar.id}`]: false }));
    }
  };

  // Handle file upload (Replace photo)
  const handleFileChange = async (avatarId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      showToast.error(validation.errors.join(' '));
      e.target.value = '';
      return;
    }

    setSaving((prev) => ({ ...prev, [`upload-${avatarId}`]: true }));
    try {
      await avatarService.uploadPhoto(avatarId, file);
      showToast.success('Photo uploaded successfully');
      fetchAvatars();
    } catch (err) {
      showApiError(err, 'Failed to upload photo');
    } finally {
      setSaving((prev) => ({ ...prev, [`upload-${avatarId}`]: false }));
      e.target.value = '';
    }
  };

  // Remove photo
  const handleRemovePhoto = async (avatar) => {
    setSaving((prev) => ({ ...prev, [`remove-${avatar.id}`]: true }));
    try {
      await avatarService.deletePhoto(avatar.id);
      showToast.success('Photo removed');
      fetchAvatars();
    } catch (err) {
      showApiError(err, 'Failed to remove photo');
    } finally {
      setSaving((prev) => ({ ...prev, [`remove-${avatar.id}`]: false }));
    }
  };

  // Get initials for avatar (A1, A2, A3)
  const getInitials = (avatar) => {
    return getAvatarInitials(avatar.name);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-ministry-bg-tertiary rounded mb-2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-ministry-bg-tertiary rounded mb-2" />
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
    <div data-testid="avatars-settings">
      <Table>
        <TableHeader>
          <TableRow className="border-ministry-border-default">
            <TableHead className="text-ministry-text-primary font-semibold w-[80px]">Avatar</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold w-[60px]">Preview</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Display Name</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold w-[80px]">Active</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold w-[140px]">Updated</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold w-[180px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {avatars.map((avatar) => {
            const isEditing = editingId === avatar.id;
            const isSavingName = saving[avatar.id];
            const isSavingActive = saving[`active-${avatar.id}`];
            const isUploading = saving[`upload-${avatar.id}`];
            const isRemoving = saving[`remove-${avatar.id}`];

            return (
              <TableRow key={avatar.id} className="border-ministry-border-default" data-testid={`avatar-row-${avatar.id}`}>
                {/* Avatar ID */}
                <TableCell className="text-ministry-text-secondary text-sm font-mono">
                  {avatar.name}
                </TableCell>

                {/* Preview - 32px circle with photo or initials */}
                <TableCell>
                  <div
                    className="w-8 h-8 rounded-full bg-ministry-bg-tertiary border border-ministry-border-default flex items-center justify-center overflow-hidden"
                    data-testid={`avatar-preview-${avatar.id}`}
                  >
                    {avatar.has_photo && avatar.photo_data ? (
                      <img
                        src={avatar.photo_data}
                        alt={avatar.display_name || avatar.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-ministry-text-secondary">
                        {getInitials(avatar)}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Display Name - Inline Edit */}
                <TableCell>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveDisplayName(avatar.id);
                          if (e.key === 'Escape') cancelEditing();
                        }}
                        className="h-8 w-40 border-ministry-border-default rounded-ministry text-sm"
                        autoFocus
                        data-testid={`avatar-name-input-${avatar.id}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => saveDisplayName(avatar.id)}
                        disabled={isSavingName}
                        className="h-7 w-7 p-0 text-ministry-status-approved hover:bg-ministry-status-approved/10"
                        data-testid={`avatar-name-save-${avatar.id}`}
                      >
                        <Check size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={isSavingName}
                        className="h-7 w-7 p-0 text-ministry-text-secondary hover:bg-ministry-bg-tertiary"
                        data-testid={`avatar-name-cancel-${avatar.id}`}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(avatar)}
                      className="text-ministry-text-primary hover:text-ministry-brand-primary hover:underline text-left"
                      data-testid={`avatar-name-edit-${avatar.id}`}
                    >
                      {avatar.display_name || avatar.name}
                    </button>
                  )}
                </TableCell>

                {/* Active Toggle */}
                <TableCell>
                  <Switch
                    checked={avatar.is_active !== false}
                    onCheckedChange={() => toggleActive(avatar)}
                    disabled={isSavingActive}
                    data-testid={`avatar-active-toggle-${avatar.id}`}
                  />
                </TableCell>

                {/* Updated */}
                <TableCell className="text-ministry-text-secondary text-sm">
                  {avatar.updated_at
                    ? format(new Date(avatar.updated_at), 'MMM dd, HH:mm')
                    : '—'}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex gap-2">
                    {/* Hidden file input */}
                    <input
                      ref={(el) => (fileInputRefs.current[avatar.id] = el)}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleFileChange(avatar.id, e)}
                      className="hidden"
                      data-testid={`avatar-file-input-${avatar.id}`}
                    />
                    
                    {/* Replace photo - Primary small */}
                    <Button
                      size="sm"
                      onClick={() => fileInputRefs.current[avatar.id]?.click()}
                      disabled={isUploading || isRemoving}
                      className="h-7 text-xs bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry"
                      data-testid={`avatar-upload-btn-${avatar.id}`}
                    >
                      <Upload size={12} className="mr-1" />
                      {isUploading ? 'Uploading...' : 'Replace'}
                    </Button>

                    {/* Remove - Ghost, only if photo exists */}
                    {avatar.has_photo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePhoto(avatar)}
                        disabled={isUploading || isRemoving}
                        className="h-7 text-xs text-ministry-text-secondary hover:text-ministry-status-rejected hover:bg-ministry-status-rejected/10 rounded-ministry"
                        data-testid={`avatar-remove-btn-${avatar.id}`}
                      >
                        <Trash2 size={12} className="mr-1" />
                        {isRemoving ? 'Removing...' : 'Remove'}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <p className="text-xs text-ministry-text-secondary mt-4">
        Supported formats: JPG, PNG, WebP. Maximum size: 5MB. Images are automatically optimized to 256x256 WebP.
      </p>
    </div>
  );
}
