'use client';

import { useEffect, useRef, memo } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import Analytics from '@/components/Analytics';
import AuthWrapper from '@/components/auth/AuthWrapper';
import TacticalChat from '@/components/TacticalChat';
import EscalationIndex from '@/components/EscalationIndex';
import EconomicImpact from '@/components/EconomicImpact';
import { fetchLiveIncidents } from '@/lib/api-client';
import { useStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RefreshCw } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });
const MemoizedMap = memo(MapComponent);

export default function Home() {
  const incidents = useStore((state) => state.incidents);
  const mergeIncidents = useStore((state) => state.mergeIncidents);
  const isFetchingIntel = useStore((state) => state.isFetchingIntel);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    async function loadData() {
      try {
        const timespan = isInitialLoad.current ? 1440 : 15;
        const data = await fetchLiveIncidents(timespan);
        mergeIncidents(data);
        isInitialLoad.current = false;
      } catch (err) {
        console.error('Failed to load incidents', err);
      }
    }
    
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [mergeIncidents]);

  return (
    <AuthWrapper>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden relative font-sans selection:bg-primary/30">
        
        {/* Tactical Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none z-0 tactical-grid opacity-20"></div>

        <TopBar />

        <main className="flex flex-1 overflow-hidden relative z-10">
          
          {/* Left Panel - Sidebar */}
          <div className="hidden md:flex h-full w-80 shrink-0 z-20 border-r border-border bg-background/95 backdrop-blur-sm shadow-2xl">
             <Sidebar />
          </div>

          {/* Center - Map & Overlays */}
          <div className="flex-1 relative bg-background">
             <div className="absolute top-4 left-4 z-[400] w-64 pointer-events-none">
                <div className="pointer-events-auto">
                   <EscalationIndex incidents={incidents} />
                </div>
             </div>
             <MemoizedMap />
          </div>

          {/* Right Panel - Analytics */}
          <div className="hidden lg:flex h-full w-80 shrink-0 z-20 border-l border-border bg-background/95 backdrop-blur-sm shadow-2xl">
             <Analytics incidents={incidents} />
          </div>

        </main>

        {/* Global Data Fetching Indicator Overlay */}
        <AnimatePresence>
          {isFetchingIntel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4 p-8 rounded-sm border border-primary/30 bg-background/90 shadow-[0_0_50px_rgba(0,240,255,0.1)] backdrop-blur-xl"
              >
                <div className="relative">
                  <Shield className="w-12 h-12 text-primary animate-pulse" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2 border-t-2 border-primary rounded-full opacity-50"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-primary font-mono text-[10px] tracking-[0.3em] uppercase animate-pulse">Sentinel Link Active</span>
                  <span className="text-muted-foreground font-mono text-[8px] tracking-widest uppercase mt-1">Syncing Tactical Intel Datastreams</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <RefreshCw className="w-3 h-3 text-secondary animate-spin" />
                  <div className="h-[2px] w-24 bg-border relative overflow-hidden">
                    <motion.div 
                      animate={{ left: ['-100%', '100%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      className="absolute top-0 bottom-0 w-1/3 bg-secondary shadow-[0_0_8px_var(--neon-blue)]"
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Chat Bot */}
        <TacticalChat />
        
        {/* Economic Analysis Overlay */}
        <EconomicImpact />

        {/* Bottom Ticker */}
        <div className="h-8 bg-primary/10 border-t border-border flex items-center overflow-hidden whitespace-nowrap z-50 backdrop-blur-sm">
           <div className="animate-marquee inline-block text-[10px] font-mono text-primary px-4 tracking-widest">
            {incidents.length > 0 ? incidents.slice(0, 10).map(i => ` /// ${i.type.toUpperCase()}: ${i.summary.toUpperCase().slice(0, 60)}... `).join('') : 'SYSTEM INITIALIZING...'}
          </div>
        </div>

      </div>
    </AuthWrapper>
  );
}