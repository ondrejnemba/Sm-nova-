import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useScheduleStore } from '../../store/scheduleStore';
import { cn } from '../../utils/cn';
import { getGridDays } from '../../utils/dateGrid';
import { CalendarDays, Copy, Check, AlertTriangle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const CopyDayButton = ({ onCopy }: { onCopy: (daysCount: number) => boolean }) => {
  const isCopyMode = useScheduleStore(state => state.isCopyMode);
  const setCopyMode = useScheduleStore(state => state.setCopyMode);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const [daysCount, setDaysCount] = useState(1);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (copied) {
      timeout = setTimeout(() => setCopied(false), 2000);
    }
    return () => clearTimeout(timeout);
  }, [copied]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (failed) {
      timeout = setTimeout(() => setFailed(false), 2000);
    }
    return () => clearTimeout(timeout);
  }, [failed]);

  if (copied) {
    return (
      <button className="text-emerald-600 bg-emerald-50 p-1.5 rounded-md flex items-center gap-1 cursor-default" disabled title="Úspěšně zkopírováno">
        <Check className="w-4 h-4" />
      </button>
    );
  }

  if (failed) {
    return (
      <button className="text-orange-600 bg-orange-50 p-1.5 rounded-md flex items-center gap-1 cursor-default" disabled title="V tento den nejsou žádné směny">
        <AlertTriangle className="w-4 h-4" />
      </button>
    );
  }

  if (isCopyMode) {
    return (
      <div className="flex items-center gap-1 bg-emerald-50 p-1 rounded-md border border-emerald-100">
        <div className="flex items-center gap-1 px-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase">Dny:</span>
          <input 
            type="number" 
            min="1" 
            max="14" 
            value={daysCount} 
            onChange={(e) => setDaysCount(Math.max(1, Math.min(14, parseInt(e.target.value) || 1)))}
            className="w-8 h-6 text-xs border border-emerald-200 rounded text-center focus:outline-none focus:border-emerald-400"
          />
        </div>
        <button 
          onClick={() => {
            const success = onCopy(daysCount);
            if (success) {
              setCopied(true);
            } else {
              setFailed(true);
            }
          }}
          className="text-white bg-emerald-500 hover:bg-emerald-600 px-2 py-1 rounded-md text-xs font-bold transition-colors"
        >
          Potvrdit
        </button>
        <button 
          onClick={() => setCopyMode(false)}
          className="text-gray-500 hover:bg-gray-200 p-1 rounded-md text-xs font-bold transition-colors"
          title="Zrušit kopírování"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={() => setCopyMode(true)}
      className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 p-1.5 rounded-md transition-colors flex items-center gap-1"
      title="Kopírovat vybraný den do následujícího"
    >
      <Copy className="w-4 h-4" />
    </button>
  );
};

export const DayPanel = () => {
  const selectedDay = useScheduleStore(state => state.selectedDay);
  const triggerScrollToDay = useScheduleStore(state => state.triggerScrollToDay);
  const copyDayToNext = useScheduleStore(state => state.copyDayToNext);

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
    <div className="w-48 border-r border-gray-200 flex flex-col shrink-0 bg-white no-print">
      <div className="h-12 px-4 font-semibold text-sm text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-white z-10 flex items-center justify-between shrink-0">
        <span>Dny</span>
        <div className="flex gap-1">
          <CopyDayButton onCopy={(count) => copyDayToNext(selectedDay, count)} />
          <button 
            onClick={() => triggerScrollToDay(format(today, 'yyyy-MM-dd'))}
            className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 p-1.5 rounded-md transition-colors flex items-center gap-1"
            title="Dnes"
          >
            <CalendarDays className="w-4 h-4" />
          </button>
        </div>
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
                  ? "bg-emerald-50/50 border-emerald-500 text-emerald-700" 
                  : "border-transparent text-gray-600 hover:bg-white",
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
