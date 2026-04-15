'use client';

import { ShieldAlert, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from './AuthProvider';

export default function AccessDenied() {
  const { logout, user } = useAuth();

  return (
    <div className="h-screen w-full bg-background flex flex-col items-center justify-center relative overflow-hidden text-center p-4">
      <div className="absolute inset-0 tactical-grid opacity-30 pointer-events-none"></div>
      <div className="absolute inset-0 bg-alert/5 pointer-events-none animate-pulse"></div>

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="z-10 max-w-md w-full bg-black/80 border border-alert/50 p-8 relative shadow-[0_0_50px_rgba(255,42,42,0.2)] backdrop-blur-xl">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-alert"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-alert"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-alert"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-alert"></div>

        <div className="flex justify-center mb-6"><ShieldAlert className="w-16 h-16 text-alert animate-pulse" /></div>
        <h1 className="text-3xl font-bold text-alert tracking-widest font-mono mb-2 uppercase">ACCESS DENIED</h1>
        <div className="h-px w-full bg-alert/30 mb-6"></div>
        <p className="text-foreground font-mono text-sm mb-2">IDENTITY CONFIRMED: <span className="text-primary">{user?.email}</span></p>
        <p className="text-muted-foreground font-mono text-xs mb-8">CLEARANCE LEVEL: <span className="text-alert">UNAUTHORIZED</span><br/>This terminal is restricted to SENTINEL COMMAND personnel.</p>

        <button onClick={logout} className="w-full border border-alert/50 text-alert hover:bg-alert/10 py-3 px-4 flex items-center justify-center gap-2 transition-all font-mono text-xs tracking-widest uppercase hover:tracking-[0.2em]">
          <LogOut className="w-4 h-4" /> Terminate Session
        </button>
      </motion.div>

      <div className="absolute bottom-8 font-mono text-[9px] text-alert/50">SENTINEL SECURITY PROTOCOL v9.0 // IP LOGGED</div>
    </div>
  );
}