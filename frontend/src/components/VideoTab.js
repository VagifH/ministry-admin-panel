/**
 * VideoTab Component
 * Displays video status and metadata for a task
 * Phase 3: Connected to real state, no upload UI yet
 */

import { useState, useEffect } from 'react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Video, Clock, HardDrive, FileType, User, AlertCircle, RefreshCw } from 'lucide-react';
import { 
  getTaskVideo, 
  VIDEO_STATUS, 
  VIDEO_STATUS_CONFIG,
  formatFileSize,
  formatDuration 
} from '../services/videoService';
import { showApiError } from '../lib/toast';

export default function VideoTab({ taskId, taskStatus }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin text-ministry-text-secondary" size={24} />
        <span className="ml-2 text-ministry-text-secondary">Loading video information...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12 bg-ministry-bg-tertiary rounded-ministry">
        <AlertCircle className="mx-auto text-ministry-status-error mb-2" size={32} />
        <p className="text-ministry-status-error mb-4">{error}</p>
        <Button 
          onClick={fetchVideo}
          variant="outline"
          className="border-ministry-border-default rounded-ministry"
        >
          <RefreshCw size={16} className="mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // No video state
  if (!video) {
    const isReadOnly = ['Scheduled', 'Published'].includes(taskStatus);
    
    return (
      <div className="text-center py-12 bg-ministry-bg-tertiary rounded-ministry" data-testid="video-empty-state">
        <Video className="mx-auto text-ministry-text-secondary mb-4" size={48} />
        <p className="text-ministry-text-secondary mb-2">No video uploaded yet</p>
        <p className="text-sm text-ministry-text-muted mb-4">
          A video is required before this task can be published
        </p>
        <Button 
          disabled={isReadOnly}
          data-testid="upload-video-button"
          className="bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry disabled:opacity-50"
        >
          <Video size={16} className="mr-2" />
          {isReadOnly ? 'Upload Disabled (Task Finalized)' : 'Upload Video (Coming Soon)'}
        </Button>
        {isReadOnly && (
          <p className="text-xs text-ministry-text-muted mt-2">
            Videos cannot be modified after a task is scheduled or published
          </p>
        )}
      </div>
    );
  }

  // Video exists - show metadata
  const statusConfig = VIDEO_STATUS_CONFIG[video.status] || VIDEO_STATUS_CONFIG[VIDEO_STATUS.PENDING];
  const isReadOnly = ['Scheduled', 'Published'].includes(taskStatus);

  return (
    <div className="space-y-6" data-testid="video-details">
      {/* Status Banner */}
      <div className={`p-4 rounded-ministry ${
        video.status === VIDEO_STATUS.READY 
          ? 'bg-green-50 border border-green-200' 
          : video.status === VIDEO_STATUS.FAILED 
            ? 'bg-red-50 border border-red-200'
            : 'bg-ministry-bg-tertiary border border-ministry-border-default'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video size={24} className={
              video.status === VIDEO_STATUS.READY 
                ? 'text-ministry-status-published' 
                : video.status === VIDEO_STATUS.FAILED 
                  ? 'text-ministry-status-rejected'
                  : 'text-ministry-text-secondary'
            } />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-ministry-text-primary">Video Status</span>
                <Badge className={`${statusConfig.color} text-white rounded-md`}>
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
        {video.status === VIDEO_STATUS.FAILED && video.error_message && (
          <div className="mt-3 p-3 bg-red-100 rounded-ministry">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-ministry-status-rejected mt-0.5" />
              <p className="text-sm text-ministry-status-rejected">{video.error_message}</p>
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
      {!isReadOnly && (
        <div className="flex gap-3">
          <Button 
            variant="outline"
            disabled
            className="border-ministry-border-default rounded-ministry"
            data-testid="replace-video-button"
          >
            Replace Video (Coming Soon)
          </Button>
          <Button 
            variant="outline"
            disabled
            className="border-ministry-status-rejected text-ministry-status-rejected rounded-ministry"
            data-testid="delete-video-button"
          >
            Delete Video (Coming Soon)
          </Button>
        </div>
      )}
    </div>
  );
}
