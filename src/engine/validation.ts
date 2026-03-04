import { Shift, Employee, Machine, ValidationIssue } from '../domain/types';

interface WorkBlock {
  start: number;
  end: number;
  shiftIds: string[];
}

export const validate = (shifts: Shift[], employees: Employee[], machines: Machine[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  
  // 1. Employee collision & rules
  const shiftsByEmployee = shifts.reduce((acc, shift) => {
    for (const empId of shift.employeeIds) {
      if (!acc[empId]) acc[empId] = [];
      acc[empId].push(shift);
    }
    return acc;
  }, {} as Record<string, Shift[]>);

  for (const [employeeId, empShifts] of Object.entries(shiftsByEmployee)) {
    empShifts.sort((a, b) => a.startMinuteAbsolute - b.startMinuteAbsolute);
    
    // Merge consecutive or overlapping shifts into WorkBlocks
    const blocks: WorkBlock[] = [];
    for (const shift of empShifts) {
      if (blocks.length === 0) {
        blocks.push({ start: shift.startMinuteAbsolute, end: shift.endMinuteAbsolute, shiftIds: [shift.id] });
        continue;
      }
      const lastBlock = blocks[blocks.length - 1];
      if (shift.startMinuteAbsolute <= lastBlock.end) {
        // Overlap or touching -> merge
        lastBlock.end = Math.max(lastBlock.end, shift.endMinuteAbsolute);
        lastBlock.shiftIds.push(shift.id);
        
        // If it's strictly overlapping (not just touching), it's a collision
        if (shift.startMinuteAbsolute < lastBlock.end && shift.endMinuteAbsolute > lastBlock.start) {
           // We only report collision if they actually overlap in time, not just touch
           const prevShift = empShifts.find(s => s.id === lastBlock.shiftIds[lastBlock.shiftIds.length - 2]);
           if (prevShift && shift.startMinuteAbsolute < prevShift.endMinuteAbsolute) {
             issues.push({
               type: 'error',
               message: 'Kolize směn zaměstnance',
               shiftId: shift.id,
               employeeId,
               isHardBlock: true
             });
           }
        }
      } else {
        blocks.push({ start: shift.startMinuteAbsolute, end: shift.endMinuteAbsolute, shiftIds: [shift.id] });
      }
    }

    let weeklyMinutes = 0;
    let maxRest = 0;

    for (let i = 0; i < blocks.length; i++) {
      const current = blocks[i];
      const duration = current.end - current.start;
      weeklyMinutes += duration;

      // Max shift length for the merged block
      const employee = employees.find(e => e.id === employeeId);
      const maxAllowed = employee?.maxShiftHours ? employee.maxShiftHours * 60 : 720;
      if (duration > maxAllowed) {
        issues.push({
          type: 'error',
          message: `Překročena maximální délka spojené směny (${employee?.maxShiftHours || 12}h)`,
          shiftId: current.shiftIds[0],
          employeeId,
          isHardBlock: true
        });
      }

      if (i < blocks.length - 1) {
        const next = blocks[i + 1];
        const rest = next.start - current.end;
        
        maxRest = Math.max(maxRest, rest);
        
        // 11h rest (660 minutes) (Soft Block / Warning)
        if (rest < 660) {
          issues.push({
            type: 'warning',
            message: `Porušení 11h nepřetržitého odpočinku (odpočinek byl jen ${Math.round(rest/60)}h)`,
            shiftId: next.shiftIds[0],
            employeeId,
            isHardBlock: false
          });
        }
      }
    }
    
    // 35h weekly rest (2100 minutes)
    // We only check this if there are multiple blocks spanning more than a few days
    if (blocks.length > 1) {
      const totalSpan = blocks[blocks.length - 1].end - blocks[0].start;
      if (totalSpan > 7 * 24 * 60 && maxRest < 2100) {
         issues.push({
            type: 'warning',
            message: 'Porušení 35h nepřetržitého odpočinku v týdnu',
            employeeId,
            isHardBlock: false
         });
      }
    }
    
    // Weekly limit
    const employeeForWeekly = employees.find(e => e.id === employeeId);
    if (employeeForWeekly && weeklyMinutes > employeeForWeekly.weeklyLimitHours * 60) {
      issues.push({
        type: 'warning',
        message: `Překročen týdenní limit (${Math.round(weeklyMinutes/60)}h / ${employeeForWeekly.weeklyLimitHours}h)`,
        employeeId,
        isHardBlock: false
      });
    }
  }

  // 2. Machine capacity & Occupancy
  for (const shift of shifts) {
    const machine = machines.find(m => m.id === shift.machineId);
    if (!machine) continue;

    // Check min capacity (Soft Block)
    if (machine.minCapacity !== undefined && shift.employeeIds.length < machine.minCapacity) {
      issues.push({
        type: 'warning',
        message: `Nízké obsazení (min. ${machine.minCapacity} zam.)`,
        shiftId: shift.id,
        isHardBlock: false
      });
    }

    // Check max capacity (Hard Block)
    if (shift.employeeIds.length > machine.capacity) {
      issues.push({
        type: 'error',
        message: `Překročena kapacita stroje (${machine.capacity} zam.)`,
        shiftId: shift.id,
        isHardBlock: true
      });
    }
  }

  const shiftsBySubMachine = shifts.reduce((acc, shift) => {
    const key = `${shift.machineId}-${shift.subColumnIndex || 0}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(shift);
    return acc;
  }, {} as Record<string, Shift[]>);

  for (const [key, machShifts] of Object.entries(shiftsBySubMachine)) {
    const machineId = key.split('-')[0];
    const machine = machines.find(m => m.id === machineId);
    if (!machine) continue;

    const points = [];
    for (const s of machShifts) {
      points.push({ time: s.startMinuteAbsolute, type: 'start', shiftId: s.id });
      points.push({ time: s.endMinuteAbsolute, type: 'end', shiftId: s.id });
    }
    points.sort((a, b) => a.time - b.time || (a.type === 'end' ? -1 : 1));

    let currentLoad = 0;
    for (const p of points) {
      if (p.type === 'start') {
        currentLoad++;
        if (currentLoad > 1) {
          issues.push({
            type: 'error',
            message: `Kolize bloků směn na stroji (${machine.name})`,
            shiftId: p.shiftId,
            isHardBlock: true
          });
        }
      } else {
        currentLoad--;
      }
    }
  }

  // 3. Skill violation
  for (const shift of shifts) {
    for (const empId of shift.employeeIds) {
      const employee = employees.find(e => e.id === empId);
      if (employee && !employee.allowedMachineIds.includes(shift.machineId)) {
        issues.push({
          type: 'error',
          message: `Zaměstnanec nemá oprávnění pro tento stroj`,
          shiftId: shift.id,
          employeeId: employee.id,
          isHardBlock: true
        });
      }
    }
  }

  return issues;
};

export const evaluateEmployeeForShift = (employee: Employee, shift: Shift, allShifts: Shift[], machines: Machine[]): ValidationIssue[] => {
  const hypotheticalShifts = allShifts.map(s => 
    s.id === shift.id 
      ? { ...s, employeeIds: s.employeeIds.includes(employee.id) ? s.employeeIds : [...s.employeeIds, employee.id] } 
      : s
  );
  const issues = validate(hypotheticalShifts, [employee], machines);
  return issues.filter(i => i.employeeId === employee.id && (i.shiftId === shift.id || i.shiftId === undefined));
};
