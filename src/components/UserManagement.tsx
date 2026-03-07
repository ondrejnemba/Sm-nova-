import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, ShieldAlert } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  is_approved: boolean;
  password_cleartext: string | null;
  created_at: string;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_approved: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      alert('Chyba při změně stavu: ' + err.message);
    }
  };

  const deleteUser = async (id: string) => {
    if (!supabase) return;
    if (!window.confirm('Opravdu chcete smazat tohoto uživatele?')) return;
    
    try {
      // Smazání z user_profiles (pokud je nastaven kaskádový delete, smaže se i z auth.users, 
      // ale z bezpečnostních důvodů Supabase neumožňuje mazat z auth.users přímo z klienta bez admin role.
      // Prozatím smažeme profil, což uživateli znemožní přihlášení.)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      await fetchUsers();
    } catch (err: any) {
      alert('Chyba při mazání: ' + err.message);
    }
  };

  if (!supabase) return null;

  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
      <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-orange-600" />
        <h3 className="font-semibold text-orange-900">Správa uživatelů a schvalování</h3>
      </div>
      
      <div className="p-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-sm text-gray-500">Načítání uživatelů...</div>
        ) : users.length === 0 ? (
          <div className="text-sm text-gray-500">Zatím nejsou registrováni žádní uživatelé.</div>
        ) : (
          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {user.email}
                    {user.is_approved ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full font-bold uppercase tracking-wider">
                        Schváleno
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full font-bold uppercase tracking-wider">
                        Čeká na schválení
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Heslo: <span className="font-mono bg-gray-200 px-1 rounded">{user.password_cleartext || '***'}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleApproval(user.id, user.is_approved)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      user.is_approved 
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {user.is_approved ? 'Zrušit schválení' : 'Schválit přístup'}
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Smazat uživatele"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
