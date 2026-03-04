import React, { useState } from 'react';
import { X, Calendar, Printer, Layout, ChevronRight, Check } from 'lucide-react';
import { useScheduleStore } from '../store/scheduleStore';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';

export const ExportDialog = () => {
  const isOpen = useScheduleStore(state => state.exportOpen);
  const toggleExport = useScheduleStore(state => state.toggleExport);
  const machineGroups = useScheduleStore(state => state.machineGroups);
  const machines = useScheduleStore(state => state.machines);
  const shifts = useScheduleStore(state => state.shifts);
  const employees = useScheduleStore(state => state.employees);

  const [dateRange, setDateRange] = useState<'3days' | 'week' | 'custom'>('week');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedGroups, setSelectedGroups] = useState<string[]>(machineGroups.map(g => g.id));
  const [layoutType, setLayoutType] = useState<'compact' | 'detailed'>('compact');

  if (!isOpen) return null;

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.error("Print failed:", e);
      alert("Tisk se nezdařil. V náhledu může být blokován. Otevřete aplikaci v novém okně (Shared App URL) a zkuste to znovu.");
    }
  };

  const getExportDays = () => {
    const start = new Date(startDate);
    let end: Date;
    if (dateRange === '3days') {
      end = addDays(start, 2);
    } else if (dateRange === 'week') {
      const weekStart = startOfWeek(start, { weekStartsOn: 1 });
      end = endOfWeek(weekStart, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end });
    } else {
      end = addDays(start, 6); // Default custom to 7 days for now
    }
    return eachDayOfInterval({ start, end });
  };

  const exportDays = getExportDays();

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm no-print">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold">Exportovat rozpis</h2>
          </div>
          <button onClick={toggleExport} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Rozsah dat */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Rozsah dat
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '3days', label: '3 dny', desc: 'Od vybraného dne' },
                { id: 'week', label: 'Celý týden', desc: 'Aktuální kalendářní týden' },
                { id: 'custom', label: '7 dní', desc: 'Od vybraného dne' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setDateRange(opt.id as any)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    dateRange === opt.id 
                      ? 'border-red-600 bg-red-50 ring-2 ring-red-600/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-sm">{opt.label}</div>
                  <div className="text-[10px] text-gray-500">{opt.desc}</div>
                </button>
              ))}
            </div>
            
            <div className="mt-4">
              <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Počáteční datum</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-red-600 outline-none"
              />
            </div>
          </section>

          {/* Střediska */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layout className="w-4 h-4" /> Střediska k exportu
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {machineGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => {
                    setSelectedGroups(prev => 
                      prev.includes(group.id) 
                        ? prev.filter(id => id !== group.id)
                        : [...prev, group.id]
                    );
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    selectedGroups.includes(group.id)
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-gray-100 bg-gray-50 text-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium">{group.name}</span>
                  {selectedGroups.includes(group.id) && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </section>

          {/* Náhled rozvržení */}
          <section className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Náhled exportu</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ChevronRight className="w-4 h-4 text-red-600" />
                <span>Bude vygenerováno <strong>{selectedGroups.length}</strong> stran (jedno středisko na stranu)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ChevronRight className="w-4 h-4 text-red-600" />
                <span>Období: <strong>{format(exportDays[0], 'd.M.')} - {format(exportDays[exportDays.length - 1], 'd.M. yyyy')}</strong></span>
              </div>
            </div>
          </section>
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button 
            onClick={toggleExport}
            className="flex-1 py-3 px-4 rounded-lg border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Zrušit
          </button>
          <button 
            onClick={handlePrint}
            className="flex-[2] py-3 px-4 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
          >
            <Printer className="w-5 h-5" />
            Vytisknout / Uložit PDF
          </button>
        </div>
      </div>
      </div>

      {/* Hidden Print Content - This will be rendered but only visible during printing */}
      <div id="print-container" className="print-only fixed inset-0 bg-white z-[9999] overflow-auto p-0 m-0">
        {Array.from({ length: Math.ceil(selectedGroups.length / 2) }).map((_, pageIdx) => {
          const groupPair = selectedGroups.slice(pageIdx * 2, pageIdx * 2 + 2);

          return (
            <div key={pageIdx} className={`p-4 bg-white ${pageIdx > 0 ? 'break-before-page' : ''}`} style={{ minHeight: '210mm', width: '297mm', pageBreakAfter: 'always' }}>
              <header className="flex justify-between items-center border-b-2 border-gray-900 pb-2 mb-4">
                <div>
                  <h1 className="text-xl font-black text-gray-900 leading-none uppercase tracking-tighter">Rozpis směn</h1>
                  <p className="text-gray-600 font-bold text-[10px] uppercase mt-1">
                    Střediska: <span className="text-gray-900">{groupPair.map(id => machineGroups.find(g => g.id === id)?.name).join(', ')}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">Období</p>
                  <p className="text-xs font-black text-gray-900">
                    {format(exportDays[0], 'd. M.')} — {format(exportDays[exportDays.length - 1], 'd. M. yyyy')}
                  </p>
                </div>
              </header>

              <div className="flex gap-4">
                {groupPair.map(groupId => {
                  const group = machineGroups.find(g => g.id === groupId);
                  if (!group) return null;
                  const groupMachines = machines.filter(m => m.groupId === groupId);

                  return (
                    <div key={groupId} className="flex-1 min-w-0">
                      <h2 className="text-xs font-bold text-gray-900 uppercase mb-1">{group.name}</h2>
                      <table className="w-full border-collapse border border-gray-900 table-fixed">
                        <thead>
                          <tr>
                            <th className="border border-gray-900 p-0.5 bg-gray-50 text-left w-[16%] text-[8px] font-black uppercase">Stroj</th>
                            {exportDays.map(day => (
                              <th key={day.toISOString()} className="border border-gray-900 p-0.5 bg-gray-50 text-center text-[8px] font-black uppercase">
                                <div className="text-gray-500">{format(day, 'EEEE', { locale: cs }).substring(0, 2)}</div>
                                <div className="text-gray-900">{format(day, 'd.M.')}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {groupMachines.map(machine => (
                            <tr key={machine.id}>
                              <td className="border border-gray-900 p-0.5 font-bold text-[8px] bg-gray-50 truncate">
                                {machine.name}
                              </td>
                              {exportDays.map(day => {
                                const dayShifts = shifts.filter(s => 
                                  s.machineId === machine.id && 
                                  isSameDay(new Date(s.startMinuteAbsolute * 60000), day)
                                ).sort((a, b) => a.startMinuteAbsolute - b.startMinuteAbsolute);

                                return (
                                  <td key={day.toISOString()} className="border border-gray-900 p-0.5 align-top min-h-[30px]">
                                    <div className="flex flex-col gap-0.5">
                                      {dayShifts.map(shift => {
                                        const shiftEmployees = shift.employeeIds
                                          .map(id => employees.find(e => e.id === id))
                                          .filter(Boolean);
                                        
                                        return (
                                          <div key={shift.id} className="text-[7px] leading-tight border-b border-gray-100 last:border-0 pb-0.5">
                                            <div className="font-bold text-gray-500 flex justify-between">
                                              <span>{format(new Date(shift.startMinuteAbsolute * 60000), 'HH:mm')}-{format(new Date(shift.endMinuteAbsolute * 60000), 'HH:mm')}</span>
                                            </div>
                                            <div className="font-medium text-gray-900 line-clamp-2" title={shiftEmployees.map(e => e?.name).join(', ')}>
                                              {shiftEmployees.map(e => e?.name.split(' ')[0]).join(', ')}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>

              <footer className="mt-4 pt-2 border-t border-gray-100 flex justify-between text-[7px] font-bold text-gray-400 uppercase">
                <div>EMBA Směnovač • {format(new Date(), 'd. M. yyyy HH:mm')}</div>
                <div>Strana {pageIdx + 1} / {Math.ceil(selectedGroups.length / 2)}</div>
              </footer>
            </div>
          );
        })}
      </div>
    </>
  );
};
