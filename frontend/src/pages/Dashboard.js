import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { label: 'Draft', value: stats.draft, color: '#8a8886' },
    { label: 'Submitted', value: stats.submitted, color: '#0078d4' },
    { label: 'Producing', value: stats.producing, color: '#8764b8' },
    { label: 'Review', value: stats.review, color: '#ffaa44' },
    { label: 'Scheduled', value: stats.scheduled, color: '#107c10' },
    { label: 'Published', value: stats.published, color: '#498205' },
    { label: 'Rejected', value: stats.rejected, color: '#d13438' },
  ] : [];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#323130]">Dashboard</h1>
        <p className="text-sm text-[#605e5c] mt-1">Overview of task statuses</p>
      </div>

      {loading ? (
        <div className="text-[#605e5c]">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat) => (
              <div
                key={stat.label}
                data-testid={`stat-card-${stat.label.toLowerCase()}`}
                className="bg-white rounded-lg border border-[#e5e5e5] p-6 shadow-sm"
              >
                <div className="text-sm text-[#605e5c] mb-1">{stat.label}</div>
                <div className="text-3xl font-semibold" style={{ color: stat.color }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-[#e5e5e5] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#323130] mb-2">Scheduled This Week</h2>
            <div className="text-3xl font-semibold text-[#107c10]">
              {stats?.scheduled_this_week || 0}
            </div>
            <p className="text-sm text-[#605e5c] mt-2">Tasks scheduled for publication this week</p>
          </div>
        </>
      )}
    </div>
  );
}
