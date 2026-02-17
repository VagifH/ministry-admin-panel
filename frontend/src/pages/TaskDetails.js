import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { DetailSkeleton } from '../components/ui/loading';
import { ErrorState } from '../components/ui/empty-state';
import { showToast, showApiError } from '../lib/toast';
import VideoTab from '../components/VideoTab';
import { 
  STATUS,
  getStatusBadgeClass, 
  getStatusLabel,
  isReadOnlyStatus,
  getAvailableTransitions,
  validateTransition,
  canEditInStatus
} from '../utils/statusUtils';
import { CONTENT_TYPE_LIST } from '../config/contentTypeConfig';
import { AVATAR_LIST } from '../config/avatarConfig';
import { AvatarDisplay } from '../components/AvatarDisplay';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function TaskDetails() {
  const { taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [editedTask, setEditedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchTask();
    fetchComments();
    fetchAuditLogs();
  }, [taskId]);

  const fetchTask = async () => {
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/tasks/${taskId}`);
      setTask(response.data);
      setEditedTask(response.data);
    } catch (err) {
      setError('Failed to load task');
      showApiError(err, 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks/${taskId}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await axios.get(`${API_URL}/audit-logs`);
      const taskLogs = response.data.filter(log => log.object_id === taskId);
      setAuditLogs(taskLogs);
    } catch (error) {
      console.error('Failed to load audit logs', error);
    }
  };

  const validateTask = () => {
    const newErrors = {};
    if (!editedTask.title?.trim()) newErrors.title = 'Title is required';
    if (!editedTask.script?.trim()) newErrors.script = 'Script is required';
    if (editedTask.script?.trim().length < 20) newErrors.script = 'Script must be at least 20 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveTask = async () => {
    if (!validateTask()) {
      showToast.error('Please fix the errors before saving');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        title: editedTask.title,
        content_type: editedTask.content_type,
        avatar: editedTask.avatar,
        script: editedTask.script,
        notes: editedTask.notes,
        publish_datetime: editedTask.publish_datetime,
      };
      await axios.patch(`${API_URL}/tasks/${taskId}`, updateData);
      showToast.success('Task updated successfully');
      fetchTask();
      fetchAuditLogs();
    } catch (err) {
      showApiError(err, 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    // Validate transition on frontend before making API call
    const validation = validateTransition(task.status, newStatus, user.role);
    if (!validation.valid) {
      showToast.error(validation.error);
      return;
    }
    
    setSaving(true);
    try {
      await axios.patch(`${API_URL}/tasks/${taskId}/status`, { status: newStatus });
      showToast.success(`Status changed to ${newStatus}`);
      fetchTask();
      fetchAuditLogs();
    } catch (err) {
      showApiError(err, 'Failed to change status');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await axios.post(`${API_URL}/tasks/${taskId}/comments`, { message: newComment });
      setNewComment('');
      fetchComments();
      fetchAuditLogs();
      showToast.success('Comment added');
    } catch (err) {
      showApiError(err, 'Failed to add comment');
    }
  };

  const canEdit = () => {
    if (!task || !user) return false;
    return canEditInStatus(task.status, user.role);
  };

  const getAvailableStatusActions = () => {
    if (!task || !user) return [];
    
    const transitions = getAvailableTransitions(task.status, user.role);
    return transitions.map(t => ({ label: t.label, status: t.target }));
  };

  if (loading) {
    return (
      <div className="p-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/tasks')}
          className="mb-4 text-ministry-text-secondary hover:bg-ministry-bg-tertiary rounded-ministry"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Tasks
        </Button>
        <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default shadow-ministry-card p-6">
          <DetailSkeleton />
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/tasks')}
          className="mb-4 text-ministry-text-secondary hover:bg-ministry-bg-tertiary rounded-ministry"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Tasks
        </Button>
        <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default shadow-ministry-card">
          <ErrorState 
            title="Task not found" 
            description={error || "The task you're looking for doesn't exist or was deleted"} 
            onRetry={fetchTask}
          />
        </div>
      </div>
    );
  }

  const isReadOnly = !canEdit();
  const statusActions = getAvailableStatusActions();

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/tasks')}
        data-testid="back-to-tasks-button"
        className="mb-4 text-ministry-text-secondary hover:bg-ministry-bg-tertiary rounded-ministry"
      >
        <ArrowLeft size={16} className="mr-2" />
        Back to Tasks
      </Button>

      <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default shadow-ministry-card">
        <div className="p-6 border-b border-ministry-border-default">
          {/* Header Row: Avatar, Title, Status Badge */}
          <div className="flex items-start gap-4">
            <AvatarDisplay avatarName={task.avatar} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-semibold text-ministry-text-primary leading-tight">{task.title}</h1>
                <Badge className={`${getStatusBadgeClass(task.status)} rounded-md px-2.5 py-0.5 text-xs font-medium`} data-testid="task-status-badge">
                  {getStatusLabel(task.status)}
                </Badge>
              </div>
              <span className="text-sm text-ministry-text-secondary mt-0.5 block">{task.avatar}</span>
              
              {/* Action Buttons - Fluent Enterprise Standard */}
              {statusActions.length > 0 && (
                <div className="flex items-center gap-2 mt-3" data-testid="task-action-bar">
                  {statusActions.map((action) => {
                    const isApprove = action.status === TASK_STATUS.APPROVED;
                    const isReject = action.status === TASK_STATUS.REJECTED;
                    const isChanges = action.status === TASK_STATUS.CHANGES_REQUESTED;
                    
                    // Button hierarchy: Primary (Approve) > Secondary (Changes/Default) > Danger-Outline (Reject)
                    let buttonClass = '';
                    
                    if (isApprove) {
                      // Primary action - strongest visual weight
                      buttonClass = 'bg-ministry-status-approved hover:bg-ministry-status-approved/90 text-white shadow-ministry-sm';
                    } else if (isReject) {
                      // Danger outline - does NOT dominate visually
                      buttonClass = 'bg-transparent border border-ministry-status-rejected text-ministry-status-rejected hover:bg-ministry-status-rejected/10';
                    } else if (isChanges) {
                      // Secondary action - medium weight
                      buttonClass = 'bg-ministry-bg-tertiary border border-ministry-border-default text-ministry-text-primary hover:bg-ministry-border-default';
                    } else {
                      // Default action (Submit, Schedule, Publish, etc.)
                      buttonClass = 'bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white shadow-ministry-sm';
                    }
                    
                    return (
                      <button
                        key={action.status}
                        onClick={() => handleStatusChange(action.status)}
                        disabled={saving}
                        data-testid={`status-action-${action.status.toLowerCase()}`}
                        className={`
                          ${buttonClass}
                          h-8 px-3 
                          text-ministry-sm font-medium leading-none
                          rounded-[6px]
                          transition-colors duration-150
                          focus:outline-none focus:ring-2 focus:ring-ministry-brand-primary/40 focus:ring-offset-1
                          active:scale-[0.98]
                          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
                        `}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="details" className="p-6">
          <TabsList className="bg-ministry-bg-tertiary rounded-ministry">
            <TabsTrigger value="details" data-testid="tab-details" className="rounded-ministry">Details</TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments" className="rounded-ministry">Comments</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity" className="rounded-ministry">Activity</TabsTrigger>
            <TabsTrigger value="video" data-testid="tab-video" className="rounded-ministry">Video</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-6">
            {isReadOnly && (
              <div className="bg-ministry-brand-light border border-ministry-status-review text-ministry-text-primary p-3 rounded-ministry text-sm">
                This task is read-only. {user?.role === 'Approver' ? 'Approvers cannot edit task fields.' : `Tasks cannot be edited once ${TASK_STATUS.SCHEDULED} or ${TASK_STATUS.PUBLISHED}.`}
              </div>
            )}

            <div>
              <Label className="text-ministry-text-primary">Title *</Label>
              <Input
                value={editedTask.title}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                disabled={isReadOnly}
                data-testid="edit-task-title-input"
                className="mt-1 border-ministry-border-default rounded-ministry"
              />
              {errors.title && <p className="text-xs text-ministry-status-error mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-ministry-text-primary">Content Type *</Label>
                <Select
                  value={editedTask.content_type}
                  onValueChange={(value) => setEditedTask({ ...editedTask, content_type: value })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="mt-1 border-ministry-border-default rounded-ministry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPE_LIST.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-ministry-text-primary">Avatar *</Label>
                <Select
                  value={editedTask.avatar}
                  onValueChange={(value) => setEditedTask({ ...editedTask, avatar: value })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="mt-1 border-ministry-border-default rounded-ministry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AVATAR_LIST.map((avatar) => (
                      <SelectItem key={avatar} value={avatar}>
                        <div className="flex items-center gap-2">
                          <AvatarDisplay avatarName={avatar} size={20} />
                          <span>{avatar}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-ministry-text-primary">Script * (min 20 characters)</Label>
              <Textarea
                value={editedTask.script}
                onChange={(e) => setEditedTask({ ...editedTask, script: e.target.value })}
                disabled={isReadOnly}
                data-testid="edit-task-script-input"
                rows={8}
                className="mt-1 border-ministry-border-default rounded-ministry"
              />
              {errors.script && <p className="text-xs text-ministry-status-error mt-1">{errors.script}</p>}
            </div>

            <div>
              <Label className="text-ministry-text-primary">Notes</Label>
              <Textarea
                value={editedTask.notes || ''}
                onChange={(e) => setEditedTask({ ...editedTask, notes: e.target.value })}
                disabled={isReadOnly}
                rows={4}
                className="mt-1 border-ministry-border-default rounded-ministry"
              />
            </div>

            <div>
              <Label className="text-ministry-text-primary">Publish Date & Time *</Label>
              <Input
                type="datetime-local"
                value={editedTask.publish_datetime ? new Date(editedTask.publish_datetime).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEditedTask({ ...editedTask, publish_datetime: e.target.value })}
                disabled={isReadOnly}
                data-testid="edit-task-publish-datetime-input"
                className="mt-1 border-ministry-border-default rounded-ministry w-[320px] max-w-[340px] h-9 pr-3"
                style={{ colorScheme: 'light' }}
              />
            </div>

            {!isReadOnly && (
              <Button
                onClick={handleSaveTask}
                disabled={saving}
                data-testid="save-task-button"
                className="bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry disabled:opacity-50"
              >
                <Save size={16} className="mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </TabsContent>

          <TabsContent value="comments" className="mt-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  data-testid="add-comment-input"
                  className="border-ministry-border-default rounded-ministry"
                />
                <Button
                  onClick={handleAddComment}
                  data-testid="submit-comment-button"
                  className="bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry"
                >
                  <Send size={16} />
                </Button>
              </div>

              {comments.length === 0 ? (
                <div className="text-center text-ministry-text-secondary py-8">No comments yet</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-ministry-bg-tertiary p-4 rounded-ministry overflow-x-hidden" data-testid={`comment-${comment.id}`}>
                      <div className="flex justify-between items-start mb-2 min-w-0">
                        <span className="font-medium text-ministry-text-primary min-w-0 flex-shrink-0">{comment.author_name}</span>
                        <span className="text-xs text-ministry-text-secondary flex-shrink-0 ml-2">
                          {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-ministry-text-secondary min-w-0 w-full" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'pre-wrap', maxWidth: '100%' }}>{comment.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            {auditLogs.length === 0 ? (
              <div className="text-center text-ministry-text-secondary py-8">No activity yet</div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-start py-3 border-b border-ministry-border-default" data-testid={`audit-log-${log.id}`}>
                    <div>
                      <p className="text-ministry-text-primary">
                        <span className="font-medium">{log.actor_name}</span> {log.action.toLowerCase()} the task
                      </p>
                      {log.old_value && log.new_value && (
                        <p className="text-xs text-ministry-text-secondary mt-1">
                          {log.old_value} → {log.new_value}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-ministry-text-secondary">
                      {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="video" className="mt-6">
            <VideoTab taskId={taskId} taskStatus={task?.status} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
