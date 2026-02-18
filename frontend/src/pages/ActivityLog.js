import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import { TableSkeleton } from '../components/ui/loading';
import { EmptyState, NoResultsState, ErrorState } from '../components/ui/empty-state';
import { showApiError } from '../lib/toast';

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
  const [error, setError] = useState(null);

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
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.actor_id) params.append('actor_id', filters.actor_id);
      if (filters.action) params.append('action', filters.action);

      const response = await axios.get(`${API_URL}/audit-logs?${params.toString()}`);
      setLogs(response.data);
    } catch (err) {
      setError('Failed to load activity logs');
      showApiError(err, 'Failed to load activity logs');
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

  const renderContent = () => {
    if (loading) {
      return <TableSkeleton rows={8} columns={5} />;
    }

    if (error) {
      return <ErrorState description={error} onRetry={fetchLogs} />;
    }

    if (logs.length === 0 && hasActiveFilters) {
      return <NoResultsState onClearFilters={clearFilters} data-testid="no-logs-results" />;
    }

    if (logs.length === 0) {
      return (
        <EmptyState
          title="No activity yet"
          description="Actions will appear here as users interact with the system"
          data-testid="empty-logs-state"
        />
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="border-ministry-border-subtle hover:bg-transparent">
            <TableHead className="text-ministry-text-secondary font-medium text-[13px]">User</TableHead>
            <TableHead className="text-ministry-text-secondary font-medium text-[13px]">Action</TableHead>
            <TableHead className="text-ministry-text-secondary font-medium text-[13px]">Object Type</TableHead>
            <TableHead className="text-ministry-text-secondary font-medium text-[13px]">Details</TableHead>
            <TableHead className="text-ministry-text-secondary font-medium text-[13px]">Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id} data-testid={`activity-log-${log.id}`} className="border-ministry-border-subtle hover:bg-ministry-bg-hover">
              <TableCell className="font-medium text-ministry-text-primary text-[13px]">{log.actor_name}</TableCell>
              <TableCell className="text-ministry-text-secondary text-[13px]">{log.action}</TableCell>
              <TableCell className="text-ministry-text-secondary text-[13px]">{log.object_type}</TableCell>
              <TableCell className="text-ministry-text-secondary text-[13px] max-w-xs truncate">
                {log.old_value && log.new_value ? (
                  <span>{log.old_value} → {log.new_value}</span>
                ) : log.new_value ? (
                  <span>{log.new_value}</span>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-ministry-text-muted text-[13px]">
                {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ministry-text-primary">Activity Log</h1>
        <p className="text-[13px] text-ministry-text-secondary mt-1">Audit trail of all actions</p>
      </div>

      <div className="bg-ministry-bg-surface rounded-ministry border border-ministry-border-subtle">
        <div className="p-4 border-b border-ministry-border-subtle">
          <div className="flex gap-4 items-center flex-wrap">
            {users.length > 0 && (
              <Select value={filters.actor_id || "all"} onValueChange={(value) => setFilters({ ...filters, actor_id: value === "all" ? "" : value })}>
                <SelectTrigger className="w-[200px] border-ministry-border-default rounded-ministry" data-testid="filter-user">
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
              <SelectTrigger className="w-[200px] border-ministry-border-default rounded-ministry" data-testid="filter-action">
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
                className="border-ministry-border-default rounded-ministry text-ministry-text-secondary hover:bg-ministry-bg-tertiary"
                size="sm"
              >
                <X size={16} className="mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
