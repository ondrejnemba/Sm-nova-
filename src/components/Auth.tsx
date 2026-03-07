import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock } from 'lucide-react';

export const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Supabase není nakonfigurováno.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const isAllowedEmail = email.toLowerCase().endsWith('@emba.cz') || email.toLowerCase() === 'embapama2@gmail.com';
        if (!isAllowedEmail) {
          setError('Registrace je povolena pouze pro firemní e-maily (@emba.cz).');
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              password_cleartext: password
            }
          }
        });
        if (error) throw error;
        setError('Registrace proběhla úspěšně. Zkontrolujte svůj e-mail a klikněte na potvrzovací odkaz. Následně musí váš účet schválit administrátor (ondrej.nosek@emba.cz).');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Check if user is approved (admin bypass)
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('is_approved')
            .eq('id', data.user.id)
            .single();
            
          const userEmail = data.user.email?.toLowerCase();
          const isAdmin = userEmail === 'ondrej.nosek@emba.cz' || userEmail === 'embapama2@gmail.com' || userEmail === 'marek.michalko@emba.cz';
            
          if (!isAdmin && (profileError || !profile?.is_approved)) {
            await supabase.auth.signOut();
            throw new Error('Váš účet zatím nebyl schválen administrátorem (ondrej.nosek@emba.cz).');
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Došlo k chybě při přihlašování.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
          <Lock className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isSignUp ? 'Vytvořit účet' : 'Přihlášení do systému'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleAuth}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Heslo
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Zpracování...' : (isSignUp ? 'Registrovat' : 'Přihlásit')}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-center text-sm text-emerald-600 hover:text-emerald-500"
            >
              {isSignUp ? 'Již máte účet? Přihlaste se' : 'Nemáte účet? Zaregistrujte se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
