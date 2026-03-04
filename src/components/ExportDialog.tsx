import React, { useState } from 'react';
import { X, Calendar, Printer, Layout, ChevronRight, Check } from 'lucide-react';
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

          {/* Náhled rozvržení */}
          <section className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Nastavení tisku</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ChevronRight className="w-4 h-4 text-blue-600" />
                <span>Formát: <strong>A4 na výšku</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ChevronRight className="w-4 h-4 text-blue-600" />
                <span>Rozvržení: <strong>Jedno středisko na stranu</strong></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <ChevronRight className="w-4 h-4 text-blue-600" />
                <span>Celkem stran: <strong>{selectedGroups.length}</strong></span>
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
            className="flex-[2] py-3 px-4 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Printer className="w-5 h-5" />
            Vytisknout / Uložit PDF
          </button>
        </div>
      </div>
      </div>

      {/* Hidden Print Content - Optimized for A4 Portrait */}
      <div id="print-container" className="print-only fixed inset-0 bg-white z-[9999] overflow-auto p-0 m-0">
        {selectedGroups.map((groupId, pageIdx) => {
          const group = machineGroups.find(g => g.id === groupId);
          if (!group) return null;
          const groupMachines = machines.filter(m => m.groupId === groupId);

          return (
            <div key={groupId} className={`p-10 bg-white ${pageIdx > 0 ? 'break-before-page' : ''}`} style={{ minHeight: '297mm', width: '210mm', pageBreakAfter: 'always', color: '#000' }}>
              <header className="flex justify-between items-start border-b-8 border-black pb-6 mb-8">
                <div>
                  <h1 className="text-3xl font-black text-black leading-none uppercase tracking-tighter mb-2">Týdenní rozpis směn</h1>
                  <h2 className="text-2xl font-bold text-black uppercase tracking-widest border-l-4 border-black pl-4">{group.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-500 uppercase leading-none mb-2">Období / Kalendářní týden</p>
                  <p className="text-xl font-black text-black">
                    {format(exportDays[0], 'd. M.')} — {format(exportDays[6], 'd. M. yyyy')}
                  </p>
                  <div className="mt-1 inline-block bg-black text-white px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                    {format(exportDays[0], 'w')}. Týden
                  </div>
                </div>
              </header>

              <div className="w-full">
                <table className="w-full border-collapse border-4 border-black table-fixed">
                  <thead>
                    <tr>
                      <th className="border-4 border-black p-3 bg-gray-100 text-left w-[20%] text-[11px] font-black uppercase tracking-tight">Pracoviště / Stroj</th>
                      {exportDays.map(day => (
                        <th key={day.toISOString()} className="border-4 border-black p-2 bg-gray-50 text-center text-[10px] font-black uppercase">
                          <div className="text-gray-500 mb-1">{format(day, 'EEEE', { locale: cs })}</div>
                          <div className="text-black text-sm bg-white border border-black/10 rounded py-0.5">{format(day, 'd. M.')}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupMachines.map(machine => (
                      <tr key={machine.id}>
                        <td className="border-4 border-black p-3 font-black text-[11px] bg-gray-50 align-middle leading-tight">
                          {machine.name}
                        </td>
                        {exportDays.map(day => {
                          const dayShifts = shifts.filter(s => 
                            s.machineId === machine.id && 
                            isSameDay(new Date(s.startMinuteAbsolute * 60000), day)
                          ).sort((a, b) => a.startMinuteAbsolute - b.startMinuteAbsolute);

                          return (
                            <td key={day.toISOString()} className="border-4 border-black p-1.5 align-top min-h-[80px]">
                              <div className="flex flex-col gap-1.5">
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
                                        "text-[9px] leading-tight border-2 border-black p-1.5",
                                        (is12h && group.highlight12h) ? "bg-orange-100" : "bg-white"
                                      )}
                                    >
                                      <div className="font-black text-black mb-1 border-b border-black pb-1 flex justify-between items-center">
                                        <span>{format(new Date(shift.startMinuteAbsolute * 60000), 'HH:mm')}</span>
                                        <span className="text-[7px] opacity-30">—</span>
                                        <span>{format(new Date(shift.endMinuteAbsolute * 60000), 'HH:mm')}</span>
                                      </div>
                                      <div className="font-bold text-black space-y-1">
                                        {shiftEmployees.map(e => (
                                          <div key={e?.id} className="flex items-center gap-1.5">
                                            <span className="truncate uppercase tracking-tighter">{e?.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                                {dayShifts.length === 0 && (
                                  <div className="h-16 flex items-center justify-center opacity-5">
                                    <div className="w-full h-[1px] bg-black rotate-45" />
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-12 grid grid-cols-2 gap-12">
                <div className="border-4 border-black p-6">
                  <h3 className="text-[11px] font-black uppercase text-black mb-6 border-b-2 border-black pb-2">Důležité poznámky k provozu</h3>
                  <div className="space-y-6">
                    <div className="h-[1px] bg-gray-200" />
                    <div className="h-[1px] bg-gray-200" />
                    <div className="h-[1px] bg-gray-200" />
                    <div className="h-[1px] bg-gray-200" />
                  </div>
                </div>
                <div className="flex flex-col justify-between py-4">
                  <div className="space-y-12">
                    <div className="flex justify-between items-end">
                      <div className="text-center">
                        <div className="w-48 border-b-2 border-black mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sestavil (Mistr)</p>
                      </div>
                      <div className="text-center">
                        <div className="w-48 border-b-2 border-black mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Schválil (Vedoucí)</p>
                      </div>
                    </div>
                    <div className="pt-8">
                      <div className="w-full border-2 border-black p-4 text-[9px] font-bold uppercase tracking-tight text-gray-400 italic">
                        Tento dokument je závazným rozpisem směn pro uvedené období. Jakékoliv změny musí být schváleny nadřízeným pracovníkem.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <footer className="mt-auto pt-6 border-t-4 border-black flex justify-between text-[9px] font-black text-black uppercase tracking-[0.2em]">
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
