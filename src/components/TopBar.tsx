import { AlertTriangle, Database, Globe, Server, User, Sun, Moon, LogOut, Settings, Key } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/components/auth/AuthProvider';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TopBar() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  return (
    <header className="h-16 bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-6 z-50">
      
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded bg-gradient-to-br from-primary/20 to-background flex items-center justify-center border border-primary/50 shadow-[0_0_15px_var(--primary)]">
          <Globe className="w-6 h-6 text-primary animate-pulse-slow" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-widest uppercase font-mono leading-none">
            GCMS <span className="text-primary">NEXUS</span>
          </h1>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-mono tracking-wider mt-1">
            <span className="w-1.5 h-1.5 bg-secondary rounded-full animate-pulse"></span>
            SECURE UPLINK ESTABLISHED
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="Toggle Tactical Mode"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        )}

        <button className="p-2 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors relative group">
          <AlertTriangle className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-alert rounded-full animate-ping"></span>
        </button>
        
        <div className="h-6 w-px bg-border"></div>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 rounded-full bg-card border border-primary/30 flex items-center justify-center hover:bg-primary/20 transition-colors overflow-hidden"
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-primary" />
            )}
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-56 bg-card border border-primary/30 rounded shadow-2xl overflow-hidden backdrop-blur-xl z-[100]"
              >
                <div className="p-3 border-b border-border bg-primary/5">
                  <p className="text-sm font-bold text-foreground truncate">{user?.displayName || 'Commander'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
                
                <div className="p-1">
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-primary/10 text-muted-foreground hover:text-primary rounded transition-colors text-left">
                    <Settings className="w-4 h-4" />
                    System Preferences
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-primary/10 text-muted-foreground hover:text-primary rounded transition-colors text-left">
                    <Key className="w-4 h-4" />
                    API Credentials
                  </button>
                  <div className="h-px bg-border my-1"></div>
                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-alert/10 text-alert rounded transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Secure Logout
                  </button>
                </div>
                
                <div className="p-2 border-t border-border bg-background text-[9px] text-center text-muted-foreground font-mono">
                  v2.4.0-STABLE
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
