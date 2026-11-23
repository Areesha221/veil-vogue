import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, MessageSquare, Upload, Star, ShieldCheck, Menu, X, LogOut, ExternalLink, Sun, Moon } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import CustomCursor from './CustomCursor';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/receipts', label: 'Receipts', icon: Upload },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavItems = ({ onNavigate }) => (
    <>
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-gold text-white shadow'
                : 'text-gray-700 dark:text-gray-200 hover:bg-gold/10 hover:text-gold'
            }`
          }
        >
          <Icon size={18} />
          <span>{label}</span>
        </NavLink>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-ivory dark:bg-zinc-950 text-gray-900 dark:text-ivory">
      <CustomCursor />
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur border-b border-gray-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800" aria-label="Open admin menu">
          <Menu size={22} />
        </button>
        <Link to="/admin" className="font-serif text-xl font-bold text-gold">V&V Admin</Link>
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800" aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <Link to="/admin" onClick={() => setSidebarOpen(false)} className="font-serif text-2xl font-bold text-gold">Veil & Vogue</Link>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800" aria-label="Close admin menu">
                <X size={20} />
              </button>
            </div>
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 px-1">Admin Panel</p>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              <NavItems onNavigate={() => setSidebarOpen(false)} />
            </nav>
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-zinc-800 space-y-2">
              <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gold/10 hover:text-gold">
                <ExternalLink size={18} /> View Website
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 p-5">
          <Link to="/admin" className="font-serif text-3xl font-bold text-gold mb-1">Veil & Vogue</Link>
          <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">Admin Panel</p>

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            <NavItems />
          </nav>

          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-zinc-800 space-y-2">
            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="font-semibold text-gray-700 dark:text-gray-200 truncate">{user?.name || 'Admin'}</div>
              <div className="truncate">{user?.email || ''}</div>
            </div>
            <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gold/10 hover:text-gold">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
            <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gold/10 hover:text-gold">
              <ExternalLink size={18} /> View Website
            </Link>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut size={18} /> Logout
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 lg:ml-72 min-w-0">
          <main className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
          <Toaster position="bottom-right" />
        </div>
      </div>
    </div>
  );
}
