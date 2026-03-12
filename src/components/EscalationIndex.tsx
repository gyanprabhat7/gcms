'use client';

import { Incident } from '@/lib/api-client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Radiation } from 'lucide-react';

export default function EscalationIndex({ incidents }: { incidents: Incident[] }) {
  const riskIndex = useMemo(() => {
    if (!incidents.length) return 0;

    // Algorithm:
    // 1. Base Score: Average severity
    // 2. Multiplier: Number of active theaters (unique countries)
    // 3. Critical Multiplier: Count of events with Fatalities > 50

    const avgSeverity = incidents.reduce((acc, curr) => acc + curr.severity, 0) / incidents.length;
    const uniqueTheaters = new Set(incidents.map(i => i.country)).size;
    const criticalEvents = incidents.filter(i => (i.fatalities || 0) > 50).length;

    let score = avgSeverity;
    
    // Escalation Factors
    if (uniqueTheaters > 5) score *= 1.2; // Global spread
    if (uniqueTheaters > 10) score *= 1.5;
    if (criticalEvents > 0) score += (criticalEvents * 5);

    return Math.min(Math.round(score), 100);
  }, [incidents]);

  const getDefconLevel = (score: number) => {
    if (score > 90) return { level: 1, color: '#FF0000', label: "MAXIMUM READINESS" };
    if (score > 75) return { level: 2, color: '#FF4500', label: "FAST PACE DEPLOYMENT" };
    if (score > 50) return { level: 3, color: '#FFFF00', label: "ROUND HOUSE" };
    if (score > 25) return { level: 4, color: '#00FF00', label: "DOUBLE TAKE" };
    return { level: 5, color: '#0000FF', label: "FADE OUT" };
  };

  const status = getDefconLevel(riskIndex);

  return (
    <div className="bg-card/80 border border-alert/50 p-4 rounded backdrop-blur-md relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2 opacity-20">
        <Radiation className="w-12 h-12 text-alert animate-spin-slow" />
      </div>
      
      <h3 className="text-muted-foreground text-[10px] font-mono uppercase tracking-widest mb-2 flex items-center gap-2">
        <AlertTriangle className="w-3 h-3 text-alert" />
        Global Escalation Index
      </h3>

      <div className="flex items-end gap-2 mb-2">
        <span className="text-4xl font-bold text-foreground font-mono leading-none">
          {riskIndex}%
        </span>
        <span className="text-xs font-mono mb-1 text-alert">
          CHANCE OF GLOBAL CONFLICT
        </span>
      </div>

      <div className="w-full h-2 bg-background rounded-full overflow-hidden mb-3 border border-border">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${riskIndex}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-blue-500 via-yellow-500 to-red-600 relative"
        >
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white animate-pulse"></div>
        </motion.div>
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono border-t border-border pt-2">
        <span className="text-muted-foreground">DEFCON {status.level}</span>
        <span style={{ color: status.color }} className="font-bold animate-pulse">
          {status.label}
        </span>
      </div>
    </div>
  );
}
