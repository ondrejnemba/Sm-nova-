import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Employee, MachineGroup, Machine, Shift } from '../domain/types';
import { format, differenceInCalendarDays, startOfDay, addDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { getGridDays } from '../utils/dateGrid';

interface ScheduleState {
  employees: Employee[];
  machineGroups: MachineGroup[];
  machines: Machine[];
  shifts: Shift[];
  selectedDay: string; // YYYY-MM-DD
  selectedEmployeeId: string | null;
  selectedShiftId: string | null;
  selectedShiftIds: string[];
  isCopyMode: boolean;
  selectedMachineIdsForCopy: string[];
  settingsOpen: boolean;
  exportOpen: boolean;
  collapsedGroups: string[];
  expandedMachines: string[];
  snapGranularityMinutes: number;
  defaultShiftHours: number;
  viewGranularityHours: number;
  scrollToDayTrigger: number;

  addEmployee: (emp: Employee) => void;
  updateEmployee: (id: string, emp: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  reorderEmployees: (startIndex: number, endIndex: number) => void;
  
  addMachineGroup: (group: MachineGroup) => void;
  updateMachineGroup: (id: string, group: Partial<MachineGroup>) => void;
  deleteMachineGroup: (id: string) => void;
  reorderMachineGroups: (startIndex: number, endIndex: number) => void;
  
  addMachine: (machine: Machine) => void;
  updateMachine: (id: string, machine: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;
  reorderMachines: (startIndex: number, endIndex: number) => void;
  
  addShift: (shift: Shift) => void;
  updateShift: (id: string, shift: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
  
  setSelectedDay: (day: string) => void;
  setSelectedEmployeeId: (id: string | null) => void;
  setSelectedShiftId: (id: string | null) => void;
  toggleShiftSelection: (id: string, multi: boolean) => void;
  clearShiftSelection: () => void;
  setCopyMode: (isCopy: boolean) => void;
  toggleMachineForCopy: (machineId: string) => void;
  copyDayToNext: (day: string) => boolean;
  copySelectedShifts: (newStartMinuteAbsolute: number) => void;
  toggleSettings: () => void;
  toggleExport: () => void;
  toggleGroup: (groupId: string) => void;
  toggleMachineColumns: (machineId: string) => void;
  setSnapGranularityMinutes: (mins: number) => void;
  setDefaultShiftHours: (hours: number) => void;
  setViewGranularityHours: (hours: number) => void;
  triggerScrollToDay: (day: string) => void;
  
  // Supabase Sync
  isSyncing: boolean;
  lastSyncError: string | null;
  syncWithSupabase: () => Promise<void>;
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'e1', name: 'Jan Novák', color: '#3b82f6', weeklyLimitHours: 40, maxShiftHours: 12, allowedMachineIds: ['m1', 'm2', 'm3'] },
  { id: 'e2', name: 'Petr Svoboda', color: '#ef4444', weeklyLimitHours: 40, maxShiftHours: 12, allowedMachineIds: ['m1', 'm2', 'm3'] },
  { id: 'e3', name: 'Marie Černá', color: '#10b981', weeklyLimitHours: 40, maxShiftHours: 12, allowedMachineIds: ['m1', 'm2', 'm3'] },
  { id: 'e4', name: 'Josef Dvořák', color: '#f59e0b', weeklyLimitHours: 40, maxShiftHours: 12, allowedMachineIds: ['m1', 'm2', 'm3'] },
];

const INITIAL_GROUPS: MachineGroup[] = [
  { id: 'g1', name: 'Kartonáž' },
  { id: 'g2', name: 'Lepení' },
];

const INITIAL_MACHINES: Machine[] = [
  { id: 'm1', name: 'Stroj 1', groupId: 'g1', capacity: 2, minCapacity: 1, idealCapacity: 2, virtualColumns: 1 },
  { id: 'm2', name: 'Stroj 2', groupId: 'g1', capacity: 2, minCapacity: 1, idealCapacity: 1, virtualColumns: 1 },
  { id: 'm3', name: 'Lepička A', groupId: 'g2', capacity: 3, minCapacity: 1, idealCapacity: 2, virtualColumns: 1 },
];

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      employees: INITIAL_EMPLOYEES,
      machineGroups: INITIAL_GROUPS,
      machines: INITIAL_MACHINES,
      shifts: [],
      selectedDay: format(new Date(), 'yyyy-MM-dd'),
      selectedEmployeeId: null,
      selectedShiftId: null,
      selectedShiftIds: [],
      isCopyMode: false,
      selectedMachineIdsForCopy: [],
      settingsOpen: false,
      exportOpen: false,
      collapsedGroups: [],
      expandedMachines: [],
      snapGranularityMinutes: 30, // Default 30 min for better precision
      defaultShiftHours: 8, // Default 8 hours
      viewGranularityHours: 1,
      scrollToDayTrigger: 0,
      isSyncing: false,
      lastSyncError: null,

      addEmployee: (emp) => set((state) => {
        const newState = { employees: [...state.employees, { maxShiftHours: 12, ...emp }] };
        if (supabase) supabase.from('employees').insert(newState.employees[newState.employees.length - 1]).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      updateEmployee: (id, emp) => set((state) => {
        const newState = { employees: state.employees.map(e => e.id === id ? { ...e, ...emp } : e) };
        if (supabase) supabase.from('employees').update(emp).eq('id', id).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      deleteEmployee: (id) => set((state) => {
        const newState = {
          employees: state.employees.filter(e => e.id !== id),
          shifts: state.shifts.map(s => s.employeeIds.includes(id) ? { ...s, employeeIds: s.employeeIds.filter(eId => eId !== id) } : s),
          selectedEmployeeId: state.selectedEmployeeId === id ? null : state.selectedEmployeeId
        };
        if (supabase) supabase.from('employees').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      reorderEmployees: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.employees);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { employees: result };
      }),

      addMachineGroup: (group) => set((state) => {
        const newState = { machineGroups: [...state.machineGroups, group] };
        if (supabase) supabase.from('machine_groups').insert(group).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      updateMachineGroup: (id, group) => set((state) => {
        const newState = { machineGroups: state.machineGroups.map(g => g.id === id ? { ...g, ...group } : g) };
        if (supabase) supabase.from('machine_groups').update(group).eq('id', id).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      deleteMachineGroup: (id) => set((state) => {
        const newState = {
          machineGroups: state.machineGroups.filter(g => g.id !== id),
          machines: state.machines.filter(m => m.groupId !== id)
        };
        if (supabase) supabase.from('machine_groups').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      reorderMachineGroups: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.machineGroups);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { machineGroups: result };
      }),

      addMachine: (machine) => set((state) => {
        const newState = { machines: [...state.machines, machine] };
        if (supabase) supabase.from('machines').insert(machine).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      updateMachine: (id, machine) => set((state) => {
        const newState = { machines: state.machines.map(m => m.id === id ? { ...m, ...machine } : m) };
        if (supabase) supabase.from('machines').update(machine).eq('id', id).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      deleteMachine: (id) => set((state) => {
        const newState = {
          machines: state.machines.filter(m => m.id !== id),
          shifts: state.shifts.filter(s => s.machineId !== id)
        };
        if (supabase) supabase.from('machines').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      reorderMachines: (startIndex, endIndex) => set((state) => {
        const result = Array.from(state.machines);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return { machines: result };
      }),

      addShift: (shift) => set((state) => {
        const newState = { shifts: [...state.shifts, shift] };
        if (supabase) supabase.from('shifts').insert(shift).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      updateShift: (id, shift) => set((state) => {
        const newState = { shifts: state.shifts.map(s => s.id === id ? { ...s, ...shift } : s) };
        if (supabase) supabase.from('shifts').update(shift).eq('id', id).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      deleteShift: (id) => set((state) => {
        const newState = { shifts: state.shifts.filter(s => s.id !== id) };
        if (supabase) supabase.from('shifts').delete().eq('id', id).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),

      setSelectedDay: (day) => set({ selectedDay: day }),
      setSelectedEmployeeId: (id) => set({ selectedEmployeeId: id }),
      setSelectedShiftId: (id) => set({ selectedShiftId: id }),
      toggleShiftSelection: (id, multi) => set((state) => {
        if (multi) {
          return {
            selectedShiftIds: state.selectedShiftIds.includes(id)
              ? state.selectedShiftIds.filter(sId => sId !== id)
              : [...state.selectedShiftIds, id]
          };
        } else {
          return {
            selectedShiftIds: state.selectedShiftIds.includes(id) && state.selectedShiftIds.length === 1 ? [] : [id]
          };
        }
      }),
      clearShiftSelection: () => set({ selectedShiftIds: [] }),
      setCopyMode: (isCopy) => set({ isCopyMode: isCopy, selectedMachineIdsForCopy: [] }),
      toggleMachineForCopy: (machineId) => set((state) => ({
        selectedMachineIdsForCopy: state.selectedMachineIdsForCopy.includes(machineId)
          ? state.selectedMachineIdsForCopy.filter(id => id !== machineId)
          : [...state.selectedMachineIdsForCopy, machineId]
      })),
      copyDayToNext: (day) => {
        let copiedCount = 0;
        set((state) => {
          // Parse the day string (e.g. '2026-03-04') into local year, month, day
          const [year, month, date] = day.split('-').map(Number);
          
          // Visual day starts at 02:00 local time
          const visualStart = new Date(year, month - 1, date, 2, 0, 0);
          // Visual day ends at 02:00 local time the next day
          const visualEnd = new Date(year, month - 1, date + 1, 2, 0, 0);

          // Convert to absolute minutes since Unix Epoch
          const dayStartMinute = Math.floor(visualStart.getTime() / 60000);
          const dayEndMinute = Math.floor(visualEnd.getTime() / 60000);

          let shiftsToCopy = [];

          if (state.selectedShiftIds.length > 0) {
            // If specific shifts are selected, copy ONLY them (and ensure they belong to the day just in case, or maybe just copy them regardless? Let's copy them regardless of the day if they are selected, but the user clicked copy on a specific day. Actually, if they selected shifts, we just copy those selected shifts exactly +24h)
            shiftsToCopy = state.shifts.filter(s => state.selectedShiftIds.includes(s.id));
          } else if (state.selectedMachineIdsForCopy.length > 0) {
            // If machines are selected, copy shifts from those machines for the day
            shiftsToCopy = state.shifts.filter(s => 
              state.selectedMachineIdsForCopy.includes(s.machineId) &&
              s.startMinuteAbsolute >= dayStartMinute && s.startMinuteAbsolute < dayEndMinute
            );
          } else {
            // Copy all shifts for the day
            shiftsToCopy = state.shifts.filter(s => 
              s.startMinuteAbsolute >= dayStartMinute && s.startMinuteAbsolute < dayEndMinute
            );
          }
          
          copiedCount = shiftsToCopy.length;
          if (copiedCount === 0) {
            set({ isCopyMode: false, selectedMachineIdsForCopy: [] });
            return state;
          }

          // Calculate the exact minute offset for 24 hours later
          // We use Date objects to handle Daylight Saving Time transitions correctly
          const newShifts = shiftsToCopy.map(shift => {
            const originalStart = new Date(shift.startMinuteAbsolute * 60000);
            const originalEnd = new Date(shift.endMinuteAbsolute * 60000);
            
            const newStart = new Date(originalStart.getFullYear(), originalStart.getMonth(), originalStart.getDate() + 1, originalStart.getHours(), originalStart.getMinutes());
            const newEnd = new Date(originalEnd.getFullYear(), originalEnd.getMonth(), originalEnd.getDate() + 1, originalEnd.getHours(), originalEnd.getMinutes());

            return {
              ...shift,
              id: Math.random().toString(36).substr(2, 9),
              startMinuteAbsolute: Math.floor(newStart.getTime() / 60000),
              endMinuteAbsolute: Math.floor(newEnd.getTime() / 60000)
            };
          });

          const newState = { 
            shifts: [...state.shifts, ...newShifts],
            isCopyMode: false,
            selectedMachineIdsForCopy: [],
            selectedShiftIds: []
          };
          if (supabase) supabase.from('shifts').insert(newShifts).then(({ error }) => { if (error) console.error(error); });
          return newState;
        });
        return copiedCount > 0;
      },
      copySelectedShifts: (newStartMinuteAbsolute) => set((state) => {
        if (state.selectedShiftIds.length === 0) return state;
        
        const selectedShifts = state.shifts.filter(s => state.selectedShiftIds.includes(s.id));
        if (selectedShifts.length === 0) return state;
        
        // Find the earliest shift to calculate offsets
        const earliestShift = selectedShifts.reduce((earliest, current) => 
          current.startMinuteAbsolute < earliest.startMinuteAbsolute ? current : earliest
        , selectedShifts[0]);
        
        const timeOffset = newStartMinuteAbsolute - earliestShift.startMinuteAbsolute;

        const newShifts = selectedShifts.map(shift => {
          return {
            ...shift,
            id: crypto.randomUUID(),
            // Keep original machine and column exactly as they were
            machineId: shift.machineId,
            subColumnIndex: shift.subColumnIndex,
            startMinuteAbsolute: shift.startMinuteAbsolute + timeOffset,
            endMinuteAbsolute: shift.endMinuteAbsolute + timeOffset
          };
        });

        const newState = { 
          shifts: [...state.shifts, ...newShifts],
          selectedShiftIds: newShifts.map(s => s.id)
        };
        if (supabase) supabase.from('shifts').insert(newShifts).then(({ error }) => { if (error) console.error(error); });
        return newState;
      }),
      toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),
      toggleExport: () => set((state) => ({ exportOpen: !state.exportOpen })),
      toggleGroup: (id) => set((state) => ({
        collapsedGroups: state.collapsedGroups.includes(id)
          ? state.collapsedGroups.filter(g => g !== id)
          : [...state.collapsedGroups, id]
      })),
      toggleMachineColumns: (id) => set((state) => ({
        expandedMachines: state.expandedMachines?.includes(id)
          ? state.expandedMachines.filter(m => m !== id)
          : [...(state.expandedMachines || []), id]
      })),
      setSnapGranularityMinutes: (mins) => set({ snapGranularityMinutes: mins }),
      setDefaultShiftHours: (hours) => set({ defaultShiftHours: hours }),
      setViewGranularityHours: (hours) => set({ viewGranularityHours: hours }),
      triggerScrollToDay: (day) => set(state => ({ scrollToDayTrigger: state.scrollToDayTrigger + 1, selectedDay: day })),
      
      syncWithSupabase: async () => {
        if (!supabase) return;
        set({ isSyncing: true, lastSyncError: null });
        try {
          const [empRes, groupRes, machRes, shiftRes] = await Promise.all([
            supabase.from('employees').select('*'),
            supabase.from('machine_groups').select('*'),
            supabase.from('machines').select('*'),
            supabase.from('shifts').select('*')
          ]);

          if (empRes.error) throw empRes.error;
          if (groupRes.error) throw groupRes.error;
          if (machRes.error) throw machRes.error;
          if (shiftRes.error) throw shiftRes.error;

          // Only update state if we actually got data from Supabase
          // (prevents overwriting local state with empty arrays if DB is fresh)
          if (empRes.data.length > 0 || groupRes.data.length > 0) {
            set({
              employees: empRes.data,
              machineGroups: groupRes.data,
              machines: machRes.data,
              shifts: shiftRes.data,
              isSyncing: false
            });
          } else {
            // DB is empty, push local state to DB
            const state = get();
            if (state.employees.length > 0) {
              const { error } = await supabase.from('employees').insert(state.employees);
              if (error) throw error;
            }
            if (state.machineGroups.length > 0) {
              const { error } = await supabase.from('machine_groups').insert(state.machineGroups);
              if (error) throw error;
            }
            if (state.machines.length > 0) {
              const { error } = await supabase.from('machines').insert(state.machines);
              if (error) throw error;
            }
            if (state.shifts.length > 0) {
              const { error } = await supabase.from('shifts').insert(state.shifts);
              if (error) throw error;
            }
            set({ isSyncing: false });
          }
        } catch (error: any) {
          console.error("Supabase sync error:", error);
          set({ isSyncing: false, lastSyncError: error.message });
        }
      },
    }),
    {
      name: 'shift-planner-storage-v3', // Changed name to force fresh start with initial data
      version: 3,
    }
  )
);
