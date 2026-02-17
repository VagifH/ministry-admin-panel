/**
 * VideoTab Component
 * Full video upload UI with drag-drop, progress, and status management
 * Phase 4.2: Added download functionality
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { 
  Video, 
  Clock, 
  HardDrive, 
  FileType, 
  User, 
  AlertCircle, 
  RefreshCw,
  Upload,
  X,
  Trash2,
  CheckCircle2,
  Download
} from 'lucide-react';
import { 
  getTaskVideo, 
  uploadVideo,
  deleteVideo,
  downloadVideo,
  validateVideoFile,
  VIDEO_STATUS, 
  VIDEO_STATUS_CONFIG,
  VIDEO_CONFIG,
  formatFileSize,
  formatDuration 
} from '../services/videoService';
import { showToast, showApiError } from '../lib/toast';

export default function VideoTab({ taskId, taskStatus }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef(null);

  const isReadOnly = ['Scheduled', 'Published'].includes(taskStatus);
  const canModify = !isReadOnly && !uploading && !deleting;

  useEffect(() => {
    fetchVideo();
  }, [taskId]);

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
    if (!file || !canModify) return;

    // Validate file
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      showToast.error(validation.error);
      return;
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
      const errorMessage = err.response?.data?.detail || err.message || 'Upload failed';
      setError(errorMessage);
      showApiError(err, 'Failed to upload video');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [taskId, canModify]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canModify) return;
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, [canModify]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (!canModify) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [canModify, handleFileSelect]);

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDelete = async () => {
    if (!canModify || !video) return;

    if (!window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteVideo(taskId);
      setVideo(null);
      showToast.success('Video deleted successfully');
    } catch (err) {
      showApiError(err, 'Failed to delete video');
    } finally {
      setDeleting(false);
    }
  };

  const handleReplace = () => {
    if (canModify) {
      fileInputRef.current?.click();
    }
  };

  const handleDownload = async () => {
    if (!video || video.status !== VIDEO_STATUS.READY) return;

    setDownloading(true);
    try {
      await downloadVideo(taskId, video.original_filename);
      showToast.success('Download started');
    } catch (err) {
      showApiError(err, 'Failed to download video');
    } finally {
      setDownloading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
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
          </div>
        </div>
      </div>
    );
  }

  // No video state - show upload UI
  if (!video) {
    return (
      <div className="space-y-6" data-testid="video-empty-state">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4"
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
            relative border-2 border-dashed rounded-ministry p-12 text-center transition-all
            ${dragActive 
              ? 'border-ministry-brand-primary bg-ministry-brand-primary/5' 
              : 'border-ministry-border-default bg-ministry-bg-tertiary hover:border-ministry-border-hover'
            }
            ${!canModify ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => canModify && fileInputRef.current?.click()}
          data-testid="video-drop-zone"
        >
          <div className="flex flex-col items-center">
            <div className={`
              inline-flex items-center justify-center w-16 h-16 rounded-full mb-4
              ${dragActive ? 'bg-ministry-brand-primary/20' : 'bg-ministry-bg-secondary'}
            `}>
              <Video className={dragActive ? 'text-ministry-brand-primary' : 'text-ministry-text-secondary'} size={32} />
            </div>
            
            <h3 className="text-lg font-medium text-ministry-text-primary mb-2">
              {dragActive ? 'Drop video here' : 'Upload Video'}
            </h3>
            
            <p className="text-sm text-ministry-text-secondary mb-4">
              {isReadOnly 
                ? 'Video upload is disabled for finalized tasks'
                : 'Drag and drop your video here, or click to browse'
              }
            </p>

            {!isReadOnly && (
              <>
                <Button
                  disabled={!canModify}
                  className="bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry mb-4"
                  data-testid="upload-video-button"
                >
                  <Upload size={16} className="mr-2" />
                  Select Video
                </Button>

                <div className="text-xs text-ministry-text-muted space-y-1">
                  <p>Accepted format: MP4</p>
                  <p>Maximum size: {VIDEO_CONFIG.MAX_SIZE_MB}MB</p>
                </div>
              </>
            )}
          </div>

          {/* Drag overlay */}
          {dragActive && canModify && (
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
          <div className="bg-red-50 border border-red-200 rounded-ministry p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-ministry-status-rejected mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm text-ministry-status-rejected">{error}</p>
                <Button
                  onClick={() => setError(null)}
                  variant="link"
                  className="text-ministry-status-rejected p-0 h-auto text-sm"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Info message */}
        <div className="bg-ministry-bg-secondary border border-ministry-border-default rounded-ministry p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-ministry-brand-primary mt-0.5" size={20} />
            <p className="text-sm text-ministry-text-secondary">
              A video is required before this task can be published. Upload a video to continue.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Video exists - show metadata and actions
  const statusConfig = VIDEO_STATUS_CONFIG[video.status] || VIDEO_STATUS_CONFIG[VIDEO_STATUS.PENDING];
  const isReady = video.status === VIDEO_STATUS.READY;
  const isFailed = video.status === VIDEO_STATUS.FAILED;

  return (
    <div className="space-y-6" data-testid="video-details">
      {/* Hidden file input for replace */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Status Banner */}
      <div className={`p-4 rounded-ministry ${
        isReady 
          ? 'bg-ministry-status-success-bg border border-ministry-status-success-border' 
          : isFailed 
            ? 'bg-ministry-status-error-bg border border-ministry-status-error-border'
            : 'bg-ministry-bg-tertiary border border-ministry-border-default'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isReady ? (
              <CheckCircle2 className="text-ministry-status-success" size={24} />
            ) : isFailed ? (
              <AlertCircle className="text-ministry-status-rejected" size={24} />
            ) : (
              <Video className="text-ministry-text-secondary" size={24} />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-ministry-text-primary">Video Status</span>
                <Badge className={`${statusConfig.color} text-white rounded-md`} data-testid="video-status-badge">
                  {statusConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-ministry-text-secondary mt-1">
                {statusConfig.description}
              </p>
            </div>
          </div>
          <Button 
            onClick={fetchVideo}
            variant="ghost"
            size="sm"
            className="text-ministry-text-secondary"
            data-testid="refresh-video-button"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
        
        {/* Error message for failed videos */}
        {isFailed && video.error_message && (
          <div className="mt-3 p-3 bg-red-100 rounded-ministry">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-ministry-status-rejected mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-ministry-status-rejected">{video.error_message}</p>
                {canModify && (
                  <Button
                    onClick={handleReplace}
                    variant="link"
                    className="text-ministry-status-rejected p-0 h-auto text-sm mt-1"
                    data-testid="retry-upload-button"
                  >
                    Try again
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Video Metadata */}
      <div className="bg-ministry-bg-secondary border border-ministry-border-default rounded-ministry p-6">
        <h3 className="font-medium text-ministry-text-primary mb-4">Video Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Filename */}
          <div className="flex items-start gap-3">
            <FileType size={20} className="text-ministry-text-secondary mt-0.5" />
            <div>
              <p className="text-sm text-ministry-text-muted">Filename</p>
              <p className="text-ministry-text-primary" data-testid="video-filename">
                {video.original_filename || 'Unknown'}
              </p>
            </div>
          </div>

          {/* File Size */}
          <div className="flex items-start gap-3">
            <HardDrive size={20} className="text-ministry-text-secondary mt-0.5" />
            <div>
              <p className="text-sm text-ministry-text-muted">File Size</p>
              <p className="text-ministry-text-primary" data-testid="video-size">
                {formatFileSize(video.file_size)}
              </p>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-ministry-text-secondary mt-0.5" />
            <div>
              <p className="text-sm text-ministry-text-muted">Duration</p>
              <p className="text-ministry-text-primary" data-testid="video-duration">
                {formatDuration(video.duration)}
              </p>
            </div>
          </div>

          {/* Uploaded By */}
          <div className="flex items-start gap-3">
            <User size={20} className="text-ministry-text-secondary mt-0.5" />
            <div>
              <p className="text-sm text-ministry-text-muted">Uploaded By</p>
              <p className="text-ministry-text-primary" data-testid="video-uploader">
                {video.uploaded_by_name}
              </p>
            </div>
          </div>
        </div>

        {/* MIME Type */}
        {video.mime_type && (
          <div className="mt-4 pt-4 border-t border-ministry-border-default">
            <p className="text-sm text-ministry-text-muted">
              Type: <span className="text-ministry-text-secondary">{video.mime_type}</span>
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        {/* Download - always available when video is ready */}
        {isReady && (
          <Button 
            onClick={handleDownload}
            disabled={downloading}
            variant="outline"
            className="border-ministry-brand-primary text-ministry-brand-primary hover:bg-ministry-brand-primary/5 rounded-ministry"
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

        {/* Replace and Delete - only for non-finalized tasks */}
        {!isReadOnly && (
          <>
            <Button 
              onClick={handleReplace}
              disabled={!canModify}
              variant="outline"
              className="border-ministry-border-default rounded-ministry"
              data-testid="replace-video-button"
            >
              <Upload size={16} className="mr-2" />
              Replace Video
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={!canModify}
              variant="outline"
              className="border-ministry-status-rejected text-ministry-status-rejected hover:bg-red-50 rounded-ministry"
              data-testid="delete-video-button"
            >
              {deleting ? (
                <RefreshCw size={16} className="mr-2 animate-spin" />
              ) : (
                <Trash2 size={16} className="mr-2" />
              )}
              {deleting ? 'Deleting...' : 'Remove Video'}
            </Button>
          </>
        )}
      </div>

      {isReadOnly && (
        <div className="text-sm text-ministry-text-muted">
          Video cannot be modified after a task is scheduled or published.
        </div>
      )}
    </div>
  );
}
