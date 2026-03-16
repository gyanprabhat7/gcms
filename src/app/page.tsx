'use client';

import { useEffect, useRef } from 'react';
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

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function Home() {
  const { incidents, mergeIncidents } = useStore();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    async function loadData() {
      // Fetch 24 hours on first load, then only fetch the last 15 minutes of data on subsequent polls
      const timespan = isInitialLoad.current ? 1440 : 15;
      const data = await fetchLiveIncidents(timespan);
      
      // Merge unique data instead of blindly overwriting
      mergeIncidents(data);
      isInitialLoad.current = false;
    }
    
    loadData();
    
    // Check for updates every 60 seconds (5 seconds is too aggressive and will get you IP banned by APIs)
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
             <Map />
          </div>

          {/* Right Panel - Analytics */}
          <div className="hidden lg:flex h-full w-80 shrink-0 z-20 border-l border-border bg-background/95 backdrop-blur-sm shadow-2xl">
             <Analytics incidents={incidents} />
          </div>

        </main>

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