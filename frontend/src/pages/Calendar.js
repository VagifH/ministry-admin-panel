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

// Status colors for task badges
const statusColors = {
  Draft: 'bg-ministry-status-draft text-white',
  Submitted: 'bg-ministry-status-submitted text-white',
  Producing: 'bg-ministry-status-producing text-white',
  Review: 'bg-ministry-status-review text-white',
  Scheduled: 'bg-ministry-status-scheduled text-white',
  Published: 'bg-ministry-status-published text-white',
  Rejected: 'bg-ministry-status-rejected text-white',
};

// Content type accent colors (left bar indicator)
const contentTypeAccent = {
  'Announcement': 'bg-gray-400',      // Neutral
  'Short Lesson': 'bg-blue-500',      // Blue
  'Full Lesson': 'bg-purple-500',     // Purple
};

export default function Calendar() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
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
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const maxVisible = 2;
                const visibleTasks = dayTasks.slice(0, maxVisible);
                const remainingCount = dayTasks.length - maxVisible;

                return (
                  <div
                    key={index}
                    data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    onClick={() => setSelectedDate(day)}
                    className={`h-[100px] p-2 border rounded-ministry overflow-hidden cursor-pointer
                      ${!isCurrentMonth ? 'bg-ministry-bg-primary border-ministry-border-default' : 'bg-ministry-bg-secondary border-ministry-border-default'}
                      ${isToday ? 'ring-2 ring-ministry-brand-primary ring-inset' : ''}
                      ${isSelected && !isToday ? 'bg-ministry-bg-tertiary' : ''}
                    `}
                  >
                    {/* Day number - lighter weight, secondary color */}
                    <div className={`text-sm font-normal mb-1.5 ${
                      isCurrentMonth ? 'text-ministry-text-secondary' : 'text-ministry-text-muted'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    {/* Events container - 4px gap between events */}
                    <div className="flex flex-col gap-1">
                      {visibleTasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tasks/${task.id}`);
                          }}
                          data-testid={`calendar-task-${task.id}`}
                          className="flex items-center gap-1 cursor-pointer group"
                          title={task.title}
                        >
                          {/* Content type accent bar */}
                          <div className={`w-0.5 h-4 rounded-full flex-shrink-0 ${contentTypeAccent[task.content_type] || 'bg-gray-400'}`} />
                          {/* Event text - medium weight, primary color, single line */}
                          <span className={`text-xs font-medium text-ministry-text-primary truncate flex-1 px-1 py-0.5 rounded ${statusColors[task.status]}`}>
                            {task.title}
                          </span>
                        </div>
                      ))}
                      {remainingCount > 0 && (
                        <div className="text-xs text-ministry-text-muted pl-2">
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
