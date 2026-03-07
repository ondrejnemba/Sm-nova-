import React from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import { cn } from '../utils/cn';
import { validate } from '../engine/validation';
import { AlertTriangle, XCircle, History, ChevronRight, ChevronDown, Users } from 'lucide-react';
import { format, subDays, parseISO, startOfWeek, addDays } from 'date-fns';
import { cs } from 'date-fns/locale';

export const EmployeeRibbon = () => {
  const employees = useScheduleStore(state => state.employees);
  const employeeGroups = useScheduleStore(state => state.employeeGroups);
  const collapsedEmployeeGroups = useScheduleStore(state => state.collapsedEmployeeGroups);
  const toggleEmployeeGroup = useScheduleStore(state => state.toggleEmployeeGroup);
  const selectedEmployeeId = useScheduleStore(state => state.selectedEmployeeId);
  const setSelectedEmployeeId = useScheduleStore(state => state.setSelectedEmployeeId);
  const shifts = useScheduleStore(state => state.shifts);
  const machines = useScheduleStore(state => state.machines);
  const selectedDay = useScheduleStore(state => state.selectedDay);
  const viewMode = useScheduleStore(state => state.viewMode);
  const setViewMode = useScheduleStore(state => state.setViewMode);

  const validationIssues = validate(shifts, employees, machines);

  // Calculate current week boundaries
  const currentDayDate = parseISO(selectedDay);
  const currentWeekStart = startOfWeek(currentDayDate, { weekStartsOn: 1 });
  const currentWeekEnd = addDays(currentWeekStart, 7);
  const currentWeekStartMinute = Math.floor(currentWeekStart.getTime() / 60000);
  const currentWeekEndMinute = Math.floor(currentWeekEnd.getTime() / 60000);

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  
  // Group employees
  const groupedEmployees = employees.reduce((acc, emp) => {
    const groupId = emp.groupId || 'none';
    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(emp);
    return acc;
  }, {} as Record<string, typeof employees>);

  // Sort groups: defined groups first, then 'none'
  const groupIds = [...employeeGroups.map(g => g.id), 'none'].filter(id => groupedEmployees[id]);

  // Calculate history for selected employee
  const historyDays = [3, 2, 1].map(d => subDays(parseISO(selectedDay), d));
  const employeeHistory = selectedEmployeeId ? historyDays.map(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayShifts = shifts.filter(s => {
      if (!s.employeeIds.includes(selectedEmployeeId)) return false;
      const sDate = new Date(s.startMinuteAbsolute * 60000);
      return format(sDate, 'yyyy-MM-dd') === dateStr;
    });

    // Merge consecutive shifts for display
    dayShifts.sort((a, b) => a.startMinuteAbsolute - b.startMinuteAbsolute);
    const mergedBlocks: { start: number, end: number }[] = [];
    for (const s of dayShifts) {
      if (mergedBlocks.length === 0) {
        mergedBlocks.push({ start: s.startMinuteAbsolute, end: s.endMinuteAbsolute });
      } else {
        const last = mergedBlocks[mergedBlocks.length - 1];
        if (s.startMinuteAbsolute <= last.end) {
          last.end = Math.max(last.end, s.endMinuteAbsolute);
        } else {
          mergedBlocks.push({ start: s.startMinuteAbsolute, end: s.endMinuteAbsolute });
        }
      }
    }

    return {
      date,
      blocks: mergedBlocks.map(b => {
        const startH = Math.floor(b.start / 60) % 24;
        const startM = b.start % 60;
        const endH = Math.floor(b.end / 60) % 24;
        const endM = b.end % 60;
        return `${startH}:${startM.toString().padStart(2, '0')}-${endH}:${endM.toString().padStart(2, '0')}`;
      })
    };
  }) : [];

  return (
    <div className="min-h-16 border-b border-gray-200 flex flex-wrap items-center p-2 gap-2 shrink-0 bg-white relative no-print">
      {groupIds.map(groupId => {
        const group = employeeGroups.find(g => g.id === groupId);
        const groupEmps = groupedEmployees[groupId];
        const isCollapsed = collapsedEmployeeGroups.includes(groupId);
        const isNone = groupId === 'none';

        if (isNone) {
          return groupEmps.map(emp => renderEmployeeCard(emp));
        }

        if (isCollapsed) {
          return (
            <button
              key={groupId}
              onClick={() => toggleEmployeeGroup(groupId)}
              className="flex items-center gap-1.5 p-1.5 border border-emerald-200 bg-emerald-50/50 rounded min-w-[110px] text-left transition-colors hover:bg-emerald-100/50"
            >
              <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-white shrink-0">
                <Users className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[10px] truncate text-emerald-700 flex items-center justify-between">
                  {group?.name}
                  <ChevronRight className="w-3 h-3" />
                </div>
                <div className="text-[8px] text-emerald-500 font-medium">
                  {groupEmps.length} zaměstnanců
                </div>
              </div>
            </button>
          );
        }

        return (
          <div key={groupId} className="flex items-start gap-2 bg-gray-100/50 p-1 rounded-md border border-gray-200">
            <button 
              onClick={() => toggleEmployeeGroup(groupId)}
              className="px-1 py-1.5 mt-1 hover:bg-gray-200 rounded transition-colors text-gray-400 shrink-0"
              title="Sbalit skupinu"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="flex flex-wrap gap-2 flex-1">
              {groupEmps.map(emp => renderEmployeeCard(emp))}
            </div>
          </div>
        );
      })}

      {employees.length === 0 && (
        <div className="text-xs text-gray-400 italic px-4">Žádní zaměstnanci. Přidejte je v nastavení.</div>
      )}
    </div>
  );

  function renderEmployeeCard(emp: typeof employees[0]) {
    const empShifts = shifts.filter(s => s.employeeIds.includes(emp.id));
    
    // Calculate hours worked in the current calendar week
    const shiftsInCurrentWeek = empShifts.filter(s => s.startMinuteAbsolute < currentWeekEndMinute && s.endMinuteAbsolute > currentWeekStartMinute);
    let workedMinutesInCurrentWeek = 0;
    for (const s of shiftsInCurrentWeek) {
      const overlapStart = Math.max(s.startMinuteAbsolute, currentWeekStartMinute);
      const overlapEnd = Math.min(s.endMinuteAbsolute, currentWeekEndMinute);
      workedMinutesInCurrentWeek += (overlapEnd - overlapStart);
    }
    const currentWeeklyHours = Math.round(workedMinutesInCurrentWeek / 60);

    const isSelected = selectedEmployeeId === emp.id;

    const empIssues = validationIssues.filter(i => i.employeeId === emp.id);
    const hasHardBlock = empIssues.some(i => i.isHardBlock);
    const hasSoftBlock = empIssues.some(i => !i.isHardBlock);

    const isAssignedToday = empShifts.some(s => {
      const sDate = new Date(s.startMinuteAbsolute * 60000);
      return format(sDate, 'yyyy-MM-dd') === selectedDay;
    });

    return (
      <React.Fragment key={emp.id}>
        <button
          onClick={() => setSelectedEmployeeId(isSelected ? null : emp.id)}
          className={cn(
            "flex items-center gap-1.5 p-1.5 border rounded min-w-[110px] text-left transition-colors relative shadow-sm",
            isSelected ? "border-emerald-500 bg-emerald-50" : "border-gray-200 bg-white hover:border-gray-300",
            hasHardBlock && !isSelected && "border-red-400 bg-red-50",
            hasSoftBlock && !hasHardBlock && !isSelected && "border-orange-400 bg-orange-50"
          )}
        >
          <div 
            className="w-5 h-5 rounded-full shrink-0 border border-white shadow-sm"
            style={{ backgroundColor: emp.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[10px] truncate text-gray-900 flex items-center gap-1">
              {emp.name}
              {hasHardBlock && <XCircle className="w-3 h-3 text-red-500 shrink-0" />}
              {hasSoftBlock && !hasHardBlock && <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />}
            </div>
            <div className="text-[9px] text-gray-500">
              {currentWeeklyHours}h / {emp.weeklyLimitHours}h
            </div>
          </div>
          <div 
            className={cn(
              "w-2 h-2 rounded-full shrink-0 ml-1",
              isAssignedToday ? "bg-emerald-500" : "bg-red-500"
            )}
            title={isAssignedToday ? "Dnes má směnu" : "Dnes nemá směnu"}
          />
        </button>

        {/* History Panel as cards next to selected employee */}
        {isSelected && (
          <div className="flex gap-1.5 items-center bg-emerald-50/50 p-1 rounded border border-emerald-100">
            <div className="text-[7px] font-bold text-emerald-700 uppercase px-0.5" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              Historie
            </div>
            {employeeHistory.map((h, i) => (
              <div key={i} className="flex flex-col bg-white border border-emerald-100 rounded px-1.5 py-0.5 min-w-[75px] shadow-sm">
                <div className="text-[8px] font-bold text-gray-400 capitalize">{format(h.date, 'EEEE d. M.', { locale: cs })}</div>
                <div className="text-[9px] text-emerald-600 font-medium truncate">
                  {h.blocks.length > 0 ? h.blocks.join(', ') : 'Volno'}
                </div>
              </div>
            ))}
          </div>
        )}
      </React.Fragment>
    );
  }
};
