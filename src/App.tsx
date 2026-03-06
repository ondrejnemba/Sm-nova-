/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmployeeRibbon } from './components/EmployeeRibbon';
import { MainGrid } from './components/MainGrid';
import { SettingsPanel } from './components/SettingsPanel';
import { ExportDialog } from './components/ExportDialog';
import { useEffect } from 'react';
import { useScheduleStore } from './store/scheduleStore';
import { supabase } from './lib/supabase';

export default function App() {
  const syncWithSupabase = useScheduleStore(state => state.syncWithSupabase);
  const isSyncing = useScheduleStore(state => state.isSyncing);
  const lastSyncError = useScheduleStore(state => state.lastSyncError);

  useEffect(() => {
    if (supabase) {
      syncWithSupabase();
    }
  }, [syncWithSupabase]);

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans overflow-hidden">
      <div className="no-print flex flex-col h-full overflow-hidden">
        {isSyncing && (
          <div className="bg-emerald-50 text-emerald-600 text-xs font-bold px-4 py-1 text-center border-b border-emerald-100">
            Synchronizace se Supabase...
          </div>
        )}
        {lastSyncError && (
          <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-1 text-center border-b border-red-100">
            Chyba připojení k Supabase: {lastSyncError}
          </div>
        )}
        <EmployeeRibbon />
        <MainGrid />
      </div>
      <SettingsPanel />
      <ExportDialog />
    </div>
  );
}
