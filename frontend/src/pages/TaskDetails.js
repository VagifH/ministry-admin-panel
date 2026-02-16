import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
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

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const statusColors = {
  Draft: 'bg-[#8a8886] text-white',
  Submitted: 'bg-[#0078d4] text-white',
  Producing: 'bg-[#8764b8] text-white',
  Review: 'bg-[#ffaa44] text-white',
  Scheduled: 'bg-[#107c10] text-white',
  Published: 'bg-[#498205] text-white',
  Rejected: 'bg-[#d13438] text-white',
};

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
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchTask();
    fetchComments();
    fetchAuditLogs();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks/${taskId}`);
      setTask(response.data);
      setEditedTask(response.data);
    } catch (error) {
      toast.error('Failed to load task');
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
      toast.error('Please fix the errors before saving');
      return;
    }

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
      toast.success('Task updated successfully');
      fetchTask();
      fetchAuditLogs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update task');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.patch(`${API_URL}/tasks/${taskId}/status`, { status: newStatus });
      toast.success(`Status changed to ${newStatus}`);
      fetchTask();
      fetchAuditLogs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change status');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await axios.post(`${API_URL}/tasks/${taskId}/comments`, { message: newComment });
      setNewComment('');
      fetchComments();
      fetchAuditLogs();
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const canEdit = () => {
    if (!task || !user) return false;
    if (user.role === 'Admin') return true;
    if (user.role === 'Approver') return false;
    if (user.role === 'Editor' && ['Scheduled', 'Published'].includes(task.status)) return false;
    return true;
  };

  const getAvailableStatusActions = () => {
    if (!task || !user) return [];
    
    const actions = [];
    
    if (user.role === 'Admin') {
      if (task.status === 'Draft') actions.push({ label: 'Submit', status: 'Submitted' });
      if (task.status === 'Submitted') actions.push({ label: 'Move to Producing', status: 'Producing' });
      if (task.status === 'Producing') actions.push({ label: 'Move to Review', status: 'Review' });
      if (task.status === 'Review') {
        actions.push({ label: 'Schedule', status: 'Scheduled' });
        actions.push({ label: 'Reject', status: 'Rejected' });
      }
      if (task.status === 'Rejected') actions.push({ label: 'Move to Draft', status: 'Draft' });
      if (task.status === 'Scheduled') actions.push({ label: 'Publish', status: 'Published' });
    } else if (user.role === 'Editor') {
      if (task.status === 'Draft') actions.push({ label: 'Submit', status: 'Submitted' });
    } else if (user.role === 'Approver') {
      if (task.status === 'Review') {
        actions.push({ label: 'Schedule', status: 'Scheduled' });
        actions.push({ label: 'Reject', status: 'Rejected' });
      }
    }
    
    return actions;
  };

  if (loading) {
    return <div className="p-8 text-[#605e5c]">Loading...</div>;
  }

  if (!task) {
    return <div className="p-8 text-[#605e5c]">Task not found</div>;
  }

  const isReadOnly = !canEdit();
  const statusActions = getAvailableStatusActions();

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/tasks')}
        data-testid="back-to-tasks-button"
        className="mb-4 text-[#605e5c] hover:bg-[#f3f2f1] rounded-lg"
      >
        <ArrowLeft size={16} className="mr-2" />
        Back to Tasks
      </Button>

      <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm">
        <div className="p-6 border-b border-[#e5e5e5] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold text-[#323130]">{task.title}</h1>
            <Badge className={`${statusColors[task.status]} rounded-md`} data-testid="task-status-badge">
              {task.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            {statusActions.map((action) => (
              <Button
                key={action.status}
                onClick={() => handleStatusChange(action.status)}
                data-testid={`status-action-${action.status.toLowerCase()}`}
                className="bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg"
                size="sm"
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="details" className="p-6">
          <TabsList className="bg-[#f3f2f1] rounded-lg">
            <TabsTrigger value="details" data-testid="tab-details" className="rounded-lg">Details</TabsTrigger>
            <TabsTrigger value="comments" data-testid="tab-comments" className="rounded-lg">Comments</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity" className="rounded-lg">Activity</TabsTrigger>
            <TabsTrigger value="video" data-testid="tab-video" className="rounded-lg">Video</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-6">
            {isReadOnly && (
              <div className="bg-[#fff4ce] border border-[#ffaa44] text-[#323130] p-3 rounded-lg text-sm">
                This task is read-only. {user?.role === 'Approver' ? 'Approvers cannot edit task fields.' : 'Tasks cannot be edited once Scheduled or Published.'}
              </div>
            )}

            <div>
              <Label className="text-[#323130]">Title *</Label>
              <Input
                value={editedTask.title}
                onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
                disabled={isReadOnly}
                data-testid="edit-task-title-input"
                className="mt-1 border-[#e5e5e5] rounded-lg"
              />
              {errors.title && <p className="text-xs text-[#d13438] mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#323130]">Content Type *</Label>
                <Select
                  value={editedTask.content_type}
                  onValueChange={(value) => setEditedTask({ ...editedTask, content_type: value })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="mt-1 border-[#e5e5e5] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Announcement">Announcement</SelectItem>
                    <SelectItem value="Short Lesson">Short Lesson</SelectItem>
                    <SelectItem value="Full Lesson">Full Lesson</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[#323130]">Avatar *</Label>
                <Select
                  value={editedTask.avatar}
                  onValueChange={(value) => setEditedTask({ ...editedTask, avatar: value })}
                  disabled={isReadOnly}
                >
                  <SelectTrigger className="mt-1 border-[#e5e5e5] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Avatar 1">Avatar 1</SelectItem>
                    <SelectItem value="Avatar 2">Avatar 2</SelectItem>
                    <SelectItem value="Avatar 3">Avatar 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-[#323130]">Script * (min 20 characters)</Label>
              <Textarea
                value={editedTask.script}
                onChange={(e) => setEditedTask({ ...editedTask, script: e.target.value })}
                disabled={isReadOnly}
                data-testid="edit-task-script-input"
                rows={8}
                className="mt-1 border-[#e5e5e5] rounded-lg"
              />
              {errors.script && <p className="text-xs text-[#d13438] mt-1">{errors.script}</p>}
            </div>

            <div>
              <Label className="text-[#323130]">Notes</Label>
              <Textarea
                value={editedTask.notes || ''}
                onChange={(e) => setEditedTask({ ...editedTask, notes: e.target.value })}
                disabled={isReadOnly}
                rows={4}
                className="mt-1 border-[#e5e5e5] rounded-lg"
              />
            </div>

            <div>
              <Label className="text-[#323130]">Publish Date & Time *</Label>
              <Input
                type="datetime-local"
                value={editedTask.publish_datetime ? new Date(editedTask.publish_datetime).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEditedTask({ ...editedTask, publish_datetime: e.target.value })}
                disabled={isReadOnly}
                data-testid="edit-task-publish-datetime-input"
                className="mt-1 border-[#e5e5e5] rounded-lg w-[320px] max-w-[340px] h-9 pr-3"
                style={{ colorScheme: 'light' }}
              />
            </div>

            {!isReadOnly && (
              <Button
                onClick={handleSaveTask}
                data-testid="save-task-button"
                className="bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg"
              >
                <Save size={16} className="mr-2" />
                Save Changes
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
                  className="border-[#e5e5e5] rounded-lg"
                />
                <Button
                  onClick={handleAddComment}
                  data-testid="submit-comment-button"
                  className="bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg"
                >
                  <Send size={16} />
                </Button>
              </div>

              {comments.length === 0 ? (
                <div className="text-center text-[#605e5c] py-8">No comments yet</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-[#f3f2f1] p-4 rounded-lg overflow-x-hidden" data-testid={`comment-${comment.id}`}>
                      <div className="flex justify-between items-start mb-2 min-w-0">
                        <span className="font-medium text-[#323130] min-w-0 flex-shrink-0">{comment.author_name}</span>
                        <span className="text-xs text-[#605e5c] flex-shrink-0 ml-2">
                          {format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')}
                        </span>
                      </div>
                      <p className="text-[#605e5c] min-w-0 w-full" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', whiteSpace: 'pre-wrap', maxWidth: '100%' }}>{comment.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            {auditLogs.length === 0 ? (
              <div className="text-center text-[#605e5c] py-8">No activity yet</div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-start py-3 border-b border-[#e5e5e5]" data-testid={`audit-log-${log.id}`}>
                    <div>
                      <p className="text-[#323130]">
                        <span className="font-medium">{log.actor_name}</span> {log.action.toLowerCase()} the task
                      </p>
                      {log.old_value && log.new_value && (
                        <p className="text-xs text-[#605e5c] mt-1">
                          {log.old_value} → {log.new_value}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-[#605e5c]">
                      {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="video" className="mt-6">
            <div className="text-center py-12 bg-[#f3f2f1] rounded-lg">
              <p className="text-[#605e5c] mb-4">No video uploaded yet</p>
              <Button disabled className="bg-[#8a8886] text-white rounded-lg" data-testid="upload-video-button">
                Upload Video (Coming in Phase 2)
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
