import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
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

// TaskPopoverItem component - renders a single task in the popover
const TaskPopoverItem = ({ task, onClick, statusColors, contentTypeAccent }) => (
  <button
    onClick={onClick}
    data-testid={`popover-task-${task.id}`}
    className="w-full flex items-center gap-2 p-2 rounded text-left cursor-pointer
      focus:outline-none focus:bg-ministry-bg-tertiary
      hover:bg-ministry-bg-tertiary
      transition-colors duration-[120ms] ease-out"
  >
    {/* Content type accent bar */}
    <div className={`w-1 h-5 rounded-full flex-shrink-0 ${contentTypeAccent[task.content_type] || 'bg-gray-400'}`} />
    {/* Task info */}
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-ministry-text-primary truncate">
        {task.title}
      </div>
    </div>
    {/* Status badge */}
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${statusColors[task.status]}`}>
      {task.status}
    </span>
  </button>
);

// DayCell component - handles individual day rendering with interactions
const DayCell = ({ day, dayTasks, isCurrentMonth, isToday, isSelected, onSelectDate, onTaskClick, statusColors, contentTypeAccent }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const maxVisible = 2;
  const visibleTasks = dayTasks.slice(0, maxVisible);
  const remainingCount = dayTasks.length - maxVisible;

  const handleTaskClick = useCallback((e, taskId) => {
    e.stopPropagation();
    onTaskClick(taskId);
  }, [onTaskClick]);

  const handleMoreClick = useCallback((e) => {
    e.stopPropagation();
    setPopoverOpen(true);
  }, []);

  const handlePopoverTaskClick = useCallback((taskId) => {
    setPopoverOpen(false);
    onTaskClick(taskId);
  }, [onTaskClick]);

  return (
    <div
      data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
      onClick={() => onSelectDate(day)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={`h-[100px] p-2 border rounded-ministry overflow-hidden cursor-pointer select-none flex flex-col
        ${!isCurrentMonth ? 'bg-ministry-bg-primary border-ministry-border-default' : 'bg-ministry-bg-secondary border-ministry-border-default'}
        ${isToday ? 'ring-2 ring-ministry-brand-primary ring-inset' : ''}
        ${isSelected && !isToday ? 'bg-ministry-bg-tertiary' : ''}
        ${isPressed ? 'bg-ministry-bg-tertiary scale-[0.98]' : 'scale-100'}
        hover:bg-ministry-bg-tertiary
        transition-[transform,background-color] duration-[140ms] ease-out
      `}
    >
      {/* Day number - lighter weight than events, secondary color */}
      <div className={`text-[13px] font-light leading-none mb-[6px] ${
        isCurrentMonth ? 'text-ministry-text-secondary' : 'text-ministry-text-muted'
      }`}>
        {format(day, 'd')}
      </div>
      {/* Events container - fixed height, 4px gap between events, overflow hidden */}
      <div className="flex flex-col gap-1 flex-1 overflow-hidden">
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            onClick={(e) => handleTaskClick(e, task.id)}
            data-testid={`calendar-task-${task.id}`}
            className="flex items-center gap-1 cursor-pointer group h-[18px] min-h-[18px] max-h-[18px]"
            title={task.title}
          >
            {/* Content type accent bar - fixed height matching event */}
            <div className={`w-0.5 h-[14px] rounded-full flex-shrink-0 ${contentTypeAccent[task.content_type] || 'bg-gray-400'}`} />
            {/* Event text - 11px (smaller than body), medium weight, single line truncate */}
            <span className={`text-[11px] leading-[18px] font-medium truncate flex-1 px-1 rounded whitespace-nowrap overflow-hidden ${statusColors[task.status]}`}>
              {task.title}
            </span>
          </div>
        ))}
        {remainingCount > 0 && (
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              {/* "+X more" - same height, line-height, and left offset as events */}
              <button
                onClick={handleMoreClick}
                data-testid={`calendar-more-${format(day, 'yyyy-MM-dd')}`}
                className="flex items-center h-[18px] min-h-[18px] max-h-[18px] text-[11px] leading-[18px] text-ministry-text-muted text-left cursor-pointer
                  hover:text-ministry-text-primary hover:underline
                  focus:outline-none focus:text-ministry-text-primary
                  transition-colors duration-[120ms] ease-out"
              >
                {/* Spacer matching accent bar width + gap */}
                <span className="w-0.5 mr-1 flex-shrink-0" />
                <span className="px-1">+{remainingCount} more</span>
              </button>
            </PopoverTrigger>
            <PopoverContent 
              align="start" 
              sideOffset={4}
              className="w-64 p-2 bg-ministry-bg-secondary border-ministry-border-default rounded-ministry shadow-ministry-card max-h-60 overflow-y-auto
                data-[state=open]:animate-in data-[state=closed]:animate-out
                data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
                data-[state=closed]:zoom-out-98 data-[state=open]:zoom-in-98
                data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1
                duration-[140ms]"
              data-testid={`calendar-popover-${format(day, 'yyyy-MM-dd')}`}
            >
              <div className="text-xs font-semibold text-ministry-text-secondary mb-2 px-2">
                {format(day, 'MMMM d, yyyy')} — {dayTasks.length} tasks
              </div>
              <div className="flex flex-col">
                {dayTasks.map((task) => (
                  <TaskPopoverItem
                    key={task.id}
                    task={task}
                    onClick={() => handlePopoverTaskClick(task.id)}
                    statusColors={statusColors}
                    contentTypeAccent={contentTypeAccent}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

export default function Calendar() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleTaskClick = useCallback((taskId) => {
    navigate(`/tasks/${taskId}`);
  }, [navigate]);

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

                return (
                  <DayCell
                    key={index}
                    day={day}
                    dayTasks={dayTasks}
                    isCurrentMonth={isCurrentMonth}
                    isToday={isToday}
                    isSelected={isSelected}
                    onSelectDate={setSelectedDate}
                    onTaskClick={handleTaskClick}
                    statusColors={statusColors}
                    contentTypeAccent={contentTypeAccent}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
