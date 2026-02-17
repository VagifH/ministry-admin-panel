import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { CardSkeleton } from '../components/ui/loading';
import { ErrorState } from '../components/ui/empty-state';
import { showApiError } from '../lib/toast';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const statusColors = {
  Draft: 'bg-ministry-status-draft text-white',
  Submitted: 'bg-ministry-status-submitted text-white',
  Producing: 'bg-ministry-status-producing text-white',
  Review: 'bg-ministry-status-review text-white',
  Scheduled: 'bg-ministry-status-scheduled text-white',
  Published: 'bg-ministry-status-published text-white',
  Rejected: 'bg-ministry-status-rejected text-white',
};

export default function Calendar() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data);
    } catch (err) {
      setError('Failed to load calendar data');
      showApiError(err, 'Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.publish_datetime);
      return isSameDay(taskDate, date);
    });
  };

  const getMonthDays = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const handlePrevious = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const days = view === 'month' ? getMonthDays() : getWeekDays();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ministry-text-primary">Calendar</h1>
          <p className="text-sm text-ministry-text-secondary mt-1">View tasks by publish date</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            onClick={() => setView('month')}
            data-testid="calendar-month-view-button"
            className={view === 'month' ? 'bg-ministry-brand-primary text-white rounded-ministry' : 'border-ministry-border-default rounded-ministry'}
            size="sm"
          >
            Month
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            onClick={() => setView('week')}
            data-testid="calendar-week-view-button"
            className={view === 'week' ? 'bg-ministry-brand-primary text-white rounded-ministry' : 'border-ministry-border-default rounded-ministry'}
            size="sm"
          >
            Week
          </Button>
        </div>
      </div>

      <div className="bg-ministry-bg-secondary rounded-ministry border border-ministry-border-default shadow-ministry-card">
        <div className="p-4 border-b border-ministry-border-default flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ministry-text-primary">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleToday}
              data-testid="calendar-today-button"
              className="border-ministry-border-default rounded-ministry"
              size="sm"
            >
              Today
            </Button>
            <Button
              variant="outline"
              onClick={handlePrevious}
              data-testid="calendar-previous-button"
              className="border-ministry-border-default rounded-ministry"
              size="sm"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              onClick={handleNext}
              data-testid="calendar-next-button"
              className="border-ministry-border-default rounded-ministry"
              size="sm"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState description={error} onRetry={fetchTasks} />
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-ministry-text-secondary py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dayTasks = getTasksForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());
                const maxVisible = 2;
                const visibleTasks = dayTasks.slice(0, maxVisible);
                const remainingCount = dayTasks.length - maxVisible;

                return (
                  <div
                    key={index}
                    data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    className={`h-[100px] p-2 border border-ministry-border-default rounded-ministry overflow-hidden ${
                      !isCurrentMonth ? 'bg-ministry-bg-primary' : 'bg-ministry-bg-secondary'
                    } ${isToday ? 'ring-2 ring-ministry-brand-primary' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isCurrentMonth ? 'text-ministry-text-primary' : 'text-ministry-text-muted'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {visibleTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          data-testid={`calendar-task-${task.id}`}
                          className={`text-xs px-1.5 py-0.5 rounded cursor-pointer truncate ${statusColors[task.status]}`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                      {remainingCount > 0 && (
                        <div className="text-xs text-ministry-text-muted pl-1">
                          +{remainingCount} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
