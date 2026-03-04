import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useScheduleStore } from '../../store/scheduleStore';
import { cn } from '../../utils/cn';
import { getGridDays } from '../../utils/dateGrid';
import { CalendarDays } from 'lucide-react';
import { useEffect, useRef } from 'react';

export const DayPanel = () => {
  const selectedDay = useScheduleStore(state => state.selectedDay);
  const triggerScrollToDay = useScheduleStore(state => state.triggerScrollToDay);

  const today = new Date();
  const days = getGridDays();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selectedButtonRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = selectedButtonRef.current;
      
      const containerHeight = container.clientHeight;
      const buttonTop = button.offsetTop;
      const buttonHeight = button.clientHeight;
      
      const targetScroll = buttonTop - (containerHeight / 2) + (buttonHeight / 2);
      
      container.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [selectedDay]);

  return (
    <div className="w-48 border-r-2 border-gray-200 flex flex-col shrink-0 bg-gray-50 no-print">
      <div className="h-12 px-4 font-semibold text-sm text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 bg-gray-50 z-10 flex items-center justify-between shrink-0">
        <span>Dny</span>
        <button 
          onClick={() => triggerScrollToDay(format(today, 'yyyy-MM-dd'))}
          className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 p-1.5 rounded-md transition-colors flex items-center gap-1"
          title="Dnes"
        >
          <CalendarDays className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 py-2 overflow-y-auto" ref={scrollRef}>
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = selectedDay === dateStr;
          const isToday = format(today, 'yyyy-MM-dd') === dateStr;

          return (
            <button
              key={dateStr}
              ref={isSelected ? selectedButtonRef : null}
              onClick={() => triggerScrollToDay(dateStr)}
              className={cn(
                "w-full text-left px-4 py-3 text-sm font-medium transition-colors border-l-4",
                isSelected 
                  ? "bg-white border-blue-500 text-blue-700" 
                  : "border-transparent text-gray-600 hover:bg-gray-100",
                isToday && !isSelected && "text-orange-600 font-bold"
              )}
            >
              <div className="capitalize">{format(day, 'EEEE', { locale: cs })}</div>
              <div className="text-xs text-gray-400 mt-0.5">{format(day, 'd. MMMM', { locale: cs })}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
