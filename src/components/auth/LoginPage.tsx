'use client';

import { useAuth } from './AuthProvider';
import { ShieldCheck, Lock, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="h-screen w-full bg-background relative overflow-hidden flex items-center justify-center font-sans">
      
      {/* Background Grid */}
      <div className="absolute inset-0 tactical-grid opacity-20 pointer-events-none"></div>
      
      {/* Animated Radar */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
         <div className="w-[80vw] h-[80vw] border border-primary rounded-full animate-radar"></div>
         <div className="w-[60vw] h-[60vw] border border-primary rounded-full absolute"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 bg-card/80 backdrop-blur-xl border border-primary/30 p-8 rounded-lg max-w-md w-full shadow-[0_0_50px_var(--primary)] relative transition-colors"
      >
        <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-primary"></div>
        <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-primary"></div>

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded bg-gradient-to-br from-primary/20 to-background flex items-center justify-center border border-primary/50 shadow-[0_0_15px_var(--primary)] animate-pulse-slow">
            <Globe className="w-8 h-8 text-primary" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-foreground mb-2 tracking-widest font-mono uppercase">
          GCMS <span className="text-primary">NEXUS</span>
        </h1>
        <p className="text-center text-muted-foreground text-xs mb-8 font-mono tracking-wider">
          RESTRICTED ACCESS // AUTHORIZED PERSONNEL ONLY
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full bg-primary/10 hover:bg-primary/20 border border-primary/50 text-primary py-3 rounded font-mono text-sm tracking-wider transition-all flex items-center justify-center gap-2 group relative overflow-hidden"
        >
          <span className="absolute inset-0 bg-primary/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
          <ShieldCheck className="w-4 h-4" />
          INITIATE SECURE LOGIN
        </button>

        <div className="mt-6 flex justify-center gap-4 text-[10px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> ENCRYPTED</span>
          <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> MONITORED</span>
        </div>
      </motion.div>

      {/* Footer Ticker */}
      <div className="absolute bottom-0 w-full bg-primary/5 border-t border-primary/20 py-1">
        <div className="text-[10px] text-primary/50 font-mono text-center tracking-[0.5em] animate-pulse">
          SYSTEM INTEGRITY: 100% /// THREAT LEVEL: ELEVATED
        </div>
      </div>

    </div>
  );
}