import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns';

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

export default function Calendar() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      toast.error('Failed to load tasks');
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
          <h1 className="text-2xl font-semibold text-[#323130]">Calendar</h1>
          <p className="text-sm text-[#605e5c] mt-1">View tasks by publish date</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            onClick={() => setView('month')}
            data-testid="calendar-month-view-button"
            className={view === 'month' ? 'bg-[#0078d4] text-white rounded-lg' : 'border-[#e5e5e5] rounded-lg'}
            size="sm"
          >
            Month
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            onClick={() => setView('week')}
            data-testid="calendar-week-view-button"
            className={view === 'week' ? 'bg-[#0078d4] text-white rounded-lg' : 'border-[#e5e5e5] rounded-lg'}
            size="sm"
          >
            Week
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm">
        <div className="p-4 border-b border-[#e5e5e5] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#323130]">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleToday}
              data-testid="calendar-today-button"
              className="border-[#e5e5e5] rounded-lg"
              size="sm"
            >
              Today
            </Button>
            <Button
              variant="outline"
              onClick={handlePrevious}
              data-testid="calendar-previous-button"
              className="border-[#e5e5e5] rounded-lg"
              size="sm"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              onClick={handleNext}
              data-testid="calendar-next-button"
              className="border-[#e5e5e5] rounded-lg"
              size="sm"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[#605e5c]">Loading...</div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-[#605e5c] py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dayTasks = getTasksForDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={index}
                    data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                    className={`min-h-[120px] p-2 border border-[#e5e5e5] rounded-lg ${
                      !isCurrentMonth ? 'bg-[#fafafa]' : 'bg-white'
                    } ${isToday ? 'ring-2 ring-[#0078d4]' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-2 ${
                      isCurrentMonth ? 'text-[#323130]' : 'text-[#8a8886]'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          onClick={() => navigate(`/tasks/${task.id}`)}
                          data-testid={`calendar-task-${task.id}`}
                          className="text-xs p-1 rounded cursor-pointer hover:opacity-80"
                          style={{ backgroundColor: statusColors[task.status].replace('bg-', '#').split(' ')[0] }}
                        >
                          <div className="text-white truncate font-medium">{task.title}</div>
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-[#605e5c]">+{dayTasks.length - 3} more</div>
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
