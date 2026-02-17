import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/ui/loading';
import { EmptyState, ErrorState } from '../components/ui/empty-state';
import { showToast, showApiError } from '../lib/toast';
import AvatarsSettings from '../components/AvatarsSettings';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Editor',
    is_active: true,
  });
  const [editUser, setEditUser] = useState({
    name: '',
    role: 'Editor',
    is_active: true,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (currentUser?.role !== 'Admin') {
      return;
    }
    fetchUsers();
  }, [currentUser]);

  const fetchUsers = async () => {
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (err) {
      setError('Failed to load users');
      showApiError(err, 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const validateNewUser = () => {
    const newErrors = {};
    if (!newUser.name.trim()) newErrors.name = 'Name is required';
    if (!newUser.email.trim()) newErrors.email = 'Email is required';
    if (!newUser.password.trim()) newErrors.password = 'Password is required';
    if (newUser.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateNewUser()) {
      showToast.error('Please fix the errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/users`, newUser);
      showToast.success('User created successfully');
      setShowCreateDialog(false);
      setNewUser({
        name: '',
        email: '',
        password: '',
        role: 'Editor',
        is_active: true,
      });
      setErrors({});
      fetchUsers();
    } catch (err) {
      showApiError(err, 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    setSubmitting(true);
    try {
      await axios.patch(`${API_URL}/users/${selectedUser.id}`, editUser);
      showToast.success('User updated successfully');
      setShowEditDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      showApiError(err, 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${API_URL}/users/${userId}`);
      showToast.success('User deleted successfully');
      fetchUsers();
    } catch (err) {
      showApiError(err, 'Failed to delete user');
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setEditUser({
      name: user.name,
      role: user.role,
      is_active: user.is_active,
    });
    setShowEditDialog(true);
  };

  const renderContent = () => {
    if (loading) {
      return <TableSkeleton rows={4} columns={5} />;
    }

    if (error) {
      return <ErrorState description={error} onRetry={fetchUsers} />;
    }

    if (users.length === 0) {
      return (
        <EmptyState
          title="No users yet"
          description="Get started by creating your first user"
          action={() => setShowCreateDialog(true)}
          actionLabel="Create User"
          data-testid="empty-users-state"
        />
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="border-ministry-border-default">
            <TableHead className="text-ministry-text-primary font-semibold">Name</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Email</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Role</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Status</TableHead>
            <TableHead className="text-ministry-text-primary font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} data-testid={`user-row-${user.id}`} className="border-ministry-border-default">
              <TableCell className="font-medium text-ministry-text-primary">{user.name}</TableCell>
              <TableCell className="text-ministry-text-secondary">{user.email}</TableCell>
              <TableCell className="text-ministry-text-secondary">{user.role}</TableCell>
              <TableCell>
                <Badge className={user.is_active ? 'bg-ministry-status-scheduled text-white rounded-md' : 'bg-ministry-status-draft text-white rounded-md'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(user)}
                    data-testid={`edit-user-${user.id}`}
                    className="text-ministry-brand-primary hover:bg-ministry-bg-tertiary rounded-ministry"
                  >
                    <Pencil size={16} />
                  </Button>
                  {user.id !== currentUser.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      data-testid={`delete-user-${user.id}`}
                      className="text-ministry-status-rejected hover:bg-ministry-bg-tertiary rounded-ministry"
                    >
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-8">
        <div className="bg-ministry-brand-light border border-ministry-status-review text-ministry-text-primary p-4 rounded-ministry">
          Access denied. Only Admins can access Settings.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ministry-text-primary">Settings</h1>
        <p className="text-sm text-ministry-text-secondary mt-1">Manage users and AI agents</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="bg-ministry-bg-tertiary rounded-ministry">
          <TabsTrigger value="users" data-testid="tab-users" className="rounded-ministry">Users</TabsTrigger>
          <TabsTrigger value="avatars" data-testid="tab-avatars" className="rounded-ministry">AI Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="flex items-center justify-between mb-4">
            <div />
            <Button
              onClick={() => setShowCreateDialog(true)}
              data-testid="create-user-button"
              className="bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry flex items-center gap-1.5"
            >
              <Plus size={16} />
              Create User
            </Button>
          </div>

          <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default shadow-ministry-card">
            {renderContent()}
          </div>
        </TabsContent>

        <TabsContent value="avatars">
          <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default shadow-ministry-card p-6">
            <h2 className="text-lg font-semibold text-ministry-text-primary mb-4">AI Agent Library</h2>
            <p className="text-sm text-ministry-text-secondary mb-6">
              Manage the photos for each AI agent. These will appear throughout the application when a task uses that agent.
            </p>
            <AvatarsSettings />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[560px] bg-ministry-bg-secondary rounded-ministry p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-semibold text-ministry-text-primary">Create New User</DialogTitle>
          </DialogHeader>
          
          <div className="px-6 pb-4 space-y-4">
            <div>
              <Label htmlFor="name" className="text-ministry-text-primary text-sm font-medium">Name *</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                data-testid="user-name-input"
                className="mt-1.5 h-9 border-ministry-border-default rounded-ministry"
              />
              {errors.name && <p className="text-xs text-ministry-status-error mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-ministry-text-primary text-sm font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                data-testid="user-email-input"
                className="mt-1.5 h-9 border-ministry-border-default rounded-ministry"
              />
              {errors.email && <p className="text-xs text-ministry-status-error mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="password" className="text-ministry-text-primary text-sm font-medium">Password * (min 8 characters)</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                data-testid="user-password-input"
                className="mt-1.5 h-9 border-ministry-border-default rounded-ministry"
              />
              {errors.password && <p className="text-xs text-ministry-status-error mt-1">{errors.password}</p>}
            </div>

            <div>
              <Label className="text-ministry-text-primary text-sm font-medium">Role *</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger className="mt-1.5 h-9 border-ministry-border-default rounded-ministry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Editor">Editor (Ministry)</SelectItem>
                  <SelectItem value="Producer">Producer (V Studio)</SelectItem>
                  <SelectItem value="Approver">Approver</SelectItem>
                </SelectContent>
              </Select>
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
              onClick={handleCreateUser}
              disabled={submitting}
              data-testid="submit-create-user-button"
              className="h-9 bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[560px] bg-ministry-bg-secondary rounded-ministry p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-semibold text-ministry-text-primary">Edit User</DialogTitle>
          </DialogHeader>
          
          <div className="px-6 pb-4 space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-ministry-text-primary text-sm font-medium">Name *</Label>
              <Input
                id="edit-name"
                value={editUser.name}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                data-testid="edit-user-name-input"
                className="mt-1.5 h-9 border-ministry-border-default rounded-ministry"
              />
            </div>

            <div>
              <Label className="text-ministry-text-primary text-sm font-medium">Role *</Label>
              <Select value={editUser.role} onValueChange={(value) => setEditUser({ ...editUser, role: value })}>
                <SelectTrigger className="mt-1.5 h-9 border-ministry-border-default rounded-ministry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Editor">Editor (Ministry)</SelectItem>
                  <SelectItem value="Producer">Producer (V Studio)</SelectItem>
                  <SelectItem value="Approver">Approver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-ministry-text-primary text-sm font-medium">Status *</Label>
              <Select value={editUser.is_active.toString()} onValueChange={(value) => setEditUser({ ...editUser, is_active: value === 'true' })}>
                <SelectTrigger className="mt-1.5 h-9 border-ministry-border-default rounded-ministry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-ministry-border-default flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={submitting}
              className="h-9 border-ministry-border-default rounded-ministry"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditUser}
              disabled={submitting}
              data-testid="submit-edit-user-button"
              className="h-9 bg-ministry-brand-primary hover:bg-ministry-brand-hover text-white rounded-ministry disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
