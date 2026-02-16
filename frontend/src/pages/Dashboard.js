import { useState, useEffect } from 'react';
import axios from 'axios';
import { CardSkeleton } from '../components/ui/loading';
import { ErrorState } from '../components/ui/empty-state';
import { showApiError } from '../lib/toast';

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
    { label: 'Draft', value: stats.draft, color: 'text-ministry-status-draft' },
    { label: 'Submitted', value: stats.submitted, color: 'text-ministry-status-submitted' },
    { label: 'Producing', value: stats.producing, color: 'text-ministry-status-producing' },
    { label: 'Review', value: stats.review, color: 'text-ministry-status-review' },
    { label: 'Scheduled', value: stats.scheduled, color: 'text-ministry-status-scheduled' },
    { label: 'Published', value: stats.published, color: 'text-ministry-status-published' },
    { label: 'Rejected', value: stats.rejected, color: 'text-ministry-status-rejected' },
  ] : [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ministry-text-primary">Dashboard</h1>
        <p className="text-sm text-ministry-text-secondary mt-1">Overview of task statuses</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 7 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState description={error} onRetry={fetchStats} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
