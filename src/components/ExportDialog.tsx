import React, { useState } from 'react';
import { X, Calendar, Printer, Layout, ChevronRight, Check, Settings2 } from 'lucide-react';
import { useScheduleStore } from '../store/scheduleStore';
import { cn } from '../utils/cn';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { cs } from 'date-fns/locale';

export const ExportDialog = () => {
  const isOpen = useScheduleStore(state => state.exportOpen);
  const toggleExport = useScheduleStore(state => state.toggleExport);
  const machineGroups = useScheduleStore(state => state.machineGroups);
  const machines = useScheduleStore(state => state.machines);
  const shifts = useScheduleStore(state => state.shifts);
  const employees = useScheduleStore(state => state.employees);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedGroups, setSelectedGroups] = useState<string[]>(machineGroups.map(g => g.id));
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [scale, setScale] = useState(100);

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
    const baseDate = addDays(new Date(), weekOffset * 7);
    const weekStart = startOfWeek(baseDate, { weekStartsOn: 1 });
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end });
  };

  const exportDays = getExportDays();

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm no-print">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold">Exportovat týdenní rozpis</h2>
          </div>
          <button onClick={toggleExport} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Výběr týdne */}
          <section>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Výběr týdne
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { offset: 0, label: 'Tento týden' },
                { offset: 1, label: 'Příští týden' },
                { offset: 2, label: 'Za 2 týdny' },
              ].map((opt) => (
                <button
                  key={opt.offset}
                  onClick={() => setWeekOffset(opt.offset)}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    weekOffset === opt.offset 
                      ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600/20' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-bold text-sm">{opt.label}</div>
                </button>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                {format(exportDays[0], 'd. M.')} — {format(exportDays[6], 'd. M. yyyy')}
              </span>
              <span className="text-[10px] font-bold text-blue-400 uppercase">
                {format(exportDays[0], 'w')}. týden
              </span>
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
                      ? 'border-blue-200 bg-blue-50 text-blue-900'
                      : 'border-gray-100 bg-gray-50 text-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium">{group.name}</span>
                  {selectedGroups.includes(group.id) && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </section>

          {/* Nastavení tisku */}
          <section className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Nastavení tisku
            </h4>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Orientace */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Orientace papíru</label>
                <div className="flex bg-white rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors",
                      orientation === 'portrait' ? "bg-blue-100 text-blue-800" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    Na výšku
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={cn(
                      "flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors",
                      orientation === 'landscape' ? "bg-blue-100 text-blue-800" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    Na šířku
                  </button>
                </div>
              </div>

              {/* Měřítko */}
              <div>
                <label className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-2">
                  <span>Měřítko</span>
                  <span className="text-blue-600">{scale}%</span>
                </label>
                <input 
                  type="range" 
                  min="50" 
                  max="150" 
                  step="5"
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Menší (50%)</span>
                  <span>Výchozí (100%)</span>
                  <span>Větší (150%)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm text-gray-600">
              <ChevronRight className="w-4 h-4 text-blue-600" />
              <span>Celkem stran k tisku: <strong>{selectedGroups.length}</strong></span>
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
            className="flex-[2] py-3 px-4 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-5 h-5" />
            Vytisknout / Uložit PDF
          </button>
        </div>
      </div>
      </div>

      {/* Hidden Print Content - Optimized for A4 */}
      <style type="text/css" media="print">
        {`
          @page {
            size: A4 ${orientation};
            margin: 10mm;
          }
        `}
      </style>
      <div id="print-container" className="print-only fixed inset-0 bg-white z-[9999] overflow-auto p-0 m-0">
        {selectedGroups.map((groupId, pageIdx) => {
          const group = machineGroups.find(g => g.id === groupId);
          if (!group) return null;
          const groupMachines = machines.filter(m => m.groupId === groupId);

          const pageWidth = orientation === 'portrait' ? '210mm' : '297mm';
          const pageHeight = orientation === 'portrait' ? '297mm' : '210mm';

          return (
            <div 
              key={groupId} 
              className={`p-8 bg-white ${pageIdx > 0 ? 'break-before-page' : ''}`} 
              style={{ 
                minHeight: pageHeight, 
                width: pageWidth, 
                pageBreakAfter: 'always', 
                color: '#000', 
                fontFamily: 'Inter, sans-serif',
                zoom: scale / 100
              }}
            >
              <header className="flex justify-between items-end mb-8 border-b-2 border-gray-900 pb-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">Týdenní rozpis směn</div>
                  <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{group.name}</h1>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1">
                    {format(exportDays[0], 'w')}. týden ({format(exportDays[0], 'yyyy')})
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {format(exportDays[0], 'd. M.')} — {format(exportDays[6], 'd. M. yyyy')}
                  </div>
                </div>
              </header>

              <div className="w-full overflow-hidden border border-gray-300 rounded-lg">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300">
                      <th className="w-24 p-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200">Den</th>
                      {groupMachines.map(machine => (
                        <th key={machine.id} className="p-2 text-[10px] font-bold text-gray-900 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                          {machine.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exportDays.map((day, dayIdx) => (
                      <tr key={day.toISOString()} className={cn("border-b border-gray-200 last:border-b-0", dayIdx % 2 === 1 ? "bg-gray-50/30" : "bg-white")}>
                        <td className="p-2 border-r border-gray-200 align-top">
                          <div className="text-[10px] font-bold text-gray-400 uppercase mb-0.5">{format(day, 'EEEE', { locale: cs })}</div>
                          <div className="text-sm font-black text-gray-900">{format(day, 'd. M.')}</div>
                        </td>
                        {groupMachines.map(machine => {
                          const dayShifts = shifts.filter(s => 
                            s.machineId === machine.id && 
                            isSameDay(new Date(s.startMinuteAbsolute * 60000), day)
                          ).sort((a, b) => a.startMinuteAbsolute - b.startMinuteAbsolute);

                          return (
                            <td key={machine.id} className="p-1 border-r border-gray-200 last:border-r-0 align-top min-h-[60px]">
                              <div className="flex flex-col gap-1">
                                {dayShifts.map(shift => {
                                  const shiftEmployees = shift.employeeIds
                                    .map(id => employees.find(e => e.id === id))
                                    .filter(Boolean);
                                  
                                  const durationMinutes = shift.endMinuteAbsolute - shift.startMinuteAbsolute;
                                  const is12h = durationMinutes >= 710 && durationMinutes <= 730;

                                  return (
                                    <div 
                                      key={shift.id} 
                                      className={cn(
                                        "p-1.5 rounded border border-gray-200",
                                        (is12h && group.highlight12h) ? "bg-amber-50 border-amber-200" : "bg-white"
                                      )}
                                    >
                                      <div className="flex justify-between items-center mb-1 text-[9px] font-bold text-gray-500 border-b border-gray-100 pb-0.5">
                                        <span>{format(new Date(shift.startMinuteAbsolute * 60000), 'HH:mm')}</span>
                                        <span>{format(new Date(shift.endMinuteAbsolute * 60000), 'HH:mm')}</span>
                                      </div>
                                      <div className="space-y-0.5">
                                        {shiftEmployees.map(e => (
                                          <div key={e?.id} className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: e?.color }} />
                                            <span className="text-[9px] font-bold text-gray-900 truncate uppercase tracking-tighter">{e?.name}</span>
                                          </div>
                                        ))}
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

              <div className="mt-8 grid grid-cols-2 gap-8">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Poznámky</h3>
                  <div className="space-y-3">
                    <div className="h-px bg-gray-200" />
                    <div className="h-px bg-gray-200" />
                    <div className="h-px bg-gray-200" />
                  </div>
                </div>
                <div className="flex flex-col justify-end gap-6 pb-2">
                  <div className="flex justify-between items-end px-4">
                    <div className="text-center">
                      <div className="w-32 border-b border-gray-900 mb-1" />
                      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Mistr</p>
                    </div>
                    <div className="text-center">
                      <div className="w-32 border-b border-gray-900 mb-1" />
                      <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Schválil</p>
                    </div>
                  </div>
                  <div className="text-[8px] text-gray-400 italic text-center px-4">
                    Tento dokument je závazným rozpisem směn. Změny podléhají schválení.
                  </div>
                </div>
              </div>

              <footer className="mt-auto pt-4 border-t border-gray-200 flex justify-between text-[8px] font-medium text-gray-400 uppercase tracking-widest">
                <div>EMBA Směnovač • {format(new Date(), 'd. M. yyyy HH:mm')}</div>
                <div>Strana {pageIdx + 1} / {selectedGroups.length}</div>
              </footer>
            </div>
          );
        })}
      </div>
    </>
  );
};
