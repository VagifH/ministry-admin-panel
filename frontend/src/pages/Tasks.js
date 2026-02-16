import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
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

export default function Tasks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    content_type: '',
    avatar: '',
  });

  const [newTask, setNewTask] = useState({
    title: '',
    content_type: 'Announcement',
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
    try {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.content_type) params.append('content_type', filters.content_type);
      if (filters.avatar) params.append('avatar', filters.avatar);

      const response = await axios.get(`${API_URL}/tasks?${params.toString()}`);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to load tasks');
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

  const hasActiveFilters = filters.search || filters.status || filters.content_type || filters.avatar;

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
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      await axios.post(`${API_URL}/tasks`, newTask);
      toast.success('Task created successfully');
      setShowCreateDialog(false);
      setNewTask({
        title: '',
        content_type: 'Announcement',
        avatar: 'Avatar 1',
        script: '',
        notes: '',
        publish_datetime: '',
      });
      setErrors({});
      fetchTasks();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create task');
    }
  };

  const canCreateTask = user?.role !== 'Approver';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#323130]">Tasks</h1>
          <p className="text-sm text-[#605e5c] mt-1">Manage content tasks</p>
        </div>
        {canCreateTask && (
          <Button
            onClick={() => setShowCreateDialog(true)}
            data-testid="create-task-button"
            className="bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg"
          >
            <Plus size={16} className="mr-2" />
            Create Task
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm">
        <div className="p-4 border-b border-[#e5e5e5]">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#605e5c]" size={16} />
                <Input
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  data-testid="search-tasks-input"
                  className="pl-10 border-[#e5e5e5] rounded-lg"
                />
              </div>
            </div>
            <Select value={filters.status || "all"} onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}>
              <SelectTrigger className="w-[150px] border-[#e5e5e5] rounded-lg" data-testid="filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Producing">Producing</SelectItem>
                <SelectItem value="Review">Review</SelectItem>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Published">Published</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.content_type || "all"} onValueChange={(value) => setFilters({ ...filters, content_type: value === "all" ? "" : value })}>
              <SelectTrigger className="w-[180px] border-[#e5e5e5] rounded-lg" data-testid="filter-content-type">
                <SelectValue placeholder="Content Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Announcement">Announcement</SelectItem>
                <SelectItem value="Short Lesson">Short Lesson</SelectItem>
                <SelectItem value="Full Lesson">Full Lesson</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.avatar || "all"} onValueChange={(value) => setFilters({ ...filters, avatar: value === "all" ? "" : value })}>
              <SelectTrigger className="w-[150px] border-[#e5e5e5] rounded-lg" data-testid="filter-avatar">
                <SelectValue placeholder="Avatar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Avatars</SelectItem>
                <SelectItem value="Avatar 1">Avatar 1</SelectItem>
                <SelectItem value="Avatar 2">Avatar 2</SelectItem>
                <SelectItem value="Avatar 3">Avatar 3</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                data-testid="clear-filters-button"
                className="border-[#e5e5e5] rounded-lg text-[#605e5c] hover:bg-[#f3f2f1]"
                size="sm"
              >
                <X size={16} className="mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#605e5c]">Loading...</div>
        ) : fetching ? (
          <div className="p-8 text-center text-[#605e5c]">Updating...</div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-[#605e5c]">No tasks found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#e5e5e5]">
                <TableHead className="text-[#323130] font-semibold">Title</TableHead>
                <TableHead className="text-[#323130] font-semibold">Content Type</TableHead>
                <TableHead className="text-[#323130] font-semibold">Avatar</TableHead>
                <TableHead className="text-[#323130] font-semibold">Status</TableHead>
                <TableHead className="text-[#323130] font-semibold">Publish Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow
                  key={task.id}
                  data-testid={`task-row-${task.id}`}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="cursor-pointer hover:bg-[#f3f2f1] border-[#e5e5e5]"
                >
                  <TableCell className="font-medium text-[#323130]">{task.title}</TableCell>
                  <TableCell className="text-[#605e5c]">{task.content_type}</TableCell>
                  <TableCell className="text-[#605e5c]">{task.avatar}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[task.status]} rounded-md`}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[#605e5c]">
                    {format(new Date(task.publish_datetime), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl bg-white rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#323130]">Create New Task</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title" className="text-[#323130]">Title *</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                data-testid="task-title-input"
                className="mt-1 border-[#e5e5e5] rounded-lg"
              />
              {errors.title && <p className="text-xs text-[#d13438] mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-[#323130]">Content Type *</Label>
                <Select value={newTask.content_type} onValueChange={(value) => setNewTask({ ...newTask, content_type: value })}>
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
                <Select value={newTask.avatar} onValueChange={(value) => setNewTask({ ...newTask, avatar: value })}>
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
              <Label htmlFor="script" className="text-[#323130]">Script * (min 20 characters)</Label>
              <Textarea
                id="script"
                value={newTask.script}
                onChange={(e) => setNewTask({ ...newTask, script: e.target.value })}
                data-testid="task-script-input"
                rows={5}
                className="mt-1 border-[#e5e5e5] rounded-lg"
              />
              {errors.script && <p className="text-xs text-[#d13438] mt-1">{errors.script}</p>}
            </div>

            <div>
              <Label htmlFor="notes" className="text-[#323130]">Notes</Label>
              <Textarea
                id="notes"
                value={newTask.notes}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                rows={3}
                className="mt-1 border-[#e5e5e5] rounded-lg"
              />
            </div>

            <div>
              <Label htmlFor="publish_datetime" className="text-[#323130]">Publish Date & Time *</Label>
              <Input
                id="publish_datetime"
                type="datetime-local"
                value={newTask.publish_datetime}
                onChange={(e) => setNewTask({ ...newTask, publish_datetime: e.target.value })}
                data-testid="task-publish-datetime-input"
                className="mt-1 border-[#e5e5e5] rounded-lg"
              />
              {errors.publish_datetime && <p className="text-xs text-[#d13438] mt-1">{errors.publish_datetime}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setErrors({});
              }}
              className="border-[#e5e5e5] rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              data-testid="submit-create-task-button"
              className="bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg"
            >
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
