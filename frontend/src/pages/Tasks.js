import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Plus, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { TableSkeleton } from '../components/ui/loading';
import { EmptyState, NoResultsState, ErrorState } from '../components/ui/empty-state';
import { showToast, showApiError } from '../lib/toast';
import { TASK_STATUS, TASK_STATUS_CONFIG, TASK_STATUS_LIST, getStatusBadgeClass, getStatusLabel } from '../config/statusConfig';
import { CONTENT_TYPE, CONTENT_TYPE_LIST } from '../config/contentTypeConfig';
import { AVATAR_LIST } from '../config/avatarConfig';
import { AvatarDisplay } from '../components/AvatarDisplay';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    content_type: '',
    avatar: '',
  });

  const [newTask, setNewTask] = useState({
    title: '',
    content_type: CONTENT_TYPE.ANNOUNCEMENT,
    avatar: 'Avatar 1',
    script: '',
    notes: '',
    publish_datetime: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchTasks();
  }, [filters.search, filters.status, filters.content_type, filters.avatar]);

  const fetchTasks = async () => {
    setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.content_type) params.append('content_type', filters.content_type);
      if (filters.avatar) params.append('avatar', filters.avatar);

      const response = await axios.get(`${API_URL}/tasks?${params.toString()}`);
      setTasks(response.data);
    } catch (err) {
      setError('Failed to load tasks');
      showApiError(err, 'Failed to load tasks');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      content_type: '',
      avatar: '',
    });
  };

  const validateTask = () => {
    const newErrors = {};
    if (!newTask.title.trim()) newErrors.title = 'Title is required';
    if (!newTask.script.trim()) newErrors.script = 'Script is required';
    if (newTask.script.trim().length < 20) newErrors.script = 'Script must be at least 20 characters';
    if (!newTask.publish_datetime) newErrors.publish_datetime = 'Publish date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTask = async () => {
    if (!validateTask()) {
      showToast.error('Please fix the errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/tasks`, newTask);
      showToast.success('Task created successfully');
      setShowCreateDialog(false);
      setNewTask({
        title: '',
        content_type: CONTENT_TYPE.ANNOUNCEMENT,
        avatar: 'Avatar 1',
        script: '',
        notes: '',
        publish_datetime: '',
      });
      setErrors({});
      fetchTasks();
    } catch (err) {
      showApiError(err, 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const canCreateTask = user?.role !== 'Approver';
  const hasActiveFilters = filters.search || filters.status || filters.content_type || filters.avatar;

  // Determine content state
  const renderContent = () => {
    if (loading) {
      return <TableSkeleton rows={5} columns={5} />;
    }

    if (error) {
      return <ErrorState description={error} onRetry={fetchTasks} />;
    }

    if (tasks.length === 0 && hasActiveFilters) {
      return <NoResultsState onClearFilters={clearFilters} data-testid="no-results-state" />;
    }

    if (tasks.length === 0) {
      return (
        <EmptyState
          title="No tasks yet"
          description="Get started by creating your first task"
          action={canCreateTask ? () => setShowCreateDialog(true) : undefined}
          actionLabel={canCreateTask ? "Create Task" : undefined}
          data-testid="empty-tasks-state"
        />
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="border-ministry-border-default">
            <TableHead className="text-ministry-text-primary font-semibold">Title</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Content Type</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Avatar</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Status</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Publish Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              data-testid={`task-row-${task.id}`}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="cursor-pointer hover:bg-ministry-bg-tertiary border-ministry-border-default"
            >
              <TableCell className="font-medium text-ministry-text-primary">{task.title}</TableCell>
              <TableCell className="text-ministry-text-secondary">{task.content_type}</TableCell>
              <TableCell>
                <AvatarDisplay avatarName={task.avatar} size={28} showLabel />
              </TableCell>
              <TableCell>
                <Badge className={`${getStatusBadgeClass(task.status)} rounded-md`}>
                  {getStatusLabel(task.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-ministry-text-secondary">
                {format(new Date(task.publish_datetime), 'MMM dd, yyyy HH:mm')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ministry-text-primary">Tasks</h1>
          <p className="text-sm text-ministry-text-secondary mt-1">Manage content tasks</p>
        </div>
        {canCreateTask && (
          <Button
            onClick={() => setShowCreateDialog(true)}
            data-testid="create-task-button"
            className="bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry flex items-center gap-1.5"
          >
            <Plus size={16} />
            Create Task
          </Button>
        )}
      </div>

      <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default shadow-ministry-card">
        <div className="p-4 border-b border-ministry-border-default">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ministry-text-secondary" size={16} />
                <Input
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  data-testid="search-tasks-input"
                  className="pl-10 border-ministry-border-default rounded-ministry"
                />
              </div>
            </div>
            <Select value={filters.status || "all"} onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}>
              <SelectTrigger className="w-[150px] border-ministry-border-default rounded-ministry" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {TASK_STATUS_LIST.map((status) => (
                  <SelectItem key={status} value={status}>
                    {TASK_STATUS_CONFIG[status]?.label || status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.content_type || "all"} onValueChange={(value) => setFilters({ ...filters, content_type: value === "all" ? "" : value })}>
              <SelectTrigger className="w-[180px] border-ministry-border-default rounded-ministry" data-testid="filter-content-type">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {CONTENT_TYPE_LIST.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.avatar || "all"} onValueChange={(value) => setFilters({ ...filters, avatar: value === "all" ? "" : value })}>
              <SelectTrigger className="w-[180px] border-ministry-border-default rounded-ministry" data-testid="filter-avatar">
                <SelectValue placeholder="Avatar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Avatars</SelectItem>
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
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                data-testid="clear-filters-button"
                className="border-ministry-border-default rounded-ministry text-ministry-text-secondary hover:bg-ministry-bg-tertiary"
                size="sm"
              >
                <X size={16} className="mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {fetching && !loading && (
          <div className="absolute inset-0 bg-ministry-bg-secondary/50 flex items-center justify-center">
            <div className="text-ministry-text-secondary">Updating...</div>
          </div>
        )}

        {renderContent()}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[760px] bg-ministry-bg-secondary rounded-ministry p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-semibold text-ministry-text-primary">Create New Task</DialogTitle>
          </DialogHeader>
          
          <div className="px-6 pb-4 space-y-4">
            <div>
              <Label htmlFor="title" className="text-ministry-text-primary text-sm font-medium">Title *</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                data-testid="task-title-input"
                className="mt-1.5 h-9 border-ministry-border-default rounded-ministry"
              />
              {errors.title && <p className="text-xs text-ministry-status-error mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-ministry-text-primary text-sm font-medium">Content Type *</Label>
                <Select value={newTask.content_type} onValueChange={(value) => setNewTask({ ...newTask, content_type: value })}>
                  <SelectTrigger className="mt-1.5 h-9 border-ministry-border-default rounded-ministry">
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
                <Label className="text-ministry-text-primary text-sm font-medium">Avatar *</Label>
                <Select value={newTask.avatar} onValueChange={(value) => setNewTask({ ...newTask, avatar: value })}>
                  <SelectTrigger className="mt-1.5 h-9 border-ministry-border-default rounded-ministry">
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
              <Label htmlFor="script" className="text-ministry-text-primary text-sm font-medium">Script * (min 20 characters)</Label>
              <Textarea
                id="script"
                value={newTask.script}
                onChange={(e) => setNewTask({ ...newTask, script: e.target.value })}
                data-testid="task-script-input"
                rows={5}
                className="mt-1.5 border-ministry-border-default rounded-ministry resize-none"
              />
              {errors.script && <p className="text-xs text-ministry-status-error mt-1">{errors.script}</p>}
            </div>

            <div>
              <Label htmlFor="notes" className="text-ministry-text-primary text-sm font-medium">Notes</Label>
              <Textarea
                id="notes"
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                rows={3}
                className="mt-1.5 border-ministry-border-default rounded-ministry resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="publish_datetime" className="text-ministry-text-primary text-sm font-medium">Publish Date & Time *</Label>
                <Input
                  id="publish_datetime"
                  type="datetime-local"
                  value={newTask.publish_datetime}
                  onChange={(e) => setNewTask({ ...newTask, publish_datetime: e.target.value })}
                  data-testid="task-publish-datetime-input"
                  className="mt-1.5 h-9 border-ministry-border-default rounded-ministry w-[320px] max-w-[340px] pr-3"
                  style={{ colorScheme: 'light' }}
                />
                {errors.publish_datetime && <p className="text-xs text-ministry-status-error mt-1">{errors.publish_datetime}</p>}
              </div>
              <div></div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-ministry-border-default flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setErrors({});
              }}
              disabled={submitting}
              className="h-9 border-ministry-border-default rounded-ministry"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={submitting}
              data-testid="submit-create-task-button"
              className="h-9 bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
