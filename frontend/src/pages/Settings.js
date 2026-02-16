import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Settings() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
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
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
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
      toast.error('Please fix the errors before submitting');
      return;
    }

    try {
      await axios.post(`${API_URL}/users`, newUser);
      toast.success('User created successfully');
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
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleEditUser = async () => {
    try {
      await axios.patch(`${API_URL}/users/${selectedUser.id}`, editUser);
      toast.success('User updated successfully');
      setShowEditDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await axios.delete(`${API_URL}/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
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

  if (currentUser?.role !== 'Admin') {
    return (
      <div className="p-8">
        <div className="bg-[#fff4ce] border border-[#ffaa44] text-[#323130] p-4 rounded-lg">
          Access denied. Only Admins can access Settings.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#323130]">Settings</h1>
          <p className="text-sm text-[#605e5c] mt-1">Manage users and roles</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          data-testid="create-user-button"
          className="bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg"
        >
          <Plus size={16} className="mr-2" />
          Create User
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-[#605e5c]">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-[#605e5c]">No users found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#e5e5e5]">
                <TableHead className="text-[#323130] font-semibold">Name</TableHead>
                <TableHead className="text-[#323130] font-semibold">Email</TableHead>
                <TableHead className="text-[#323130] font-semibold">Role</TableHead>
                <TableHead className="text-[#323130] font-semibold">Status</TableHead>
                <TableHead className="text-[#323130] font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} data-testid={`user-row-${user.id}`} className="border-[#e5e5e5]">
                  <TableCell className="font-medium text-[#323130]">{user.name}</TableCell>
                  <TableCell className="text-[#605e5c]">{user.email}</TableCell>
                  <TableCell className="text-[#605e5c]">{user.role}</TableCell>
                  <TableCell>
                    <Badge className={user.is_active ? 'bg-[#107c10] text-white rounded-md' : 'bg-[#8a8886] text-white rounded-md'}>
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
                        className="text-[#0078d4] hover:bg-[#f3f2f1] rounded-lg"
                      >
                        <Pencil size={16} />
                      </Button>
                      {user.id !== currentUser.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          data-testid={`delete-user-${user.id}`}
                          className="text-[#d13438] hover:bg-[#f3f2f1] rounded-lg"
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
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-[560px] bg-white rounded-lg p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-semibold text-[#323130]">Create New User</DialogTitle>
          </DialogHeader>
          
          <div className="px-6 pb-4 space-y-4">
            <div>
              <Label htmlFor="name" className="text-[#323130] text-sm font-medium">Name *</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                data-testid="user-name-input"
                className="mt-1.5 h-9 border-[#e5e5e5] rounded-lg"
              />
              {errors.name && <p className="text-xs text-[#d13438] mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="text-[#323130] text-sm font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                data-testid="user-email-input"
                className="mt-1.5 h-9 border-[#e5e5e5] rounded-lg"
              />
              {errors.email && <p className="text-xs text-[#d13438] mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="password" className="text-[#323130] text-sm font-medium">Password * (min 8 characters)</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                data-testid="user-password-input"
                className="mt-1.5 h-9 border-[#e5e5e5] rounded-lg"
              />
              {errors.password && <p className="text-xs text-[#d13438] mt-1">{errors.password}</p>}
            </div>

            <div>
              <Label className="text-[#323130] text-sm font-medium">Role *</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger className="mt-1.5 h-9 border-[#e5e5e5] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Editor">Editor</SelectItem>
                  <SelectItem value="Approver">Approver</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-[#e5e5e5] flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setErrors({});
              }}
              className="h-9 border-[#e5e5e5] rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateUser}
              data-testid="submit-create-user-button"
              className="h-9 bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg"
            >
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-white rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-[#323130]">Edit User</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name" className="text-[#323130]">Name *</Label>
              <Input
                id="edit-name"
                value={editUser.name}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                data-testid="edit-user-name-input"
                className="mt-1 border-[#e5e5e5] rounded-lg"
              />
            </div>

            <div>
              <Label className="text-[#323130]">Role *</Label>
              <Select value={editUser.role} onValueChange={(value) => setEditUser({ ...editUser, role: value })}>
                <SelectTrigger className="mt-1 border-[#e5e5e5] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Editor">Editor</SelectItem>
                  <SelectItem value="Approver">Approver</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#323130]">Status *</Label>
              <Select value={editUser.is_active.toString()} onValueChange={(value) => setEditUser({ ...editUser, is_active: value === 'true' })}>
                <SelectTrigger className="mt-1 border-[#e5e5e5] rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="border-[#e5e5e5] rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditUser}
              data-testid="submit-edit-user-button"
              className="bg-[#0078d4] hover:bg-[#106ebe] text-white rounded-lg"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
