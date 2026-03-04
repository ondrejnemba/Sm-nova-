import React, { useState, useRef, useEffect } from 'react';
import { useScheduleStore } from '../../store/scheduleStore';
import { cn } from '../../utils/cn';
import { Shift, Machine, Employee, ValidationIssue } from '../../domain/types';
import { generateId } from '../../utils/id';
import { Trash2, ChevronRight, ChevronDown, UserPlus, AlertTriangle, XCircle, Copy, X, Settings, Printer } from 'lucide-react';
import { evaluateEmployeeForShift, validate } from '../../engine/validation';
import { getGridDays } from '../../utils/dateGrid';
import { format, differenceInCalendarDays, startOfDay, addDays, setHours, setMinutes } from 'date-fns';

type DragState = 
  | { type: 'create'; machineId: string; subColumnIndex: number; startMinute: number; currentMinute: number }
  | { type: 'move'; shift: Shift; startOffset: number; isCopy?: boolean }
  | { type: 'resize-start'; shift: Shift }
  | { type: 'resize-end'; shift: Shift }
  | null;

export const ProductionGrid = () => {
  const machineGroups = useScheduleStore(state => state.machineGroups);
  const machines = useScheduleStore(state => state.machines);
  const shifts = useScheduleStore(state => state.shifts);
  const selectedDay = useScheduleStore(state => state.selectedDay);
  const setSelectedDay = useScheduleStore(state => state.setSelectedDay);
  const selectedEmployeeId = useScheduleStore(state => state.selectedEmployeeId);
  const employees = useScheduleStore(state => state.employees);
  const collapsedGroups = useScheduleStore(state => state.collapsedGroups);
  const toggleGroup = useScheduleStore(state => state.toggleGroup);
  const toggleSettings = useScheduleStore(state => state.toggleSettings);
  const toggleExport = useScheduleStore(state => state.toggleExport);
  const snapGranularityMinutes = useScheduleStore(state => state.snapGranularityMinutes);
  const defaultShiftHours = useScheduleStore(state => state.defaultShiftHours);
  const scrollToDayTrigger = useScheduleStore(state => state.scrollToDayTrigger);
  const viewGranularityHours = useScheduleStore(state => state.viewGranularityHours);
  const selectedShiftIds = useScheduleStore(state => state.selectedShiftIds);
  const toggleShiftSelection = useScheduleStore(state => state.toggleShiftSelection);
  const clearShiftSelection = useScheduleStore(state => state.clearShiftSelection);
  const copySelectedShifts = useScheduleStore(state => state.copySelectedShifts);
  const isCopyMode = useScheduleStore(state => state.isCopyMode);
  const setCopyMode = useScheduleStore(state => state.setCopyMode);
  const selectedMachineIdsForCopy = useScheduleStore(state => state.selectedMachineIdsForCopy);
  const toggleMachineForCopy = useScheduleStore(state => state.toggleMachineForCopy);
  
  const addShift = useScheduleStore(state => state.addShift);
  const updateShift = useScheduleStore(state => state.updateShift);
  const deleteShift = useScheduleStore(state => state.deleteShift);

  const gridDays = getGridDays();
  
  // Base for calculations
  const gridStartDay = gridDays[0];

  const validationIssues = validate(shifts, employees, machines);

  const blockOffsetHours = 2; // Shifts start at 02:00
  const blocks: number[] = [];
  let startHour = blockOffsetHours;
  while (startHour > 0) {
    startHour -= viewGranularityHours;
  }
  for (let i = startHour; i < 24; i += viewGranularityHours) {
    blocks.push(i);
  }

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const lastScrollTriggerRef = useRef(0);
  
  const [dayHeight, setDayHeight] = useState(800);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        // We need to subtract the header height (48px) and a small buffer (4px)
        // to ensure the full 32 hours fit exactly in the visible area below the header.
        const availableHeight = entry.contentRect.height - 48 - 4; 
        // Chceme vidět celý den (24h) + 1 blok předchozího dne + 1 blok následujícího dne
        const totalHoursToFit = 24 + (2 * viewGranularityHours);
        const pxPerHour = availableHeight / totalHoursToFit;
        
        // Nastavíme výšku dne tak, aby pxPerHour odpovídalo dostupné výšce
        setDayHeight(pxPerHour * 24);
      }
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, [viewGranularityHours]);

  const pxPerMinute = dayHeight / 1440;

  const [dragState, setDragState] = useState<DragState>(null);
  const [hoveredMachineId, setHoveredMachineId] = useState<string | null>(null);
  const [hoveredSubColumnIndex, setHoveredSubColumnIndex] = useState<number>(0);
  const [hoveredMinute, setHoveredMinute] = useState<number | null>(null);
  
  const [pickerShiftId, setPickerShiftId] = useState<string | null>(null);
  const [pickerPos, setPickerPos] = useState({ x: 0, y: 0 });

  const snapMinute = (minute: number) => {
    return Math.round(minute / snapGranularityMinutes) * snapGranularityMinutes;
  };

  // Helper to convert absolute minute to Y position in grid (respecting local clock time)
  const getTopFromAbsolute = (absoluteMinute: number) => {
    const date = new Date(absoluteMinute * 60000);
    const daysDiff = differenceInCalendarDays(date, gridStartDay);
    const localMinutes = date.getHours() * 60 + date.getMinutes();
    return (daysDiff * dayHeight) + (localMinutes * pxPerMinute);
  };

  // Helper to convert Y position to absolute minute (respecting local clock time)
  const getMinuteFromY = (y: number) => {
    const daysDiff = Math.floor(y / dayHeight);
    const remainderY = y % dayHeight;
    const localMinutes = remainderY / pxPerMinute;
    
    const targetDay = addDays(gridStartDay, daysDiff);
    const targetDate = setMinutes(setHours(startOfDay(targetDay), Math.floor(localMinutes / 60)), localMinutes % 60);
    return Math.floor(targetDate.getTime() / 60000);
  };

  // Sync selectedDay -> scroll position ONLY when triggered programmatically or on resize
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const dayIndex = gridDays.findIndex(d => format(d, 'yyyy-MM-dd') === selectedDay);
    if (dayIndex !== -1) {
      // We want to center the day in the viewport.
      // The viewport height is designed to fit 24h + 2 * viewGranularityHours.
      // The production day starts at blockOffsetHours (02:00).
      // We want to see one block before that (which starts at blockOffsetHours - viewGranularityHours).
      const pxPerHour = dayHeight / 24;
      const offset = (viewGranularityHours - blockOffsetHours) * pxPerHour;
      const targetScroll = (dayIndex * dayHeight) - offset;
      
      const isExplicitTrigger = scrollToDayTrigger > lastScrollTriggerRef.current;
      lastScrollTriggerRef.current = scrollToDayTrigger;

      isProgrammaticScrollRef.current = true;
      // Use instant scroll on initial load/resize, smooth when explicitly triggered
      scrollContainerRef.current.scrollTo({ 
        top: Math.max(0, targetScroll), 
        behavior: isExplicitTrigger ? 'smooth' : 'auto' 
      });
      
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 1000); // Allow time for smooth scroll to finish
    }
  }, [scrollToDayTrigger, dayHeight, viewGranularityHours]); // Re-run when dayHeight or viewGranularityHours changes

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticScrollRef.current) return;

    const scrollTop = e.currentTarget.scrollTop;
    const availableHeight = scrollContainerRef.current?.clientHeight || dayHeight;
    const centerViewport = scrollTop + availableHeight / 2;
    const dayIndex = Math.floor(centerViewport / dayHeight);
    if (gridDays[dayIndex]) {
      const dayStr = format(gridDays[dayIndex], 'yyyy-MM-dd');
      if (dayStr !== selectedDay) {
        setSelectedDay(dayStr);
      }
    }
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragState || !gridRef.current || !scrollContainerRef.current) return;
      
      const rect = gridRef.current.getBoundingClientRect();
      const y = Math.max(0, Math.min(e.clientY - rect.top, 28 * dayHeight)); // Max height for 28 days
      const rawMinute = getMinuteFromY(y);
      const snappedMinute = snapMinute(rawMinute);

      setHoveredMinute(snappedMinute);

      if (dragState.type === 'create') {
        setDragState({ ...dragState, currentMinute: snappedMinute });
      } else if (dragState.type === 'move') {
        if (hoveredMachineId) {
          const duration = dragState.shift.endMinuteAbsolute - dragState.shift.startMinuteAbsolute;
          const newStart = snappedMinute - dragState.startOffset;
          const snappedNewStart = snapMinute(newStart);
          
          // Collision avoidance logic
          const otherShifts = shifts.filter(s => 
            s.id !== dragState.shift.id && 
            s.machineId === hoveredMachineId && 
            s.subColumnIndex === hoveredSubColumnIndex
          );

          let finalStart = snappedNewStart;
          let finalEnd = snappedNewStart + duration;

          // Find the closest shift that starts AFTER our proposed start
          const nextShift = otherShifts
            .filter(s => s.startMinuteAbsolute >= finalStart)
            .sort((a, b) => a.startMinuteAbsolute - b.startMinuteAbsolute)[0];
          
          if (nextShift && nextShift.startMinuteAbsolute < finalEnd) {
            // Crop the end of our shift
            finalEnd = nextShift.startMinuteAbsolute;
          }

          // Find the closest shift that ends BEFORE our proposed end
          const prevShift = otherShifts
            .filter(s => s.endMinuteAbsolute <= finalEnd)
            .sort((a, b) => b.endMinuteAbsolute - a.endMinuteAbsolute)[0];
          
          if (prevShift && prevShift.endMinuteAbsolute > finalStart) {
            // Crop the start of our shift
            finalStart = prevShift.endMinuteAbsolute;
          }

          // Ensure minimum duration of 15 minutes if cropped, or don't move if completely blocked
          if (finalEnd - finalStart >= 15) {
            updateShift(dragState.shift.id, {
              machineId: hoveredMachineId,
              subColumnIndex: hoveredSubColumnIndex,
              startMinuteAbsolute: finalStart,
              endMinuteAbsolute: finalEnd
            });
          }
        }
      } else if (dragState.type === 'resize-start') {
        if (snappedMinute < dragState.shift.endMinuteAbsolute) {
          updateShift(dragState.shift.id, { startMinuteAbsolute: snappedMinute });
        }
      } else if (dragState.type === 'resize-end') {
        if (snappedMinute > dragState.shift.startMinuteAbsolute) {
          updateShift(dragState.shift.id, { endMinuteAbsolute: snappedMinute });
        }
      }
    };

    const handlePointerUp = () => {
      if (dragState?.type === 'create') {
        const start = Math.min(dragState.startMinute, dragState.currentMinute);
        const end = Math.max(dragState.startMinute, dragState.currentMinute);
        
        if (end - start >= 15) {
          addShift({
            id: generateId(),
            machineId: dragState.machineId,
            subColumnIndex: dragState.subColumnIndex,
            employeeIds: selectedEmployeeId ? [selectedEmployeeId] : [],
            startMinuteAbsolute: start,
            endMinuteAbsolute: end
          });
        }
      } else if (dragState?.type === 'move' && dragState.isCopy) {
        // Validate employees after copying
        const shift = useScheduleStore.getState().shifts.find(s => s.id === dragState.shift.id);
        if (shift) {
          const validEmployeeIds = shift.employeeIds.filter(empId => {
            const emp = employees.find(e => e.id === empId);
            if (!emp) return false;
            const issues = evaluateEmployeeForShift(emp, shift, useScheduleStore.getState().shifts, machines);
            return !issues.some(i => i.isHardBlock);
          });
          if (validEmployeeIds.length !== shift.employeeIds.length) {
            updateShift(shift.id, { employeeIds: validEmployeeIds });
          }
        }
      }
      setDragState(null);
      setHoveredMinute(null);
    };

    if (dragState) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragState, hoveredMachineId, hoveredSubColumnIndex, selectedEmployeeId, snapGranularityMinutes, gridStartDay, employees, machines, defaultShiftHours]);

  return (
    <div className="flex-1 overflow-auto bg-white relative flex flex-col no-print" ref={scrollContainerRef} onScroll={handleScroll}>
      {/* Header Row */}
      <div className="flex sticky top-0 z-40 bg-white border-b-2 border-gray-200 w-max min-w-full h-12" onClick={() => clearShiftSelection()}>
        <div className="w-24 shrink-0 sticky left-0 z-50 bg-gray-50 border-r-2 border-gray-200 flex items-center justify-center gap-1">
          <button 
            onClick={toggleExport}
            className="p-1.5 hover:bg-gray-200 rounded-md transition-colors text-gray-500 hover:text-gray-700"
            title="Exportovat / Tisk"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button 
            onClick={toggleSettings}
            className="p-1.5 hover:bg-gray-200 rounded-md transition-colors text-gray-500 hover:text-gray-700"
            title="Nastavení"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 flex relative">
          {machineGroups.map(group => {
            const groupMachines = machines.filter(m => m.groupId === group.id);
            if (groupMachines.length === 0) return null;
            const isCollapsed = collapsedGroups.includes(group.id);

            if (isCollapsed) {
              return (
                <div 
                  key={group.id} 
                  className="flex flex-col border-r-2 border-gray-200 bg-gray-50 w-12 shrink-0 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="h-6 border-b-2 border-gray-200 flex items-center justify-center">
                    <ChevronRight className="w-3 h-3 text-gray-500" />
                  </div>
                  <div className="h-6 flex items-center justify-center overflow-hidden">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest truncate px-1" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                      {group.name.substring(0, 3)}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={group.id} className="flex flex-col border-r-2 border-gray-200 bg-white" style={{ minWidth: `${groupMachines.length * 120}px`, flex: groupMachines.length }}>
                <div 
                  className="h-6 border-b-2 border-gray-200 flex items-center px-2 text-[10px] font-bold text-gray-700 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => toggleGroup(group.id)}
                >
                  <ChevronDown className="w-3 h-3 mr-1" />
                  <span className="whitespace-nowrap">{group.name}</span>
                </div>
                <div className="flex h-6">
                  {groupMachines.map(machine => {
                    const isSelectedForCopy = selectedMachineIdsForCopy.includes(machine.id);
                    return (
                      <div 
                        key={machine.id} 
                        className={cn(
                          "flex items-center justify-center text-[10px] font-medium text-gray-600 border-r-2 border-gray-100 last:border-r-0 px-2 whitespace-nowrap min-w-[120px] flex-1 relative",
                          isCopyMode && "cursor-pointer hover:bg-blue-50 transition-colors"
                        )}
                        onClick={() => isCopyMode && toggleMachineForCopy(machine.id)}
                      >
                        {isCopyMode && (
                          <div className="absolute left-2 top-1/2 -translate-y-1/2">
                            <input 
                              type="checkbox" 
                              className="w-3 h-3 cursor-pointer accent-blue-500"
                              checked={isSelectedForCopy}
                              onChange={() => {}} // handled by parent onClick
                            />
                          </div>
                        )}
                        {machine.name} <span className="text-gray-400 ml-1">({machine.capacity})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Copy Mode Banner */}
      {isCopyMode && (
        <div className="sticky top-12 left-0 right-0 z-40 bg-blue-600 text-white px-4 py-2 flex items-center justify-between shadow-md no-print">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4" />
            <span className="text-sm font-bold">Režim kopírování:</span>
            <span className="text-sm opacity-90">Vyberte stroje nebo směny a potvrďte v levém panelu dní.</span>
          </div>
          <button 
            onClick={() => setCopyMode(false)}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md text-xs font-bold transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Zrušit
          </button>
        </div>
      )}

      {/* Body Row */}
      <div className="flex w-max min-w-full flex-1">
        {/* Time Axis */}
        <div className="w-24 shrink-0 sticky left-0 z-30 bg-white border-r-2 border-gray-200 flex flex-col">
          {gridDays.map((day, dayIndex) => {
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            return (
              <div key={day.toISOString()} className={cn("relative", isToday && "bg-orange-50/50")} style={{ height: `${dayHeight}px` }}>
                <div 
                  className={cn(
                    "absolute left-0 right-0 text-[10px] font-bold p-1 z-20 border-b-2 border-gray-200 text-center",
                    isToday ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-500"
                  )}
                  style={{ top: `${blockOffsetHours * 60 * pxPerMinute}px` }}
                >
                  {format(day, 'dd.MM.yyyy')}
                </div>
                {blocks.map((hour) => {
                  const blockStartAbsolute = dayIndex * 1440 + hour * 60;
                  const blockEndAbsolute = blockStartAbsolute + viewGranularityHours * 60;
                  
                  let hasRedProblem = false;
                  let hasYellowProblem = false;
                  let totalAssigned = 0;
                  let totalOptimum = 0;
                  let totalMaximum = 0;
                  let activeMachines = 0;

                  shifts.forEach(s => {
                    const overlap = Math.max(0, Math.min(blockEndAbsolute, s.endMinuteAbsolute) - Math.max(blockStartAbsolute, s.startMinuteAbsolute));
                    if (overlap > 0) {
                      const machine = machines.find(m => m.id === s.machineId);
                      if (!machine) return;
                      
                      const assigned = s.employeeIds.length;
                      const min = machine.minCapacity || 1;
                      const ideal = machine.idealCapacity || min;
                      const max = machine.capacity;
                      
                      totalAssigned += assigned;
                      totalOptimum += ideal;
                      totalMaximum += max;
                      activeMachines++;

                      if (assigned < min || assigned > max) {
                        hasRedProblem = true;
                      } else if (assigned !== ideal) {
                        hasYellowProblem = true;
                      }
                    }
                  });

                  const statusColor = hasRedProblem ? 'red' : (hasYellowProblem ? 'orange' : 'green');

                  return (
                    <div 
                      key={hour} 
                      className={cn(
                        "absolute w-full border-t-2 flex flex-col items-center justify-center text-xs font-medium transition-colors",
                        statusColor === 'red' ? "border-red-200" : 
                        statusColor === 'orange' ? "border-orange-200" : "border-gray-100 text-gray-500"
                      )}
                      style={{ top: `${hour * 60 * pxPerMinute}px`, height: `${viewGranularityHours * 60 * pxPerMinute}px` }}
                    >
                      {statusColor === 'red' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 z-30" />}
                      {statusColor === 'orange' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400 z-30" />}
                      <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-200 pointer-events-none opacity-50" />
                      <span className={cn(
                        "relative z-10 px-1 rounded text-center leading-tight", 
                        statusColor === 'red' ? "text-red-600 font-bold" : 
                        statusColor === 'orange' ? "text-orange-600 font-bold" : "bg-white/80"
                      )}>
                        {((hour + 24) % 24).toString().padStart(2, '0')}
                        {viewGranularityHours > 1 && <>-{((hour + viewGranularityHours + 24) % 24).toString().padStart(2, '0')}</>}
                      </span>
                      {activeMachines > 0 && (
                        <div className={cn(
                          "relative z-10 mt-0.5 px-1.5 py-0.5 text-[9px] font-black rounded-full border",
                          statusColor === 'red' ? "bg-red-50 text-red-600 border-red-200" :
                          statusColor === 'orange' ? "bg-orange-50 text-orange-600 border-orange-200" :
                          "bg-green-50 text-green-700 border-green-100"
                        )}>
                          {totalAssigned}/{totalOptimum}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Grid Content */}
        <div className="flex-1 flex relative" style={{ height: `${28 * dayHeight}px` }} ref={gridRef}>
          {/* Background lines */}
          <div className="absolute inset-0 pointer-events-none flex flex-col z-0">
            {gridDays.map((day, dayIndex) => {
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              return (
                <div key={day.toISOString()} className={cn("relative", isToday && "bg-orange-50/20")} style={{ height: `${dayHeight}px` }}>
                  {blocks.map((hour) => (
                    <div key={hour} className="absolute w-full border-t-2 border-gray-100" style={{ top: `${hour * 60 * pxPerMinute}px`, height: `${viewGranularityHours * 60 * pxPerMinute}px` }}>
                      <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-gray-100 pointer-events-none" />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Columns */}
          <div className="flex-1 flex relative z-10 h-full">
            {machineGroups.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-gray-400 font-medium p-12 text-center">
                Žádné stroje nejsou nakonfigurovány.<br/>Přejděte do nastavení a přidejte skupiny a stroje.
              </div>
            )}
            {machineGroups.map(group => {
              const groupMachines = machines.filter(m => m.groupId === group.id);
              if (groupMachines.length === 0) return null;
              const isCollapsed = collapsedGroups.includes(group.id);

              if (isCollapsed) {
                return <div key={group.id} className="w-12 border-r-2 border-gray-200 shrink-0 bg-gray-50/30 h-full" />;
              }

              return (
                <div key={group.id} className="flex border-r-2 border-gray-200 h-full" style={{ minWidth: `${groupMachines.length * 120}px`, flex: groupMachines.length }}>
                  {groupMachines.map(machine => {
                    const machineShifts = shifts.filter(s => s.machineId === machine.id);
                    
                    return (
                      <div key={machine.id} className="relative flex-1 min-w-[120px] flex flex-col h-full border-r-2 border-gray-100 last:border-r-0">
                        {/* Problem Highlights for this machine */}
                        <div className="absolute inset-0 pointer-events-none z-0">
                          {gridDays.map((day, dayIndex) => (
                            <div key={day.toISOString()} className="relative" style={{ height: `${dayHeight}px` }}>
                              {blocks.map(hour => {
                                const blockStartAbsolute = dayIndex * 1440 + hour * 60;
                                const blockEndAbsolute = blockStartAbsolute + viewGranularityHours * 60;
                                
                                const machineShiftsInHour = machineShifts.filter(s => {
                                  const overlap = Math.max(0, Math.min(blockEndAbsolute, s.endMinuteAbsolute) - Math.max(blockStartAbsolute, s.startMinuteAbsolute));
                                  return overlap > 0;
                                });

                                const machineStatus = machineShiftsInHour.some(s => {
                                  const assigned = s.employeeIds.length;
                                  return assigned < (machine.minCapacity || 1) || assigned > machine.capacity;
                                }) ? 'red' : machineShiftsInHour.some(s => {
                                  const assigned = s.employeeIds.length;
                                  return assigned !== (machine.idealCapacity || machine.minCapacity || 1);
                                }) ? 'orange' : 'green';

                                if (machineStatus === 'green') return null;

                                return (
                                  <div 
                                    key={hour} 
                                    className={cn(
                                      "absolute w-full border-x transition-colors",
                                      machineStatus === 'red' ? "bg-red-500/10 border-red-500/20" : "bg-orange-500/5 border-orange-500/10"
                                    )}
                                    style={{ top: `${hour * 60 * pxPerMinute}px`, height: `${viewGranularityHours * 60 * pxPerMinute}px` }}
                                  />
                                );
                              })}
                            </div>
                          ))}
                        </div>
                        
                        <MachineColumn 
                          machine={machine} 
                          shifts={machineShifts} 
                          employees={employees}
                          selectedEmployeeId={selectedEmployeeId}
                          selectedShiftIds={selectedShiftIds}
                          toggleShiftSelection={toggleShiftSelection}
                          copySelectedShifts={copySelectedShifts}
                          isCopyMode={isCopyMode}
                          validationIssues={validationIssues}
                          dragState={dragState}
                          setDragState={setDragState}
                          setHoveredMachineId={setHoveredMachineId}
                          setHoveredSubColumnIndex={setHoveredSubColumnIndex}
                          gridRef={gridRef}
                          snapMinute={snapMinute}
                          getMinuteFromY={getMinuteFromY}
                          getTopFromAbsolute={getTopFromAbsolute}
                          defaultShiftHours={defaultShiftHours}
                          pxPerMinute={pxPerMinute}
                          addShift={addShift}
                          openPicker={(e, id) => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setPickerShiftId(id);
                            setPickerPos({ x: rect.right + 10, y: rect.top });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Smart Picker Popover */}
      {pickerShiftId && (
        <div 
          className="fixed inset-0 z-50"
          onClick={() => setPickerShiftId(null)}
        >
          <div 
            className="absolute bg-white shadow-xl border-2 border-gray-200 rounded-lg w-64 max-h-96 overflow-y-auto flex flex-col"
            style={{ left: Math.min(pickerPos.x, window.innerWidth - 260), top: Math.min(pickerPos.y, window.innerHeight - 300) }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-2 border-b-2 border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 z-10">
              Přiřadit zaměstnance
            </div>
            <div className="p-1">
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md flex items-center gap-2"
                onClick={() => {
                  updateShift(pickerShiftId, { employeeIds: [] });
                  setPickerShiftId(null);
                }}
              >
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-dashed" />
                Vyprázdnit směnu
              </button>
              
              {employees
                .filter(emp => {
                  const shift = shifts.find(s => s.id === pickerShiftId);
                  if (!shift) return false;
                  const isAssigned = shift.employeeIds.includes(emp.id);
                  if (isAssigned) return true; // Always show assigned
                  const issues = evaluateEmployeeForShift(emp, shift, shifts, machines);
                  const hasHardBlock = issues.some(i => i.isHardBlock);
                  return !hasHardBlock; // Hide if has hard block and not assigned
                })
                .map(emp => {
                  const shift = shifts.find(s => s.id === pickerShiftId);
                  if (!shift) return null;
                  
                  const isAssigned = shift.employeeIds.includes(emp.id);
                  const issues = evaluateEmployeeForShift(emp, shift, shifts, machines);
                  const hasSoftBlock = issues.some(i => !i.isHardBlock);

                  return (
                    <button
                      key={emp.id}
                      onClick={() => {
                        if (isAssigned) {
                          updateShift(pickerShiftId, { employeeIds: shift.employeeIds.filter(id => id !== emp.id) });
                        } else {
                          updateShift(pickerShiftId, { employeeIds: [...shift.employeeIds, emp.id] });
                        }
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-md flex flex-col gap-1 transition-colors mt-1 group",
                        isAssigned ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-100"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: emp.color }} />
                          <span className="font-medium">{emp.name}</span>
                        </div>
                        {hasSoftBlock && !isAssigned && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                        {isAssigned && (
                          <div 
                            className="p-1 rounded text-red-500 hover:bg-red-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateShift(pickerShiftId, { employeeIds: shift.employeeIds.filter(id => id !== emp.id) });
                            }}
                          >
                            <X className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      
                      {issues.length > 0 && !isAssigned && (
                        <div className="text-[10px] flex flex-col gap-0.5 pl-6">
                          {issues.map((issue, idx) => (
                            <span key={idx} className="text-orange-600">
                              • {issue.message}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MachineColumn: React.FC<{ 
  machine: Machine; 
  shifts: Shift[]; 
  employees: Employee[];
  selectedEmployeeId: string | null;
  selectedShiftIds: string[];
  toggleShiftSelection: (id: string, multi: boolean) => void;
  copySelectedShifts: (newStartMinuteAbsolute: number) => void;
  isCopyMode: boolean;
  validationIssues: ValidationIssue[];
  dragState: DragState;
  setDragState: (state: DragState) => void;
  setHoveredMachineId: (id: string | null) => void;
  setHoveredSubColumnIndex: (idx: number) => void;
  gridRef: React.RefObject<HTMLDivElement | null>;
  snapMinute: (m: number) => number;
  getMinuteFromY: (y: number) => number;
  getTopFromAbsolute: (m: number) => number;
  defaultShiftHours: number;
  pxPerMinute: number;
  addShift: (shift: Shift) => void;
  openPicker: (e: React.MouseEvent, id: string) => void;
}> = ({ 
  machine, 
  shifts, 
  employees,
  selectedEmployeeId,
  selectedShiftIds,
  toggleShiftSelection,
  copySelectedShifts,
  isCopyMode,
  validationIssues,
  dragState,
  setDragState,
  setHoveredMachineId,
  setHoveredSubColumnIndex,
  gridRef,
  snapMinute,
  getMinuteFromY,
  getTopFromAbsolute,
  defaultShiftHours,
  pxPerMinute,
  addShift,
  openPicker
}) => {
  const deleteShift = useScheduleStore(state => state.deleteShift);
  const vCols = machine.virtualColumns || 1;

  const handleColumnPointerDown = (e: React.PointerEvent, colIdx: number) => {
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    
    if (isCopyMode) return; // Prevent creating shifts in copy mode

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMinute = getMinuteFromY(y);
    const snappedMinute = snapMinute(rawMinute);
    
    if (e.altKey && selectedShiftIds.length > 0) {
      copySelectedShifts(snappedMinute);
      return;
    }

    useScheduleStore.getState().clearShiftSelection();

    setDragState({
      type: 'create',
      machineId: machine.id,
      subColumnIndex: colIdx,
      startMinute: snappedMinute,
      currentMinute: snappedMinute
    });
  };

  const handleDoubleClick = (e: React.MouseEvent, colIdx: number) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rawMinute = getMinuteFromY(y);
    const snappedMinute = snapMinute(rawMinute);
    
    addShift({
      id: generateId(),
      machineId: machine.id,
      subColumnIndex: colIdx,
      employeeIds: selectedEmployeeId ? [selectedEmployeeId] : [],
      startMinuteAbsolute: snappedMinute,
      endMinuteAbsolute: snappedMinute + defaultShiftHours * 60
    });
  };

  return (
    <div className="relative shrink-0 flex-1 h-full w-full flex">
      {/* Sub-columns background */}
      {Array.from({ length: vCols }).map((_, colIdx) => (
        <div 
          key={colIdx}
          className={cn(
            "flex-1 h-full relative hover:bg-gray-50/50 transition-colors",
            colIdx > 0 && "border-l border-gray-100 border-dashed"
          )}
          onPointerDown={(e) => handleColumnPointerDown(e, colIdx)}
          onDoubleClick={(e) => handleDoubleClick(e, colIdx)}
          onPointerEnter={() => {
            setHoveredMachineId(machine.id);
            setHoveredSubColumnIndex(colIdx);
          }}
        />
      ))}

      {/* Render Shifts */}
      {shifts.map(shift => {
        const top = getTopFromAbsolute(shift.startMinuteAbsolute);
        const height = (shift.endMinuteAbsolute - shift.startMinuteAbsolute) * pxPerMinute;
        
        const colIdx = shift.subColumnIndex || 0;
        const widthPct = 100 / vCols;
        const leftPct = colIdx * widthPct;
        
        const shiftEmployees = employees.filter(e => shift.employeeIds.includes(e.id));
        const isSelected = selectedEmployeeId && shift.employeeIds.includes(selectedEmployeeId);
        const isShiftSelected = selectedShiftIds.includes(shift.id);
        const isFaded = selectedEmployeeId && !isSelected;

        const shiftIssues = validationIssues.filter(i => i.shiftId === shift.id);
        const hasHardBlock = shiftIssues.some(i => i.isHardBlock);
        const hasSoftBlock = shiftIssues.some(i => !i.isHardBlock);

        const isUnderOccupied = shift.employeeIds.length < machine.capacity;
        const missingSlots = machine.capacity - shift.employeeIds.length;

        let borderColor = '#22c55e'; // green-500
        let bgColor = '#f0fdf4'; // green-50
        let ringClass = isSelected ? "ring-2 ring-blue-500 ring-offset-1 z-20" : "z-10";

        if (isShiftSelected) {
          bgColor = '#e0f2fe';
          borderColor = '#3b82f6';
          ringClass = "ring-2 ring-blue-500 ring-offset-1 z-30";
        } else if (hasHardBlock) {
          borderColor = '#ef4444';
          bgColor = '#fef2f2';
          ringClass = "ring-2 ring-red-500 ring-offset-1 z-20";
        } else if (hasSoftBlock) {
          borderColor = '#f97316';
          bgColor = '#fff7ed';
          ringClass = "ring-2 ring-orange-500 ring-offset-1 z-20";
        } else if (shiftEmployees.length === 0) {
          borderColor = '#d1d5db';
          bgColor = '#f3f4f6';
        }

        return (
          <div
            key={shift.id}
            className={cn(
              "absolute rounded-md border-2 overflow-hidden flex flex-col transition-opacity group select-none",
              ringClass,
              isFaded ? "opacity-30" : "opacity-100",
              shiftEmployees.length === 0 && !hasHardBlock && !hasSoftBlock && !isShiftSelected ? "border-dashed" : "",
              isUnderOccupied && "border-r-4 border-r-orange-400"
            )}
            style={{
              top: `${top}px`,
              height: `${height}px`,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
              backgroundColor: bgColor,
              borderColor: borderColor,
              cursor: dragState ? 'grabbing' : 'grab'
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              
              if (isCopyMode) {
                toggleShiftSelection(shift.id, true); // In copy mode, clicking always toggles selection without clearing others
                return;
              }

              if (e.shiftKey) {
                toggleShiftSelection(shift.id, true);
                return;
              } else if (!isShiftSelected) {
                toggleShiftSelection(shift.id, false);
              }

              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top;
              const rawMinute = getMinuteFromY(e.clientY - gridRef.current!.getBoundingClientRect().top);
              
              if (e.altKey) {
                if (selectedShiftIds.length > 1 && isShiftSelected) {
                  // If we are alt-dragging a shift that is part of a multiple selection,
                  // we don't do anything special here. The copySelectedShifts handles
                  // the actual copying when clicking on the destination.
                  // We could implement multi-drag, but for now we just prevent normal drag.
                  return;
                }
                const newShift = { ...shift, id: generateId() };
                addShift(newShift);
                setDragState({ type: 'move', shift: newShift, startOffset: rawMinute - shift.startMinuteAbsolute, isCopy: true });
              } else {
                setDragState({ type: 'move', shift, startOffset: rawMinute - shift.startMinuteAbsolute });
              }
            }}
          >
            {/* Top Resize Handle */}
            <div 
              className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 z-10"
              onPointerDown={(e) => {
                e.stopPropagation();
                setDragState({ type: 'resize-start', shift });
              }}
            />

            <div className="flex-1 p-1.5 flex flex-col pointer-events-none">
              <div className="flex justify-between items-start pointer-events-auto">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {hasHardBlock && <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 shrink-0" />}
                  {!hasHardBlock && hasSoftBlock && <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 shrink-0" />}
                  <div className="text-[10px] sm:text-xs font-bold truncate text-gray-700">
                    {shiftEmployees.length}/{machine.idealCapacity || machine.minCapacity || 1}
                  </div>
                </div>
              </div>
              
              {/* Employee List */}
              <div className="flex flex-col gap-0.5 mt-1 overflow-hidden flex-1">
                {shiftEmployees.map(emp => {
                  const empIssues = shiftIssues.filter(i => i.employeeId === emp.id);
                  const empHasHardBlock = empIssues.some(i => i.isHardBlock);
                  const empHasSoftBlock = empIssues.some(i => !i.isHardBlock);
                  
                  return (
                    <div key={emp.id} className={cn(
                      "flex items-center gap-1 text-[10px] truncate rounded px-0.5",
                      empHasHardBlock ? "bg-red-100 text-red-700 font-bold" : 
                      empHasSoftBlock ? "bg-orange-100 text-orange-700 font-bold" : ""
                    )}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: emp.color }} />
                      <span className="truncate font-medium text-gray-900">{emp.name}</span>
                    </div>
                  );
                })}
              </div>

              {/* Collision Text */}
              {shiftIssues.length > 0 && (
                <div className="mt-1 flex flex-col gap-0.5 pointer-events-auto">
                  {shiftIssues.map((issue, idx) => (
                    <div key={idx} className={cn("text-[9px] leading-tight p-0.5 rounded", issue.isHardBlock ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700")}>
                      {issue.message}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-auto pointer-events-auto border-t border-black/5 pt-0.5 flex flex-col gap-1">
                <div className="text-[10px] text-gray-600 truncate font-medium">
                  {formatTime(shift.startMinuteAbsolute)} - {formatTime(shift.endMinuteAbsolute)}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-between">
                  <button 
                    onClick={(e) => openPicker(e, shift.id)}
                    className="flex-1 flex justify-center items-center text-blue-600 hover:bg-blue-100 bg-blue-50 p-1 rounded transition-colors"
                  >
                    <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteShift(shift.id); }}
                    className="flex-1 flex justify-center items-center text-red-600 hover:bg-red-100 bg-red-50 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Resize Handle */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 z-10"
              onPointerDown={(e) => {
                e.stopPropagation();
                setDragState({ type: 'resize-end', shift });
              }}
            />
          </div>
        );
      })}

      {/* Drag Create Preview */}
      {dragState?.type === 'create' && dragState.machineId === machine.id && (
        <div 
          className="absolute left-1 right-1 bg-blue-500/20 border-2 border-blue-500 border-dashed rounded-md pointer-events-none z-20"
          style={{
            top: `${getTopFromAbsolute(Math.min(dragState.startMinute, dragState.currentMinute))}px`,
            height: `${Math.max(defaultShiftHours * 60 * pxPerMinute, Math.abs(dragState.currentMinute - dragState.startMinute) * pxPerMinute)}px`
          }}
        />
      )}
    </div>
  );
};

const formatTime = (absoluteMinute: number) => {
  const d = new Date(absoluteMinute * 60000);
  return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
};
