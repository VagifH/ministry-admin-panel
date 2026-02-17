import { useState, useEffect } from 'react';
import axios from 'axios';
import { CardSkeleton } from '../components/ui/loading';
import { ErrorState } from '../components/ui/empty-state';
import { showApiError } from '../lib/toast';
import { STATUS, getStatusTextColor, getStatusLabel, getStatusList } from '../utils/statusUtils';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats`);
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard stats');
      showApiError(err, 'Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { label: TASK_STATUS_CONFIG[TASK_STATUS.DRAFT].label, value: stats.draft, color: getStatusTextColor(TASK_STATUS.DRAFT) },
    { label: TASK_STATUS_CONFIG[TASK_STATUS.SUBMITTED].label, value: stats.submitted, color: getStatusTextColor(TASK_STATUS.SUBMITTED) },
    { label: TASK_STATUS_CONFIG[TASK_STATUS.IN_PROGRESS].label, value: stats.in_progress, color: getStatusTextColor(TASK_STATUS.IN_PROGRESS) },
    { label: TASK_STATUS_CONFIG[TASK_STATUS.READY_FOR_REVIEW].label, value: stats.ready_for_review, color: getStatusTextColor(TASK_STATUS.READY_FOR_REVIEW) },
    { label: TASK_STATUS_CONFIG[TASK_STATUS.CHANGES_REQUESTED].label, value: stats.changes_requested, color: getStatusTextColor(TASK_STATUS.CHANGES_REQUESTED) },
    { label: TASK_STATUS_CONFIG[TASK_STATUS.APPROVED].label, value: stats.approved, color: getStatusTextColor(TASK_STATUS.APPROVED) },
    { label: TASK_STATUS_CONFIG[TASK_STATUS.REJECTED].label, value: stats.rejected, color: getStatusTextColor(TASK_STATUS.REJECTED) },
    { label: TASK_STATUS_CONFIG[TASK_STATUS.SCHEDULED].label, value: stats.scheduled, color: getStatusTextColor(TASK_STATUS.SCHEDULED) },
    { label: TASK_STATUS_CONFIG[TASK_STATUS.PUBLISHED].label, value: stats.published, color: getStatusTextColor(TASK_STATUS.PUBLISHED) },
  ] : [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ministry-text-primary">Dashboard</h1>
        <p className="text-sm text-ministry-text-secondary mt-1">Overview of task statuses</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 9 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState description={error} onRetry={fetchStats} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                data-testid={`stat-card-${stat.label.toLowerCase()}`}
                className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default p-6 shadow-ministry-card"
              >
                <div className="text-sm text-ministry-text-secondary mb-1">{stat.label}</div>
                <div className={`text-3xl font-semibold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default p-6 shadow-ministry-card">
            <h2 className="text-lg font-semibold text-ministry-text-primary mb-2">Scheduled This Week</h2>
            <div className="text-3xl font-semibold text-ministry-status-scheduled">
              {stats?.scheduled_this_week || 0}
            </div>
            <p className="text-sm text-ministry-text-secondary mt-2">Tasks scheduled for publication this week</p>
          </div>
        </>
      )}
    </div>
  );
}
