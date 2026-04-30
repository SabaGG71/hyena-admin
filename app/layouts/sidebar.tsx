import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigation, Form, redirect } from 'react-router';
import {
  LayoutDashboard, ShoppingBag, Wallet, Menu, X,
  Package, ShoppingCart, Megaphone, TrendingUp, LogOut,
  Sun, Moon,
} from 'lucide-react';
import { auth } from '~/lib/auth.server';
import type { Route } from './+types/sidebar';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw redirect('/login');
    return { user: session.user };
  } catch (e) {
    if (e instanceof Response) throw e;
    throw redirect('/login');
  }
}

const navItems = [
  { to: '/', label: 'დაშბორდი', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'პროდუქტები', icon: ShoppingBag, end: false },
  { to: '/orders', label: 'ორდერები', icon: ShoppingCart, end: false },
  { to: '/ads', label: 'რეკლამა', icon: Megaphone, end: false },
  { to: '/finances', label: 'ფინანსები', icon: Wallet, end: false },
  { to: '/profit', label: 'მოგება', icon: TrendingUp, end: false },
];

export default function SidebarLayout({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  const [open, setOpen] = useState(false);
  const [dateStr, setDateStr] = useState('');
  const [isDark, setIsDark] = useState(true);
  const navigation = useNavigation();
  const isNavigating = navigation.state !== 'idle';

  useEffect(() => {
    setDateStr(new Date().toLocaleDateString('ka-GE', {
      year: 'numeric', month: 'long', day: 'numeric',
    }));
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('hyena-theme', next ? 'dark' : 'light'); } catch {}
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-app)' }}>

      {/* Loading bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5">
          <div className="h-full bg-linear-to-r from-transparent via-amber-500 to-transparent animate-pulse" />
        </div>
      )}

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-55 flex flex-col z-30',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:relative lg:translate-x-0',
        ].join(' ')}
        style={{ background: 'var(--bg-sidebar)' }}
      >
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(196,112,32,0.2) 0%, transparent 65%)' }} />

        {/* Logo */}
        <div className="relative flex items-center justify-between px-4 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #c47020 0%, #7c3a0e 100%)', boxShadow: '0 3px 10px rgba(180,83,9,0.4)' }}>
              <Package style={{ width: 15, height: 15, color: '#fff' }} />
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-[0.18em] leading-none">HYENA</p>
              <p className="text-[9px] font-medium mt-0.5 tracking-wider" style={{ color: '#5a3e28' }}>ადმინ პანელი</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5" style={{ color: '#5a3e28' }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        <div className="mx-4 h-px mb-2" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] px-3 mb-2.5" style={{ color: '#3d2910' }}>მენიუ</p>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              prefetch="intent"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative"
              style={({ isActive, isPending }) => ({
                background: isActive
                  ? 'linear-gradient(135deg, rgba(196,112,32,0.28) 0%, rgba(124,58,14,0.18) 100%)'
                  : isPending ? 'rgba(255,255,255,0.04)' : undefined,
                color: isActive ? '#f5c878' : isPending ? '#c49a5a' : '#6b4a2e',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(196,112,32,0.2)' : undefined,
              })}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4 rounded-r-full" style={{ background: '#c47020' }} />
                  )}
                  <Icon style={{ width: 15, height: 15, flexShrink: 0, color: isActive ? '#f5c878' : '#4a3020' }} />
                  <span className="flex-1">{label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#c47020', opacity: 0.7 }} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mx-4 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

        {/* User + logout */}
        <div className="px-2.5 py-3">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-0.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold" style={{ background: 'rgba(196,112,32,0.25)', color: '#f5c878' }}>
              {(user.email?.[0] ?? 'A').toUpperCase()}
            </div>
            <p className="text-[11px] font-medium truncate" style={{ color: '#5a3e28' }}>{user.email}</p>
          </div>
          <Form method="post" action="/logout">
            <button type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 hover:bg-red-950/30 hover:text-red-400"
              style={{ color: '#3d2010' }}>
              <LogOut style={{ width: 13, height: 13, flexShrink: 0 }} />
              გასვლა
            </button>
          </Form>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <header className="flex items-center gap-3 px-4 lg:px-6 py-3 shrink-0"
          style={{ background: 'var(--bg-header)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--divider)' }}>
          <button onClick={() => setOpen(true)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-2)' }}>
            <Menu style={{ width: 17, height: 17 }} />
          </button>
          <div className="flex-1" />
          {dateStr && (
            <span className="text-[11px] font-medium px-3 py-1.5 rounded-lg"
              style={{ color: 'var(--text-2)', background: 'rgba(180,130,80,0.1)' }}>
              {dateStr}
            </span>
          )}
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 hover:scale-105"
            style={{ color: 'var(--text-2)', background: 'rgba(180,130,80,0.1)' }}
            title={isDark ? 'ღია რეჟიმი' : 'მუქი რეჟიმი'}
          >
            {isDark
              ? <Sun style={{ width: 15, height: 15, color: '#f5c878' }} />
              : <Moon style={{ width: 15, height: 15 }} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
