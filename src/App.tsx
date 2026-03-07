/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmployeeRibbon } from './components/EmployeeRibbon';
import { MainGrid } from './components/MainGrid';
import { SettingsPanel } from './components/SettingsPanel';
import { ExportDialog } from './components/ExportDialog';
import { Auth } from './components/Auth';
import { useEffect, useState } from 'react';
import { useScheduleStore } from './store/scheduleStore';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const syncWithSupabase = useScheduleStore(state => state.syncWithSupabase);
  const isSyncing = useScheduleStore(state => state.isSyncing);
  const lastSyncError = useScheduleStore(state => state.lastSyncError);
  const [session, setSession] = useState<Session | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setAuthInitialized(true);
      return;
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_approved')
          .eq('id', session.user.id)
          .single();
          
        if (!profile?.is_approved) {
          await supabase.auth.signOut();
          setSession(null);
        } else {
          setSession(session);
        }
      } else {
        setSession(null);
      }
      setAuthInitialized(true);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (newSession?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_approved')
          .eq('id', newSession.user.id)
          .single();
          
        if (!profile?.is_approved) {
          await supabase.auth.signOut();
          setSession(null);
          return;
        }
      }
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (supabase && session) {
      syncWithSupabase();
    }
  }, [syncWithSupabase, session]);

  if (!authInitialized) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Načítání...</div>;
  }

  if (supabase && !session) {
    return <Auth />;
  }

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
