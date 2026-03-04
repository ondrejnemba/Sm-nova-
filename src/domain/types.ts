export interface Employee {
  id: string;
  name: string;
  color: string;
  weeklyLimitHours: number;
  maxShiftHours: number;
  allowedMachineIds: string[];
  groupId?: string;
}

export interface EmployeeGroup {
  id: string;
  name: string;
}

export interface MachineGroup {
  id: string;
  name: string;
  highlight12h?: boolean;
}

export interface Machine {
  id: string;
  name: string;
  groupId: string;
  capacity: number;
  minCapacity?: number;
  idealCapacity?: number;
  virtualColumns?: number;
}

export interface Shift {
  id: string;
  machineId: string;
  employeeIds: string[];
  startMinuteAbsolute: number;
  endMinuteAbsolute: number;
  subColumnIndex?: number;
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  shiftId?: string;
  employeeId?: string;
  isHardBlock?: boolean;
}
