import React from 'react';
import { useScheduleStore } from '../store/scheduleStore';
import { cn } from '../utils/cn';
import { validate } from '../engine/validation';
import { AlertTriangle, XCircle, History, ChevronRight, ChevronDown, Users } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
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

  const validationIssues = validate(shifts, employees, machines);

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
  const historyDays = [1, 2, 3].map(d => subDays(parseISO(selectedDay), d));
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
    <div className="min-h-16 border-b-2 border-gray-200 flex flex-wrap items-center p-2 gap-2 shrink-0 bg-gray-50 relative no-print">
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
              className="flex items-center gap-1.5 p-1.5 border-2 border-blue-200 bg-blue-50/50 rounded min-w-[110px] text-left transition-colors hover:bg-blue-100/50"
            >
              <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-white shrink-0">
                <Users className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[10px] truncate text-blue-700 flex items-center justify-between">
                  {group?.name}
                  <ChevronRight className="w-3 h-3" />
                </div>
                <div className="text-[8px] text-blue-500 font-medium">
                  {groupEmps.length} zaměstnanců
                </div>
              </div>
            </button>
          );
        }

        return (
          <div key={groupId} className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-md border border-gray-200">
            <button 
              onClick={() => toggleEmployeeGroup(groupId)}
              className="px-1 py-4 hover:bg-gray-200 rounded transition-colors text-gray-400"
              title="Sbalit skupinu"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="flex flex-wrap gap-2">
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
    const workedMinutes = empShifts.reduce((acc, s) => acc + (s.endMinuteAbsolute - s.startMinuteAbsolute), 0);
    const workedHours = Math.round(workedMinutes / 60);
    const isSelected = selectedEmployeeId === emp.id;

    const empIssues = validationIssues.filter(i => i.employeeId === emp.id);
    const hasHardBlock = empIssues.some(i => i.isHardBlock);
    const hasSoftBlock = empIssues.some(i => !i.isHardBlock);

    return (
      <React.Fragment key={emp.id}>
        <button
          onClick={() => setSelectedEmployeeId(isSelected ? null : emp.id)}
          className={cn(
            "flex items-center gap-1.5 p-1.5 border-2 rounded min-w-[110px] text-left transition-colors relative",
            isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300",
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
              {workedHours}h / {emp.weeklyLimitHours}h
            </div>
          </div>
        </button>

        {/* History Panel as cards next to selected employee */}
        {isSelected && (
          <div className="flex gap-1.5 items-center bg-blue-50/50 p-1 rounded border border-blue-100">
            <div className="text-[7px] font-bold text-blue-700 uppercase px-0.5" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              Historie
            </div>
            {employeeHistory.map((h, i) => (
              <div key={i} className="flex flex-col bg-white border border-blue-100 rounded px-1.5 py-0.5 min-w-[75px]">
                <div className="text-[8px] font-bold text-gray-400 capitalize">{format(h.date, 'EEEE d. M.', { locale: cs })}</div>
                <div className="text-[9px] text-blue-600 font-medium truncate">
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
