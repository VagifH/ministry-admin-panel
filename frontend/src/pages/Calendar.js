import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { CardSkeleton } from '../components/ui/loading';
import { ErrorState } from '../components/ui/empty-state';
import { showApiError } from '../lib/toast';
import { getStatusBadgeClass, getStatusLabel, getStatusColors } from '../utils/statusUtils';
import { getContentTypeAccent } from '../config/contentTypeConfig';
import { useAvatars } from '../context/AvatarContext';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Small avatar circle component for event chips
const MiniAvatar = ({ avatarName, size = 18 }) => {
  const { getAvatarPhoto, getAvatarInitials } = useAvatars();
  const photoUrl = getAvatarPhoto(avatarName);
  const initials = getAvatarInitials(avatarName);
  
  return (
    <div
      className="rounded-full bg-ministry-bg-tertiary border border-ministry-border-default flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span 
          className="text-ministry-text-secondary font-medium"
          style={{ fontSize: Math.max(size * 0.45, 8) }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

// Event chip component - Outlook/Fluent style
const EventChip = ({ task, onClick }) => {
  const statusColors = getStatusColors(task.status);
  
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(task.id);
      }}
      data-testid={`calendar-task-${task.id}`}
      className="w-full flex items-center gap-1.5 h-[26px] px-1.5 rounded-[4px] cursor-pointer
        bg-ministry-bg-primary border border-ministry-border-default
        hover:bg-ministry-bg-tertiary hover:border-ministry-text-muted/30
        focus:outline-none focus:ring-1 focus:ring-ministry-brand-primary/40
        transition-all duration-100 group"
      title={`${task.title} — ${getStatusLabel(task.status)}`}
    >
      {/* Avatar */}
      <MiniAvatar avatarName={task.avatar} size={18} />
      
      {/* Title - truncated */}
      <span className="flex-1 text-[11px] font-medium text-ministry-text-primary truncate text-left leading-none">
        {task.title}
      </span>
      
      {/* Status dot indicator */}
      <div 
        className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors.bg}`}
        title={getStatusLabel(task.status)}
      />
    </button>
  );
};

// Task list item for day panel
const DayPanelTaskItem = ({ task, onClick }) => {
  const { getAvatarDisplayName } = useAvatars();
  const statusColors = getStatusColors(task.status);
  
  return (
    <button
      onClick={() => onClick(task.id)}
      data-testid={`day-panel-task-${task.id}`}
      className="w-full flex items-center gap-3 p-3 rounded-ministry cursor-pointer text-left
        bg-ministry-bg-primary border border-ministry-border-default
        hover:bg-ministry-bg-tertiary hover:shadow-ministry-sm
        focus:outline-none focus:ring-2 focus:ring-ministry-brand-primary/30
        transition-all duration-150"
    >
      {/* Avatar */}
      <MiniAvatar avatarName={task.avatar} size={32} />
      
      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-ministry-text-primary truncate">
          {task.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-ministry-text-secondary">
            {getAvatarDisplayName(task.avatar)}
          </span>
          <span className="text-ministry-text-muted">•</span>
          <span className="text-xs text-ministry-text-secondary">
            {format(new Date(task.publish_datetime), 'h:mm a')}
          </span>
        </div>
      </div>
      
      {/* Status badge */}
      <Badge className={`${getStatusBadgeClass(task.status)} text-[10px] px-2 py-0.5`}>
        {getStatusLabel(task.status)}
      </Badge>
    </button>
  );
};

// DayCell component - handles individual day rendering with Outlook-style event chips
const DayCell = ({ day, dayTasks, isCurrentMonth, isToday, isSelected, onSelectDate, onTaskClick, onDayClick }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  const maxVisible = 3; // Show max 3 chips
  const visibleTasks = dayTasks.slice(0, maxVisible);
  const remainingCount = dayTasks.length - maxVisible;

  const handleDayClick = useCallback((e) => {
    // If clicking on the day cell itself (not a task), open day panel
    if (dayTasks.length > 0) {
      onDayClick(day, dayTasks);
    }
    onSelectDate(day);
  }, [day, dayTasks, onDayClick, onSelectDate]);

  return (
    <div
      data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
      onClick={handleDayClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={`h-[120px] p-1.5 border rounded-ministry overflow-hidden cursor-pointer select-none flex flex-col
        ${!isCurrentMonth 
          ? 'bg-ministry-bg-app/60 border-ministry-border-subtle/50 opacity-60' 
          : 'bg-ministry-bg-surface border-ministry-border-subtle'}
        ${isToday ? 'ring-2 ring-ministry-calendar-today-ring ring-inset border-ministry-calendar-today-ring' : ''}
        ${isSelected && !isToday ? 'bg-ministry-calendar-selected-bg border-ministry-brand-primary/40' : ''}
        ${isPressed ? 'bg-ministry-bg-hover scale-[0.99]' : 'scale-100'}
        hover:bg-ministry-bg-hover hover:border-ministry-border-default
        transition-all duration-100 ease-out
      `}
    >
      {/* Day number header */}
      <div className={`text-xs font-medium mb-1 px-0.5 ${
        isToday 
          ? 'text-ministry-brand-primary font-semibold' 
          : isCurrentMonth 
            ? 'text-ministry-text-secondary' 
            : 'text-ministry-text-muted'
      }`}>
        {format(day, 'd')}
      </div>
      
      {/* Events container */}
      <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
        {visibleTasks.map((task) => (
          <EventChip 
            key={task.id} 
            task={task} 
            onClick={onTaskClick}
          />
        ))}
        
        {/* +N more indicator - Outlook style */}
        {remainingCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDayClick(day, dayTasks);
            }}
            data-testid={`calendar-more-${format(day, 'yyyy-MM-dd')}`}
            className="flex items-center justify-center h-[22px] text-[10px] font-medium 
              text-ministry-text-link hover:text-ministry-brand-hover
              hover:bg-ministry-interactive-hover rounded
              transition-colors duration-100"
          >
            +{remainingCount} more
          </button>
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Day panel state
  const [dayPanelOpen, setDayPanelOpen] = useState(false);
  const [dayPanelDate, setDayPanelDate] = useState(null);
  const [dayPanelTasks, setDayPanelTasks] = useState([]);

  const handleTaskClick = useCallback((taskId) => {
    navigate(`/tasks/${taskId}`);
  }, [navigate]);

  const handleDayClick = useCallback((day, tasks) => {
    setDayPanelDate(day);
    setDayPanelTasks(tasks);
    setDayPanelOpen(true);
  }, []);

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
    setIsTransitioning(true);
    setTimeout(() => {
      if (view === 'month') {
        setCurrentDate(subMonths(currentDate, 1));
      } else {
        setCurrentDate(subWeeks(currentDate, 1));
      }
      setIsTransitioning(false);
    }, 75);
  };

  const handleNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      if (view === 'month') {
        setCurrentDate(addMonths(currentDate, 1));
      } else {
        setCurrentDate(addWeeks(currentDate, 1));
      }
      setIsTransitioning(false);
    }, 75);
  };

  const handleToday = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentDate(new Date());
      setIsTransitioning(false);
    }, 75);
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
          <h2 className="text-lg font-semibold text-ministry-text-primary cursor-default select-none">
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
                <div key={day} className="text-center text-sm font-semibold text-ministry-text-secondary py-2 cursor-default">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid with fade transition on month change */}
            <div 
              className={`grid grid-cols-7 gap-2 transition-opacity duration-[150ms] ease-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
            >
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
                    onDayClick={handleDayClick}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Day Panel Dialog */}
      <Dialog open={dayPanelOpen} onOpenChange={setDayPanelOpen}>
        <DialogContent 
          className="max-w-md bg-ministry-bg-secondary border-ministry-border-default rounded-ministry shadow-ministry-dialog"
          data-testid="day-panel-dialog"
        >
          <DialogHeader className="border-b border-ministry-border-default pb-4">
            <DialogTitle className="text-lg font-semibold text-ministry-text-primary">
              {dayPanelDate && format(dayPanelDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
            <p className="text-sm text-ministry-text-secondary">
              {dayPanelTasks.length} {dayPanelTasks.length === 1 ? 'task' : 'tasks'} scheduled
            </p>
          </DialogHeader>
          
          <div className="py-2 space-y-2 max-h-[400px] overflow-y-auto">
            {dayPanelTasks.length === 0 ? (
              <div className="text-center py-8 text-ministry-text-muted">
                No tasks scheduled for this day
              </div>
            ) : (
              dayPanelTasks.map((task) => (
                <DayPanelTaskItem
                  key={task.id}
                  task={task}
                  onClick={(taskId) => {
                    setDayPanelOpen(false);
                    handleTaskClick(taskId);
                  }}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
