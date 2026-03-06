import { useScheduleStore } from '../store/scheduleStore';
import { X, Plus, Trash2, Edit2, Check, GripVertical } from 'lucide-react';
import { generateId } from '../utils/id';
import { useState } from 'react';
import { Employee, MachineGroup, Machine, EmployeeGroup } from '../domain/types';

export const SettingsPanel = () => {
  const settingsOpen = useScheduleStore(state => state.settingsOpen);
  const toggleSettings = useScheduleStore(state => state.toggleSettings);
  
  const employees = useScheduleStore(state => state.employees);
  const addEmployee = useScheduleStore(state => state.addEmployee);
  const updateEmployee = useScheduleStore(state => state.updateEmployee);
  const deleteEmployee = useScheduleStore(state => state.deleteEmployee);
  const reorderEmployees = useScheduleStore(state => state.reorderEmployees);

  const employeeGroups = useScheduleStore(state => state.employeeGroups);
  const addEmployeeGroup = useScheduleStore(state => state.addEmployeeGroup);
  const updateEmployeeGroup = useScheduleStore(state => state.updateEmployeeGroup);
  const deleteEmployeeGroup = useScheduleStore(state => state.deleteEmployeeGroup);
  
  const machineGroups = useScheduleStore(state => state.machineGroups);
  const addMachineGroup = useScheduleStore(state => state.addMachineGroup);
  const updateMachineGroup = useScheduleStore(state => state.updateMachineGroup);
  const deleteMachineGroup = useScheduleStore(state => state.deleteMachineGroup);
  const reorderMachineGroups = useScheduleStore(state => state.reorderMachineGroups);
  
  const machines = useScheduleStore(state => state.machines);
  const addMachine = useScheduleStore(state => state.addMachine);
  const updateMachine = useScheduleStore(state => state.updateMachine);
  const deleteMachine = useScheduleStore(state => state.deleteMachine);
  const reorderMachines = useScheduleStore(state => state.reorderMachines);

  const snapGranularityMinutes = useScheduleStore(state => state.snapGranularityMinutes);
  const setSnapGranularityMinutes = useScheduleStore(state => state.setSnapGranularityMinutes);
  const defaultShiftHours = useScheduleStore(state => state.defaultShiftHours);
  const setDefaultShiftHours = useScheduleStore(state => state.setDefaultShiftHours);
  const viewGranularityHours = useScheduleStore(state => state.viewGranularityHours);
  const setViewGranularityHours = useScheduleStore(state => state.setViewGranularityHours);

  const [newEmpName, setNewEmpName] = useState('');
  const [newEmployeeGroupName, setNewEmployeeGroupName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newMachineName, setNewMachineName] = useState('');
  const [newMachineGroupId, setNewMachineGroupId] = useState('');
  const [newMachineCapacity, setNewMachineCapacity] = useState(1);
  const [newMachineMinCapacity, setNewMachineMinCapacity] = useState(1);
  const [newMachineIdealCapacity, setNewMachineIdealCapacity] = useState(1);
  const [newMachineVirtualColumns, setNewMachineVirtualColumns] = useState(1);

  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [editingEmployeeGroupId, setEditingEmployeeGroupId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);

  // Drag and Drop States
  const [draggedEmpIndex, setDraggedEmpIndex] = useState<number | null>(null);
  const [draggedGroupIndex, setDraggedGroupIndex] = useState<number | null>(null);
  const [draggedMachineIndex, setDraggedMachineIndex] = useState<number | null>(null);

  if (!settingsOpen) return null;

  const handleAddEmployee = () => {
    if (!newEmpName) return;
    addEmployee({
      id: generateId(),
      name: newEmpName,
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      weeklyLimitHours: 40,
      maxShiftHours: 12,
      allowedMachineIds: machines.map(m => m.id)
    });
    setNewEmpName('');
  };

  const handleAddEmployeeGroup = () => {
    if (!newEmployeeGroupName) return;
    addEmployeeGroup({
      id: generateId(),
      name: newEmployeeGroupName
    });
    setNewEmployeeGroupName('');
  };

  const handleAddGroup = () => {
    if (!newGroupName) return;
    addMachineGroup({
      id: generateId(),
      name: newGroupName
    });
    setNewGroupName('');
  };

  const handleAddMachine = () => {
    if (!newMachineName || !newMachineGroupId) return;
    addMachine({
      id: generateId(),
      name: newMachineName,
      groupId: newMachineGroupId,
      capacity: newMachineCapacity,
      minCapacity: newMachineMinCapacity,
      idealCapacity: newMachineIdealCapacity,
      virtualColumns: newMachineVirtualColumns
    });
    setNewMachineName('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end no-print">
      <div className="w-[500px] bg-white h-full shadow-2xl flex flex-col">
        <div className="h-14 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <h2 className="text-lg font-semibold">Nastavení</h2>
          <button onClick={toggleSettings} className="p-2 hover:bg-gray-100 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Obecné</h3>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between p-3 border border-gray-100 rounded-md">
                <span className="text-sm font-medium">Výchozí délka směny (h)</span>
                <select 
                  value={defaultShiftHours}
                  onChange={e => setDefaultShiftHours(Number(e.target.value))}
                  className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value={1}>1 hodina</option>
                  <option value={2}>2 hodiny</option>
                  <option value={4}>4 hodiny</option>
                  <option value={8}>8 hodin</option>
                  <option value={12}>12 hodin</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-100 rounded-md">
                <span className="text-sm font-medium">Zobrazení časové osy</span>
                <select 
                  value={viewGranularityHours}
                  onChange={e => setViewGranularityHours(Number(e.target.value))}
                  className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value={1}>1 hodina</option>
                  <option value={2}>2 hodiny</option>
                  <option value={3}>3 hodiny</option>
                  <option value={4}>4 hodiny</option>
                  <option value={6}>6 hodin</option>
                  <option value={8}>8 hodin</option>
                  <option value={12}>12 hodin</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Skupiny zaměstnanců</h3>
            <div className="flex flex-col gap-2">
              {employeeGroups.map(group => (
                <div key={group.id} className="flex flex-col p-3 border border-gray-100 rounded-md gap-2 bg-white">
                  {editingEmployeeGroupId === group.id ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={group.name}
                        onChange={e => updateEmployeeGroup(group.id, { name: e.target.value })}
                        className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-sm"
                      />
                      <button onClick={() => setEditingEmployeeGroupId(null)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-md">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{group.name}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingEmployeeGroupId(group.id)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-md">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteEmployeeGroup(group.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <input 
                type="text" 
                value={newEmployeeGroupName}
                onChange={e => setNewEmployeeGroupName(e.target.value)}
                placeholder="Název nové skupiny" 
                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <button 
                onClick={handleAddEmployeeGroup}
                className="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-600 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Přidat skupinu
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Zaměstnanci</h3>
            <div className="space-y-2 mb-4">
              {employees.map((emp, index) => (
                <div 
                  key={emp.id} 
                  draggable
                  onDragStart={() => setDraggedEmpIndex(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedEmpIndex === null || draggedEmpIndex === index) return;
                    reorderEmployees(draggedEmpIndex, index);
                    setDraggedEmpIndex(index);
                  }}
                  onDragEnd={() => setDraggedEmpIndex(null)}
                  className={`flex flex-col p-3 border border-gray-100 rounded-md gap-2 bg-white transition-all ${draggedEmpIndex === index ? 'opacity-50 scale-[0.98]' : ''}`}
                >
                  {editingEmpId === emp.id ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={emp.color} 
                          onChange={e => updateEmployee(emp.id, { color: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                        />
                        <input 
                          type="text" 
                          value={emp.name}
                          onChange={e => updateEmployee(emp.id, { name: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-sm"
                        />
                        <button onClick={() => setEditingEmpId(null)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-md">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-sm mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Skupina:</span>
                          <select 
                            value={emp.groupId || ''}
                            onChange={e => updateEmployee(emp.id, { groupId: e.target.value || undefined })}
                            className="border border-gray-200 rounded-md px-2 py-1 text-sm"
                          >
                            <option value="">Bez skupiny</option>
                            {employeeGroups.map(g => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Týdenní limit (h):</span>
                          <input 
                            type="number" 
                            value={emp.weeklyLimitHours}
                            onChange={e => updateEmployee(emp.id, { weeklyLimitHours: Number(e.target.value) })}
                            className="w-20 border border-gray-200 rounded-md px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Max délka směny (h):</span>
                          <input 
                            type="number" 
                            value={emp.maxShiftHours || 12}
                            onChange={e => updateEmployee(emp.id, { maxShiftHours: Number(e.target.value) })}
                            className="w-20 border border-gray-200 rounded-md px-2 py-1 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="text-gray-500 text-sm font-medium">Oprávnění pro stroje:</span>
                        <div className="flex flex-wrap gap-2">
                          {machines.map(m => (
                            <label key={m.id} className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-gray-100">
                              <input 
                                type="checkbox"
                                checked={emp.allowedMachineIds.includes(m.id)}
                                onChange={e => {
                                  const newIds = e.target.checked 
                                    ? [...emp.allowedMachineIds, m.id]
                                    : emp.allowedMachineIds.filter(id => id !== m.id);
                                  updateEmployee(emp.id, { allowedMachineIds: newIds });
                                }}
                              />
                              {m.name}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: emp.color }} />
                        <span className="text-sm font-medium">{emp.name}</span>
                        <span className="text-xs text-gray-400">({emp.weeklyLimitHours}h)</span>
                        {emp.groupId && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 font-bold uppercase">
                            {employeeGroups.find(g => g.id === emp.groupId)?.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingEmpId(emp.id)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-md">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteEmployee(emp.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <input 
                type="text" 
                value={newEmpName}
                onChange={e => setNewEmpName(e.target.value)}
                placeholder="Jméno nového zaměstnance" 
                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <button 
                onClick={handleAddEmployee}
                className="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-600 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Přidat
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Skupiny strojů</h3>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="Název skupiny" 
                className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <button 
                onClick={handleAddGroup}
                className="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-600 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Přidat
              </button>
            </div>
            <div className="space-y-2">
              {machineGroups.map((group, index) => (
                <div 
                  key={group.id} 
                  draggable
                  onDragStart={() => setDraggedGroupIndex(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedGroupIndex === null || draggedGroupIndex === index) return;
                    reorderMachineGroups(draggedGroupIndex, index);
                    setDraggedGroupIndex(index);
                  }}
                  onDragEnd={() => setDraggedGroupIndex(null)}
                  className={`flex items-center justify-between p-3 border border-gray-100 rounded-md bg-white transition-all ${draggedGroupIndex === index ? 'opacity-50 scale-[0.98]' : ''}`}
                >
                  {editingGroupId === group.id ? (
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={group.name}
                          onChange={e => updateMachineGroup(group.id, { name: e.target.value })}
                          className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-sm"
                        />
                        <button onClick={() => setEditingGroupId(null)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-md">
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={!!group.highlight12h}
                          onChange={e => updateMachineGroup(group.id, { highlight12h: e.target.checked })}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        Zvýraznit 12h směny v exportu (oranžově)
                      </label>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">{group.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingGroupId(group.id)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-md">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteMachineGroup(group.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Stroje</h3>
            <div className="flex flex-col gap-2 mb-4">
              <input 
                type="text" 
                value={newMachineName}
                onChange={e => setNewMachineName(e.target.value)}
                placeholder="Název stroje" 
                className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <select 
                  value={newMachineGroupId}
                  onChange={e => setNewMachineGroupId(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="">Vyberte skupinu</option>
                  {machineGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <input 
                  type="number" 
                  min="1"
                  value={newMachineCapacity}
                  onChange={e => setNewMachineCapacity(parseInt(e.target.value) || 1)}
                  placeholder="Max" 
                  title="Maximální kapacita"
                  className="w-16 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <input 
                  type="number" 
                  min="1"
                  value={newMachineMinCapacity}
                  onChange={e => setNewMachineMinCapacity(parseInt(e.target.value) || 1)}
                  placeholder="Min" 
                  title="Minimální kapacita"
                  className="w-16 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <input 
                  type="number" 
                  min="1"
                  value={newMachineIdealCapacity}
                  onChange={e => setNewMachineIdealCapacity(parseInt(e.target.value) || 1)}
                  placeholder="Ideál" 
                  title="Ideální kapacita"
                  className="w-16 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <input 
                  type="number" 
                  min="1"
                  max="5"
                  value={newMachineVirtualColumns}
                  onChange={e => setNewMachineVirtualColumns(parseInt(e.target.value) || 1)}
                  placeholder="V-Sloupce" 
                  title="Virtuální sloupce"
                  className="w-20 border border-gray-200 rounded-md px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <button 
                onClick={handleAddMachine}
                className="bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-600 flex items-center justify-center gap-2 mt-2"
              >
                <Plus className="w-4 h-4" /> Přidat stroj
              </button>
            </div>
            <div className="space-y-2">
              {machines.map((machine, index) => {
                const group = machineGroups.find(g => g.id === machine.groupId);
                return (
                  <div 
                    key={machine.id} 
                    draggable
                    onDragStart={() => setDraggedMachineIndex(index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedMachineIndex === null || draggedMachineIndex === index) return;
                      reorderMachines(draggedMachineIndex, index);
                      setDraggedMachineIndex(index);
                    }}
                    onDragEnd={() => setDraggedMachineIndex(null)}
                    className={`flex flex-col p-3 border border-gray-100 rounded-md gap-2 bg-white transition-all ${draggedMachineIndex === index ? 'opacity-50 scale-[0.98]' : ''}`}
                  >
                    {editingMachineId === machine.id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            value={machine.name}
                            onChange={e => updateMachine(machine.id, { name: e.target.value })}
                            className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-sm"
                          />
                          <button onClick={() => setEditingMachineId(null)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-md">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <select 
                            value={machine.groupId}
                            onChange={e => updateMachine(machine.id, { groupId: e.target.value })}
                            className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-sm"
                          >
                            {machineGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">Max:</span>
                            <input 
                              type="number" 
                              min="1"
                              value={machine.capacity}
                              onChange={e => updateMachine(machine.id, { capacity: Number(e.target.value) })}
                              className="w-12 border border-gray-200 rounded-md px-1 py-1 text-xs"
                            />
                            <span className="text-[10px] text-gray-400 ml-1">Min:</span>
                            <input 
                              type="number" 
                              min="1"
                              value={machine.minCapacity || 1}
                              onChange={e => updateMachine(machine.id, { minCapacity: Number(e.target.value) })}
                              className="w-12 border border-gray-200 rounded-md px-1 py-1 text-xs"
                            />
                            <span className="text-[10px] text-gray-400 ml-1">Ideál:</span>
                            <input 
                              type="number" 
                              min="1"
                              value={machine.idealCapacity || 1}
                              onChange={e => updateMachine(machine.id, { idealCapacity: Number(e.target.value) })}
                              className="w-12 border border-gray-200 rounded-md px-1 py-1 text-xs"
                            />
                            <span className="text-[10px] text-gray-400 ml-1" title="Virtuální sloupce">V-Sloupce:</span>
                            <input 
                              type="number" 
                              min="1"
                              max="5"
                              value={machine.virtualColumns || 1}
                              onChange={e => updateMachine(machine.id, { virtualColumns: Number(e.target.value) })}
                              className="w-12 border border-gray-200 rounded-md px-1 py-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-sm font-medium">{machine.name}</div>
                              <div className="text-xs text-gray-500">
                                {group?.name} • Max: {machine.capacity} • Min: {machine.minCapacity || 1} • Ideál: {machine.idealCapacity || 1} • V-Sloupce: {machine.virtualColumns || 1}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditingMachineId(machine.id)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded-md">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteMachine(machine.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
