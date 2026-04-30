import { redirect } from 'react-router';
import { auth } from '~/lib/auth.server';
import type { Route } from './+types/login';
import { Package, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session) throw redirect('/');
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get('email') ?? '').trim().toLowerCase();
    const password = String(fd.get('password') ?? '');

    try {
      const res = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      if (res.ok) {
        navigate('/');
      } else {
        const body = await res.json().catch(() => ({}));
        console.error('[login] server response:', res.status, body);
        setError('ელ-ფოსტა ან პაროლი არასწორია');
      }
    } catch (err) {
      console.error('[login] fetch error:', err);
      setError('კავშირის შეცდომა. სცადეთ თავიდან.');
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-amber-700 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-900/40 mb-4">
            <Package className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider">HYENA</h1>
          <p className="text-stone-500 text-sm mt-1">ადმინ პანელი</p>
        </div>

        {/* Card */}
        <div className="bg-stone-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-5">შესვლა</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                ელ-ფოსტა
              </label>
              <input
                type="email"
                name="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 bg-stone-800 border border-slate-700 rounded-xl text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                პაროლი
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 bg-stone-800 border border-slate-700 rounded-xl text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3.5 py-2.5 bg-red-950/60 border border-red-800 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-amber-900/30"
            >
              {loading ? 'მიმდინარეობს...' : 'შესვლა'}
            </button>
          </form>
        </div>

        <p className="text-center text-stone-600 text-xs mt-6">
          © 2026 Hyena Admin · v2.0.0
        </p>
      </div>
    </div>
  );
}
