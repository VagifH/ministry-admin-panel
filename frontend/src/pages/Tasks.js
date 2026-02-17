import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Plus, Search, X, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { TableSkeleton } from '../components/ui/loading';
import { EmptyState, NoResultsState, ErrorState } from '../components/ui/empty-state';
import { showToast, showApiError } from '../lib/toast';
import { STATUS_LIST, getStatusBadgeClass, getStatusLabel, getStatusList } from '../utils/statusUtils';
import { CONTENT_TYPE, CONTENT_TYPE_LIST } from '../config/contentTypeConfig';
import { AVATAR_LIST } from '../config/avatarConfig';
import { AvatarDisplay } from '../components/AvatarDisplay';
import { useAvatars } from '../context/AvatarContext';
import { canPerformAction, ACTIONS } from '../config/permissionsMatrix';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Tasks() {
  const { user } = useAuth();
  const { getActiveAvatars, getAvatarDisplayName } = useAvatars();
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
    archived: 'false', // 'false' | 'true' | 'all'
  });

  // Archive/Restore/Delete dialogs
  const [archiveDialog, setArchiveDialog] = useState({ open: false, task: null });
  const [restoreDialog, setRestoreDialog] = useState({ open: false, task: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, task: null });
  const [actionSubmitting, setActionSubmitting] = useState(false);

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
  }, [filters.search, filters.status, filters.content_type, filters.avatar, filters.archived]);

  const fetchTasks = async () => {
    setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.content_type) params.append('content_type', filters.content_type);
      if (filters.avatar) params.append('avatar', filters.avatar);
      params.append('archived', filters.archived);

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
      archived: 'false',
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

  // Editor and Admin can create tasks, Producer and Approver cannot
  const canCreateTask = canPerformAction(user, ACTIONS.CREATE_TASK);
  const canDeleteTask = canPerformAction(user, ACTIONS.DELETE_TASK);
  // Only Admin and Editor can view archived tasks
  const canViewArchived = user?.role === 'Admin' || user?.role === 'Editor';
  const hasActiveFilters = filters.search || filters.status || filters.content_type || filters.avatar || (canViewArchived && filters.archived !== 'false');

  // Archive handler
  const handleArchive = async () => {
    if (!archiveDialog.task) return;
    setActionSubmitting(true);
    try {
      await axios.patch(`${API_URL}/tasks/${archiveDialog.task.id}/archive`);
      showToast.success('Task archived successfully');
      setArchiveDialog({ open: false, task: null });
      fetchTasks();
    } catch (err) {
      showApiError(err, 'Failed to archive task');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Restore handler
  const handleRestore = async () => {
    if (!restoreDialog.task) return;
    setActionSubmitting(true);
    try {
      await axios.patch(`${API_URL}/tasks/${restoreDialog.task.id}/restore`);
      showToast.success('Task restored successfully');
      setRestoreDialog({ open: false, task: null });
      fetchTasks();
    } catch (err) {
      showApiError(err, 'Failed to restore task');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Permanent delete handler
  const handlePermanentDelete = async () => {
    if (!deleteDialog.task) return;
    setActionSubmitting(true);
    try {
      await axios.delete(`${API_URL}/tasks/${deleteDialog.task.id}`);
      showToast.success('Task permanently deleted');
      setDeleteDialog({ open: false, task: null });
      fetchTasks();
    } catch (err) {
      showApiError(err, 'Failed to delete task');
    } finally {
      setActionSubmitting(false);
    }
  };

  // Check if task has video (for delete button visibility)
  const [taskVideos, setTaskVideos] = useState({});
  
  useEffect(() => {
    // Fetch video status for archived tasks only
    const archivedTasks = tasks.filter(t => t.is_archived);
    archivedTasks.forEach(async (task) => {
      if (taskVideos[task.id] === undefined) {
        try {
          const response = await axios.get(`${API_URL}/tasks/${task.id}/video`);
          setTaskVideos(prev => ({ ...prev, [task.id]: !!response.data }));
        } catch {
          setTaskVideos(prev => ({ ...prev, [task.id]: false }));
        }
      }
    });
  }, [tasks]);

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
            <TableHead className="text-ministry-text-primary font-semibold">AI Agent</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Status</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Publish Date</TableHead>
            {canDeleteTask && <TableHead className="text-ministry-text-primary font-semibold w-[120px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow
              key={task.id}
              data-testid={`task-row-${task.id}`}
              onClick={() => navigate(`/tasks/${task.id}`)}
              className={`cursor-pointer hover:bg-ministry-bg-tertiary border-ministry-border-default ${task.is_archived ? 'opacity-70' : ''}`}
            >
              <TableCell className="font-medium text-ministry-text-primary">
                <div className="flex items-center gap-2">
                  {task.title}
                  {task.is_archived && (
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 bg-amber-50">
                      Archived
                    </Badge>
                  )}
                </div>
              </TableCell>
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
              {canDeleteTask && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    {!task.is_archived ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setArchiveDialog({ open: true, task })}
                        data-testid={`archive-task-${task.id}`}
                        className="h-8 w-8 p-0 text-ministry-text-secondary hover:text-amber-600"
                        title="Archive task"
                      >
                        <Archive size={16} />
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRestoreDialog({ open: true, task })}
                          data-testid={`restore-task-${task.id}`}
                          className="h-8 w-8 p-0 text-ministry-text-secondary hover:text-green-600"
                          title="Restore task"
                        >
                          <ArchiveRestore size={16} />
                        </Button>
                        {!taskVideos[task.id] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, task })}
                            data-testid={`delete-task-${task.id}`}
                            className="h-8 w-8 p-0 text-ministry-text-secondary hover:text-red-600"
                            title="Delete permanently"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              )}
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
          {/* Archive Filter Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={filters.archived === 'false' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, archived: 'false' })}
              data-testid="filter-active-tasks"
              className={filters.archived === 'false' 
                ? 'bg-ministry-brand-primary text-white' 
                : 'border-ministry-border-default text-ministry-text-secondary'}
            >
              Active
            </Button>
            <Button
              variant={filters.archived === 'true' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, archived: 'true' })}
              data-testid="filter-archived-tasks"
              className={filters.archived === 'true' 
                ? 'bg-amber-500 text-white hover:bg-amber-600' 
                : 'border-ministry-border-default text-ministry-text-secondary'}
            >
              <Archive size={14} className="mr-1" />
              Archived
            </Button>
            <Button
              variant={filters.archived === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilters({ ...filters, archived: 'all' })}
              data-testid="filter-all-tasks"
              className={filters.archived === 'all' 
                ? 'bg-ministry-brand-primary text-white' 
                : 'border-ministry-border-default text-ministry-text-secondary'}
            >
              All
            </Button>
          </div>

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
                {getStatusList().map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
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
                <SelectValue placeholder="AI Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All AI Agents</SelectItem>
                {AVATAR_LIST.map((avatar) => (
                  <SelectItem key={avatar} value={avatar}>
                    <div className="flex items-center gap-2">
                      <AvatarDisplay avatarName={avatar} size={20} />
                      <span>{getAvatarDisplayName(avatar)}</span>
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
                <Label className="text-ministry-text-primary text-sm font-medium">AI Agent *</Label>
                <Select value={newTask.avatar} onValueChange={(value) => setNewTask({ ...newTask, avatar: value })}>
                  <SelectTrigger className="mt-1.5 h-9 border-ministry-border-default rounded-ministry">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getActiveAvatars().map((avatar) => (
                      <SelectItem key={avatar.id} value={avatar.name}>
                        <div className="flex items-center gap-2">
                          <AvatarDisplay avatarName={avatar.name} size={20} />
                          <span>{avatar.display_name || avatar.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {/* Show inactive avatars as disabled with tooltip */}
                    {AVATAR_LIST.filter(name => !getActiveAvatars().find(a => a.name === name)).map((avatarName) => (
                      <SelectItem key={avatarName} value={avatarName} disabled title="Inactive">
                        <div className="flex items-center gap-2 opacity-50">
                          <AvatarDisplay avatarName={avatarName} size={20} />
                          <span>{getAvatarDisplayName(avatarName)} (Inactive)</span>
                        </div>
                      </SelectItem>
                    ))}
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

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveDialog.open} onOpenChange={(open) => !open && setArchiveDialog({ open: false, task: null })}>
        <DialogContent className="bg-ministry-bg-secondary border border-ministry-border-default rounded-ministry max-w-md">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl text-ministry-text-primary flex items-center gap-2">
              <Archive size={20} className="text-amber-500" />
              Archive Task
            </DialogTitle>
            <DialogDescription className="text-ministry-text-secondary mt-2">
              Are you sure you want to archive "{archiveDialog.task?.title}"?
              <br /><br />
              Archived tasks are read-only and won't appear in the active task list. You can restore them later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 py-4 border-t border-ministry-border-default flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setArchiveDialog({ open: false, task: null })}
              disabled={actionSubmitting}
              className="h-9 border-ministry-border-default rounded-ministry"
            >
              Cancel
            </Button>
            <Button
              onClick={handleArchive}
              disabled={actionSubmitting}
              data-testid="confirm-archive-button"
              className="h-9 bg-amber-500 hover:bg-amber-600 text-white rounded-ministry"
            >
              {actionSubmitting ? 'Archiving...' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialog.open} onOpenChange={(open) => !open && setRestoreDialog({ open: false, task: null })}>
        <DialogContent className="bg-ministry-bg-secondary border border-ministry-border-default rounded-ministry max-w-md">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl text-ministry-text-primary flex items-center gap-2">
              <ArchiveRestore size={20} className="text-green-500" />
              Restore Task
            </DialogTitle>
            <DialogDescription className="text-ministry-text-secondary mt-2">
              Are you sure you want to restore "{restoreDialog.task?.title}"?
              <br /><br />
              The task will be moved back to the active task list and can be edited again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 py-4 border-t border-ministry-border-default flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setRestoreDialog({ open: false, task: null })}
              disabled={actionSubmitting}
              className="h-9 border-ministry-border-default rounded-ministry"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestore}
              disabled={actionSubmitting}
              data-testid="confirm-restore-button"
              className="h-9 bg-green-500 hover:bg-green-600 text-white rounded-ministry"
            >
              {actionSubmitting ? 'Restoring...' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, task: null })}>
        <DialogContent className="bg-ministry-bg-secondary border border-ministry-border-default rounded-ministry max-w-md">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl text-ministry-text-primary flex items-center gap-2">
              <Trash2 size={20} className="text-red-500" />
              Permanently Delete Task
            </DialogTitle>
            <DialogDescription className="text-ministry-text-secondary mt-2">
              <span className="text-red-600 font-semibold">Warning: This action cannot be undone!</span>
              <br /><br />
              Are you sure you want to permanently delete "{deleteDialog.task?.title}"?
              <br /><br />
              All comments and history associated with this task will be lost forever.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 py-4 border-t border-ministry-border-default flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, task: null })}
              disabled={actionSubmitting}
              className="h-9 border-ministry-border-default rounded-ministry"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePermanentDelete}
              disabled={actionSubmitting}
              data-testid="confirm-delete-button"
              className="h-9 bg-red-600 hover:bg-red-700 text-white rounded-ministry"
            >
              {actionSubmitting ? 'Deleting...' : 'Delete Forever'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
