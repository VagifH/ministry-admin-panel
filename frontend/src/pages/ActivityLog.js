import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { X } from 'lucide-react';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    actor_id: '',
    action: '',
  });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters.actor_id, filters.action]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/users`);
      setUsers(response.data);
    } catch (error) {
      // User might not have permission
    }
  };

  const fetchLogs = async () => {
    setFetching(true);
    try {
      const params = new URLSearchParams();
      if (filters.actor_id) params.append('actor_id', filters.actor_id);
      if (filters.action) params.append('action', filters.action);

      const response = await axios.get(`${API_URL}/audit-logs?${params.toString()}`);
      setLogs(response.data);
    } catch (error) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
      setFetching(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      actor_id: '',
      action: '',
    });
  };

  const hasActiveFilters = filters.actor_id || filters.action;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#323130]">Activity Log</h1>
        <p className="text-sm text-[#605e5c] mt-1">Audit trail of all actions</p>
      </div>

      <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm">
        <div className="p-4 border-b border-[#e5e5e5]">
          <div className="flex gap-4 items-center flex-wrap">
            {users.length > 0 && (
              <Select value={filters.actor_id || "all"} onValueChange={(value) => setFilters({ ...filters, actor_id: value === "all" ? "" : value })}>
                <SelectTrigger className="w-[200px] border-[#e5e5e5] rounded-lg" data-testid="filter-user">
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filters.action || "all"} onValueChange={(value) => setFilters({ ...filters, action: value === "all" ? "" : value })}>
              <SelectTrigger className="w-[200px] border-[#e5e5e5] rounded-lg" data-testid="filter-action">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="CREATE">CREATE</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="STATUS_CHANGE">STATUS_CHANGE</SelectItem>
                <SelectItem value="COMMENT">COMMENT</SelectItem>
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
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-[#605e5c]">No activity logs found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-[#e5e5e5]">
                <TableHead className="text-[#323130] font-semibold">User</TableHead>
                <TableHead className="text-[#323130] font-semibold">Action</TableHead>
                <TableHead className="text-[#323130] font-semibold">Object Type</TableHead>
                <TableHead className="text-[#323130] font-semibold">Details</TableHead>
                <TableHead className="text-[#323130] font-semibold">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} data-testid={`activity-log-${log.id}`} className="border-[#e5e5e5]">
                  <TableCell className="font-medium text-[#323130]">{log.actor_name}</TableCell>
                  <TableCell className="text-[#605e5c]">{log.action}</TableCell>
                  <TableCell className="text-[#605e5c]">{log.object_type}</TableCell>
                  <TableCell className="text-[#605e5c] max-w-xs truncate">
                    {log.old_value && log.new_value ? (
                      <span>{log.old_value} → {log.new_value}</span>
                    ) : log.new_value ? (
                      <span>{log.new_value}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-[#605e5c]">
                    {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
