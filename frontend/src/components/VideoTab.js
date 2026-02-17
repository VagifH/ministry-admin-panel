/**
 * VideoTab Component
 * Production-grade video upload UI with Fluent/Microsoft UX polish
 * Phase VP: Enhanced UX with status-based actions, confirmation dialogs, and consistent styling
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { 
  Video, 
  Clock, 
  HardDrive, 
  FileType, 
  User, 
  AlertCircle, 
  RefreshCw,
  Upload,
  Trash2,
  CheckCircle2,
  Download,
  AlertTriangle
} from 'lucide-react';
import { 
  getTaskVideo, 
  uploadVideo,
  deleteVideo,
  downloadVideo,
  validateVideoFile,
  VIDEO_STATUS, 
  VIDEO_STATUS_CONFIG,
  formatFileSize
} from '../services/videoService';
import { showToast, showApiError } from '../lib/toast';
import { isReadOnlyStatus } from '../utils/statusUtils';
import { useAuth } from '../context/AuthContext';
import { hasPermission, ACTIONS } from '../config/permissionsMatrix';
import { VIDEO_RULES, getAllowedTypesText, getSizeLimitText } from '../config/videoRules';

// Consistent button height for Fluent alignment
const BUTTON_HEIGHT = 'h-9'; // 36px

export default function VideoTab({ taskId, taskStatus }) {
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fileInputRef = useRef(null);

  // Permission checks from centralized matrix
  const canUpload = hasPermission(user?.role, ACTIONS.UPLOAD_VIDEO) && !isReadOnlyStatus(taskStatus);
  const canDelete = hasPermission(user?.role, ACTIONS.DELETE_VIDEO) && !isReadOnlyStatus(taskStatus);
  const canDownload = hasPermission(user?.role, ACTIONS.DOWNLOAD_VIDEO);
  const isReadOnly = isReadOnlyStatus(taskStatus);

  // Status-based action availability
  const isReady = video?.status === VIDEO_STATUS.READY;
  const isFailed = video?.status === VIDEO_STATUS.FAILED;
  const isPending = video?.status === VIDEO_STATUS.PENDING;
  const isProcessing = video?.status === VIDEO_STATUS.PROCESSING || video?.status === VIDEO_STATUS.UPLOADING;
  
  // Disable all actions during processing/uploading
  const actionsDisabled = uploading || deleting || isProcessing;

  useEffect(() => {
    fetchVideo();
  }, [taskId]);

  // Poll for status updates when processing
  useEffect(() => {
    if (isProcessing && !uploading) {
      const interval = setInterval(fetchVideo, 3000);
      return () => clearInterval(interval);
    }
  }, [isProcessing, uploading]);

  const fetchVideo = async () => {
    setLoading(true);
    setError(null);
    try {
      const videoData = await getTaskVideo(taskId);
      setVideo(videoData);
    } catch (err) {
      setError('Failed to load video information');
      showApiError(err, 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = useCallback(async (file) => {
    if (!file || !canUpload || actionsDisabled) return;

    // Validate file with friendly error messages
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      // Provide user-friendly error messages
      if (validation.error.includes('type')) {
        showToast.error(`Invalid file type. Only MP4, WebM, MOV videos are allowed.`);
      } else if (validation.error.includes('large')) {
        showToast.error(`File is too large. Maximum size is ${VIDEO_RULES.maxSizeMB}MB.`);
      } else {
        showToast.error(validation.error);
      }
      setError(validation.error);
      return;
    }

    // Show warning for large files
    if (validation.warning) {
      showToast.warning(validation.warning);
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const result = await uploadVideo(taskId, file, (progress) => {
        setUploadProgress(progress);
      });
      setVideo(result);
      showToast.success('Video uploaded successfully');
    } catch (err) {
      // Network or server error
      const errorMessage = err.response?.data?.detail || err.message || 'Upload failed';
      if (err.code === 'ERR_NETWORK' || err.message?.includes('network')) {
        setError('Network error. Please check your connection and try again.');
        showToast.error('Network error. Please retry the upload.');
      } else {
        setError(errorMessage);
        showApiError(err, 'Failed to upload video');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [taskId, canUpload, actionsDisabled]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canUpload || actionsDisabled) return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [canUpload, actionsDisabled]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (!canUpload || actionsDisabled) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [canUpload, actionsDisabled, handleFileSelect]);

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteDialog(false);
    setDeleting(true);
    try {
      await deleteVideo(taskId);
      setVideo(null);
      showToast.success('Video removed successfully');
    } catch (err) {
      showApiError(err, 'Failed to remove video');
    } finally {
      setDeleting(false);
    }
  };

  const handleReplace = () => {
    if (canUpload && !actionsDisabled) {
      fileInputRef.current?.click();
    }
  };

  const handleDownload = async () => {
    if (!video || !isReady || !canDownload) return;

    setDownloading(true);
    showToast.info('Downloading video...');
    
    try {
      await downloadVideo(taskId, video.original_filename);
      showToast.success('Download complete');
    } catch (err) {
      showApiError(err, 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="video-loading">
        <RefreshCw className="animate-spin text-ministry-text-secondary" size={24} />
        <span className="ml-2 text-ministry-text-secondary">Loading video information...</span>
      </div>
    );
  }

  // Upload in progress state
  if (uploading) {
    return (
      <div className="space-y-6" data-testid="video-uploading">
        <div className="bg-ministry-bg-tertiary border border-ministry-border-default rounded-ministry p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ministry-brand-primary/10 mb-4">
              <Upload className="text-ministry-brand-primary animate-pulse" size={32} />
            </div>
            <h3 className="text-lg font-medium text-ministry-text-primary mb-2">
              Uploading Video
            </h3>
            <p className="text-sm text-ministry-text-secondary mb-6">
              Please wait while your video is being uploaded...
            </p>
            <div className="max-w-md mx-auto">
              <Progress value={uploadProgress} className="h-2 mb-2" />
              <p className="text-sm text-ministry-text-muted">
                {uploadProgress}% complete
              </p>
            </div>
            <p className="text-xs text-ministry-text-muted mt-4">
              Do not close this page until the upload is complete
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No video state - show upload UI
  if (!video) {
    return (
      <div className="space-y-4" data-testid="video-empty-state">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          onChange={handleInputChange}
          className="hidden"
          data-testid="video-file-input"
        />

        {/* Drop zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-ministry p-10 text-center transition-colors duration-150
            ${dragActive 
              ? 'border-ministry-brand-primary bg-ministry-brand-primary/5' 
              : 'border-ministry-border-default bg-ministry-bg-tertiary hover:border-ministry-border-hover'
            }
            ${!canUpload ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => canUpload && fileInputRef.current?.click()}
          data-testid="video-drop-zone"
        >
          <div className="flex flex-col items-center">
            <div className={`
              inline-flex items-center justify-center w-14 h-14 rounded-full mb-4
              ${dragActive ? 'bg-ministry-brand-primary/20' : 'bg-ministry-bg-secondary'}
            `}>
              <Video className={dragActive ? 'text-ministry-brand-primary' : 'text-ministry-text-secondary'} size={28} />
            </div>
            
            <h3 className="text-base font-medium text-ministry-text-primary mb-1">
              {dragActive ? 'Drop video here' : 'Upload Video'}
            </h3>
            
            <p className="text-sm text-ministry-text-secondary mb-4">
              {isReadOnly 
                ? 'Video upload is disabled for finalized tasks'
                : 'Drag and drop your video here, or click to browse'
              }
            </p>

            {!isReadOnly && canUpload && (
              <>
                <Button
                  disabled={!canUpload}
                  className={`bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry mb-3 ${BUTTON_HEIGHT}`}
                  data-testid="upload-video-button"
                >
                  <Upload size={16} className="mr-2" />
                  Select Video
                </Button>

                <div className="text-xs text-ministry-text-muted">
                  <p>{getAllowedTypesText()} • {getSizeLimitText()}</p>
                </div>
              </>
            )}
          </div>

          {/* Drag overlay */}
          {dragActive && canUpload && (
            <div className="absolute inset-0 bg-ministry-brand-primary/10 rounded-ministry flex items-center justify-center">
              <div className="bg-white rounded-ministry p-4 shadow-lg">
                <Upload className="text-ministry-brand-primary mx-auto mb-2" size={24} />
                <p className="text-sm font-medium text-ministry-brand-primary">Release to upload</p>
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-ministry-status-error-bg border border-ministry-status-error-border rounded-ministry p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-ministry-status-rejected flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="text-sm text-ministry-status-rejected">{error}</p>
                {canUpload && (
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="link"
                    className="text-ministry-status-rejected p-0 h-auto text-sm mt-1"
                  >
                    Try again
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Info message */}
        <div className="bg-ministry-bg-secondary border border-ministry-border-default rounded-ministry p-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-ministry-brand-primary flex-shrink-0" size={16} />
            <p className="text-sm text-ministry-text-secondary">
              A video is required before this task can be published.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Video exists - show compact status and actions
  const statusConfig = VIDEO_STATUS_CONFIG[video.status] || VIDEO_STATUS_CONFIG[VIDEO_STATUS.PENDING];

  return (
    <div className="space-y-4" data-testid="video-details">
      {/* Hidden file input for replace */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-ministry-status-rejected" size={20} />
              Remove Video
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this video? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-ministry-bg-tertiary rounded-ministry p-3">
              <p className="text-sm text-ministry-text-secondary">
                <span className="font-medium">{video.original_filename}</span>
                <br />
                <span className="text-ministry-text-muted">{formatFileSize(video.file_size)}</span>
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              className={`rounded-ministry ${BUTTON_HEIGHT}`}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className={`bg-ministry-status-rejected hover:bg-red-700 text-white rounded-ministry ${BUTTON_HEIGHT}`}
            >
              <Trash2 size={16} className="mr-2" />
              Remove Video
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compact Status Header */}
      <div className={`p-4 rounded-ministry flex items-center justify-between ${
        isReady 
          ? 'bg-ministry-status-success-bg border border-ministry-status-success-border' 
          : isFailed 
            ? 'bg-ministry-status-error-bg border border-ministry-status-error-border'
            : isProcessing
              ? 'bg-ministry-status-warning-bg border border-ministry-status-warning-border'
              : 'bg-ministry-bg-tertiary border border-ministry-border-default'
      }`}>
        <div className="flex items-center gap-3">
          {/* Status Icon */}
          {isReady ? (
            <CheckCircle2 className="text-ministry-status-success flex-shrink-0" size={20} />
          ) : isFailed ? (
            <AlertCircle className="text-ministry-status-rejected flex-shrink-0" size={20} />
          ) : isProcessing ? (
            <RefreshCw className="text-ministry-status-review flex-shrink-0 animate-spin" size={20} />
          ) : (
            <Video className="text-ministry-text-secondary flex-shrink-0" size={20} />
          )}
          
          {/* Status Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge 
                className={`${statusConfig.color} text-white rounded text-xs px-2 py-0.5`} 
                data-testid="video-status-badge"
              >
                {statusConfig.label}
              </Badge>
              {isReady && (
                <span className="text-sm text-ministry-text-primary font-medium truncate" title={video.original_filename}>
                  {video.original_filename}
                </span>
              )}
              {isReady && video.file_size && (
                <span className="text-sm text-ministry-text-muted">
                  ({formatFileSize(video.file_size)})
                </span>
              )}
            </div>
            {/* Last updated timestamp */}
            {video.updated_at && (
              <p className="text-xs text-ministry-text-muted mt-0.5">
                Last updated: {formatTimestamp(video.updated_at)}
              </p>
            )}
          </div>
        </div>

        {/* Refresh button */}
        <Button 
          onClick={fetchVideo}
          variant="ghost"
          size="sm"
          disabled={loading}
          className="text-ministry-text-secondary h-8 w-8 p-0"
          data-testid="refresh-video-button"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Error Message for Failed Status */}
      {isFailed && video.error_message && (
        <div className="bg-ministry-status-error-bg border border-ministry-status-error-border rounded-ministry p-3">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-ministry-status-rejected flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ministry-status-rejected">{video.error_message}</p>
              {canUpload && (
                <Button
                  onClick={handleReplace}
                  disabled={actionsDisabled}
                  variant="link"
                  className="text-ministry-status-rejected p-0 h-auto text-sm mt-1"
                  data-testid="retry-upload-button"
                >
                  Retry upload
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Processing Message */}
      {isProcessing && (
        <div className="bg-ministry-status-warning-bg border border-ministry-status-warning-border rounded-ministry p-3">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-ministry-status-review animate-spin flex-shrink-0" />
            <p className="text-sm text-ministry-text-secondary">
              Video is being processed. This page will update automatically.
            </p>
          </div>
        </div>
      )}

      {/* Video Metadata (only show when ready or failed) */}
      {(isReady || isFailed) && (
        <div className="bg-ministry-bg-secondary border border-ministry-border-default rounded-ministry p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Filename */}
            <div className="flex items-start gap-2">
              <FileType size={16} className="text-ministry-text-muted mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-ministry-text-muted">Filename</p>
                <p className="text-sm text-ministry-text-primary truncate" title={video.original_filename} data-testid="video-filename">
                  {video.original_filename || 'Unknown'}
                </p>
              </div>
            </div>

            {/* File Size */}
            <div className="flex items-start gap-2">
              <HardDrive size={16} className="text-ministry-text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-ministry-text-muted">Size</p>
                <p className="text-sm text-ministry-text-primary" data-testid="video-size">
                  {formatFileSize(video.file_size)}
                </p>
              </div>
            </div>

            {/* Uploaded At */}
            <div className="flex items-start gap-2">
              <Clock size={16} className="text-ministry-text-muted mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-ministry-text-muted">Uploaded</p>
                <p className="text-sm text-ministry-text-primary" data-testid="video-uploaded-at">
                  {video.created_at ? format(new Date(video.created_at), 'MMM dd, yyyy HH:mm') : '—'}
                </p>
              </div>
            </div>

            {/* Uploaded By */}
            <div className="flex items-start gap-2">
              <User size={16} className="text-ministry-text-muted mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-ministry-text-muted">Uploaded by</p>
                <p className="text-sm text-ministry-text-primary truncate" data-testid="video-uploader">
                  {video.uploaded_by_name || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Status-based */}
      <div className="flex gap-2 flex-wrap">
        {/* READY: Download (primary), Replace, Remove */}
        {isReady && (
          <>
            {canDownload && (
              <Button 
                onClick={handleDownload}
                disabled={downloading || actionsDisabled}
                className={`bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry ${BUTTON_HEIGHT}`}
                data-testid="download-video-button"
              >
                {downloading ? (
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                ) : (
                  <Download size={16} className="mr-2" />
                )}
                {downloading ? 'Downloading...' : 'Download'}
              </Button>
            )}
            {canUpload && (
              <Button 
                onClick={handleReplace}
                disabled={actionsDisabled}
                variant="outline"
                className={`rounded-ministry ${BUTTON_HEIGHT}`}
                data-testid="replace-video-button"
              >
                <Upload size={16} className="mr-2" />
                Replace
              </Button>
            )}
            {canDelete && (
              <Button 
                onClick={() => setShowDeleteDialog(true)}
                disabled={actionsDisabled}
                variant="outline"
                className={`border-ministry-status-rejected text-ministry-status-rejected hover:bg-red-50 rounded-ministry ${BUTTON_HEIGHT}`}
                data-testid="delete-video-button"
              >
                <Trash2 size={16} className="mr-2" />
                Remove
              </Button>
            )}
          </>
        )}

        {/* PENDING: Upload */}
        {isPending && canUpload && (
          <Button 
            onClick={handleReplace}
            disabled={actionsDisabled}
            className={`bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry ${BUTTON_HEIGHT}`}
            data-testid="upload-video-button"
          >
            <Upload size={16} className="mr-2" />
            Upload Video
          </Button>
        )}

        {/* FAILED: Retry */}
        {isFailed && canUpload && (
          <Button 
            onClick={handleReplace}
            disabled={actionsDisabled}
            className={`bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry ${BUTTON_HEIGHT}`}
            data-testid="retry-video-button"
          >
            <RefreshCw size={16} className="mr-2" />
            Retry Upload
          </Button>
        )}

        {/* PROCESSING: Disabled state shown via actionsDisabled */}
        {isProcessing && (
          <Button 
            disabled
            variant="outline"
            className={`rounded-ministry ${BUTTON_HEIGHT}`}
          >
            <RefreshCw size={16} className="mr-2 animate-spin" />
            Processing...
          </Button>
        )}
      </div>

      {/* Read-only notice */}
      {isReadOnly && (
        <p className="text-xs text-ministry-text-muted">
          Video cannot be modified after a task is scheduled or published.
        </p>
      )}
    </div>
  );
}
