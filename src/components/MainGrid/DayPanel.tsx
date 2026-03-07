import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useScheduleStore } from '../../store/scheduleStore';
import { cn } from '../../utils/cn';
import { getGridDays } from '../../utils/dateGrid';
import { CalendarDays, Copy, Check, AlertTriangle, X, Undo2 } from 'lucide-react';
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
  const viewMode = useScheduleStore(state => state.viewMode);
  const setViewMode = useScheduleStore(state => state.setViewMode);
  const undo = useScheduleStore(state => state.undo);
  const pastShifts = useScheduleStore(state => state.pastShifts);

  const today = new Date();
  const days = getGridDays();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const isVeryCompact = viewMode === 'week';

  useEffect(() => {
    if (!scrollRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, []);

  const lastDayRef = useRef(selectedDay);

  useEffect(() => {
    if (selectedButtonRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = selectedButtonRef.current;
      
      const buttonTop = button.offsetTop;
      const buttonHeight = button.clientHeight;
      
      const targetScroll = buttonTop - (containerHeight / 2) + (buttonHeight / 2);
      
      const isDayChange = lastDayRef.current !== selectedDay;
      lastDayRef.current = selectedDay;

      container.scrollTo({ 
        top: Math.max(0, targetScroll), 
        behavior: isDayChange ? 'smooth' : 'auto' 
      });
    }
  }, [selectedDay, containerHeight]);

  return (
    <div className={cn("border-r border-gray-200 flex flex-col shrink-0 bg-white no-print transition-all", isVeryCompact ? "w-32" : "w-48")}>
      <div className="h-12 px-2 font-semibold text-sm text-gray-500 uppercase tracking-wider border-b border-gray-200 bg-white z-10 flex items-center justify-between shrink-0">
        <div className="flex bg-gray-100 p-0.5 rounded-md gap-0.5 border border-gray-200">
          <button 
            onClick={() => setViewMode('detail')}
            className={cn(
              "p-1.5 rounded-sm transition-all flex items-center justify-center",
              viewMode === 'detail' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
            title="Detail (1 den)"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
          </button>
          <button 
            onClick={() => setViewMode('overview')}
            className={cn(
              "p-1.5 rounded-sm transition-all flex items-center justify-center",
              viewMode === 'overview' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
            title="Přehled (3 dny)"
          >
            <div className="flex gap-0.5">
              <div className="w-0.5 h-1.5 rounded-full bg-current opacity-40" />
              <div className="w-0.5 h-1.5 rounded-full bg-current" />
              <div className="w-0.5 h-1.5 rounded-full bg-current opacity-40" />
            </div>
          </button>
          <button 
            onClick={() => setViewMode('week')}
            className={cn(
              "p-1.5 rounded-sm transition-all flex items-center justify-center",
              viewMode === 'week' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
            )}
            title="Týden (7 dní)"
          >
            <div className="grid grid-cols-3 gap-px">
              {[...Array(6)].map((_, i) => <div key={i} className="w-[1.5px] h-[1.5px] rounded-full bg-current" />)}
            </div>
          </button>
        </div>
        <div className="flex gap-0.5">
          <button 
            onClick={undo}
            disabled={pastShifts.length === 0}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent p-1.5 rounded-md transition-colors flex items-center justify-center"
            title="Zpět (Undo)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          {!isVeryCompact && <CopyDayButton onCopy={(count) => copyDayToNext(selectedDay, count)} />}
          <button 
            onClick={() => triggerScrollToDay(format(today, 'yyyy-MM-dd'))}
            className="text-orange-500 hover:text-orange-700 hover:bg-orange-50 p-1.5 rounded-md transition-colors flex items-center justify-center"
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
                "w-full text-left transition-colors border-l-4",
                isVeryCompact ? "px-2 py-2" : "px-4 py-3",
                isSelected 
                  ? "bg-emerald-50/50 border-emerald-500 text-emerald-700" 
                  : "border-transparent text-gray-600 hover:bg-white",
                isToday && !isSelected && "text-orange-600 font-bold"
              )}
            >
              <div className={cn("capitalize font-medium", isVeryCompact ? "text-xs" : "text-sm")}>
                {format(day, isVeryCompact ? 'EEE' : 'EEEE', { locale: cs })}
              </div>
              <div className={cn("text-gray-400 mt-0.5", isVeryCompact ? "text-[10px]" : "text-xs")}>
                {format(day, isVeryCompact ? 'd.M.' : 'd. MMMM', { locale: cs })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
