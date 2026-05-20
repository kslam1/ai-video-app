import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Video, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-700 bg-dark-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold">
            <Video className="w-6 h-6 text-primary-500" />
            <span>AI 视频工坊</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/create" className="text-dark-300 hover:text-white transition">创建视频</Link>
            <Link to="/my-videos" className="text-dark-300 hover:text-white transition">我的视频</Link>
            <Link to="/pricing" className="text-dark-300 hover:text-white transition">定价</Link>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-dark-400">
                  {user.free_credits > 0 ? `${user.free_credits} 次免费` : `$${user.balance.toFixed(2)}`}
                </span>
                <button onClick={handleLogout} className="flex items-center gap-1 text-dark-400 hover:text-white text-sm">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm transition">
                登录
              </Link>
            )}
          </nav>

          {/* Mobile menu button */}
          <button className="md:hidden text-dark-300" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-dark-700 px-4 py-4 space-y-3">
            <Link to="/create" className="block text-dark-300 hover:text-white" onClick={() => setMenuOpen(false)}>创建视频</Link>
            <Link to="/my-videos" className="block text-dark-300 hover:text-white" onClick={() => setMenuOpen(false)}>我的视频</Link>
            <Link to="/pricing" className="block text-dark-300 hover:text-white" onClick={() => setMenuOpen(false)}>定价</Link>
            {user ? (
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="text-dark-400 hover:text-white text-sm">退出登录</button>
            ) : (
              <Link to="/login" className="block text-primary-500" onClick={() => setMenuOpen(false)}>登录</Link>
            )}
          </div>
        )}
      </header>

      {/* Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-dark-700 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center text-dark-500 text-sm">
          © 2026 AI 视频工坊 · 让每个人都能做出专业短视频
        </div>
      </footer>
    </div>
  );
}
