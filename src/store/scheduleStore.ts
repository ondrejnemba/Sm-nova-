import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Employee, MachineGroup, Machine, Shift } from '../domain/types';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

interface ScheduleState {
  employees: Employee[];
  machineGroups: MachineGroup[];
  machines: Machine[];
  shifts: Shift[];
  selectedDay: string; // YYYY-MM-DD
  selectedEmployeeId: string | null;
  selectedShiftId: string | null;
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
  
  addMachineGroup: (group: MachineGroup) => void;
  updateMachineGroup: (id: string, group: Partial<MachineGroup>) => void;
  deleteMachineGroup: (id: string) => void;
  
  addMachine: (machine: Machine) => void;
  updateMachine: (id: string, machine: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;
  
  addShift: (shift: Shift) => void;
  updateShift: (id: string, shift: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
  
  setSelectedDay: (day: string) => void;
  setSelectedEmployeeId: (id: string | null) => void;
  setSelectedShiftId: (id: string | null) => void;
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
