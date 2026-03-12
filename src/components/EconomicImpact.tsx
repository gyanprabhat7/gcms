'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MarketImpact {
  asset: string;
  ticker: string;
  prediction: 'BULLISH' | 'BEARISH';
  change: string;
  reason: string;
}

export default function EconomicImpact() {
  const selectedIncident = useStore((state) => state.selectedIncident);
  const [data, setData] = useState<MarketImpact[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedIncident) {
      setData(null);
      return;
    }

    async function fetchAnalysis() {
      setLoading(true);
      try {
        const res = await fetch('/api/analysis/economic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incident: selectedIncident })
        });
        const result = await res.json();
        // Handle both array direct return or nested in key
        const impacts = result.impacts || result.data || result; 
        if (Array.isArray(impacts)) {
           setData(impacts);
        } else {
           setData([]); // Fallback
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalysis();
  }, [selectedIncident]);

  if (!selectedIncident) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-20 left-4 z-50 w-80 bg-card/90 border border-primary/30 backdrop-blur-md rounded shadow-2xl overflow-hidden"
      >
        <div className="p-3 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono text-primary flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            MARKET SENTINEL
          </h3>
          {loading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
        </div>

        <div className="p-3 max-h-64 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-[10px] text-muted-foreground font-mono animate-pulse">
              RUNNING QUANT MODELS...
            </div>
          ) : data && data.length > 0 ? (
            data.map((item, i) => (
              <div key={i} className="bg-background/50 p-2 rounded border border-border">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-foreground font-mono">{item.ticker}</span>
                  <span className={`text-[10px] font-bold px-1.5 rounded flex items-center gap-1 ${
                    item.prediction === 'BULLISH' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {item.prediction === 'BULLISH' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {item.change}
                  </span>
                </div>
                <div className="text-[10px] text-foreground/80 mb-1">{item.asset}</div>
                <div className="text-[9px] text-muted-foreground leading-tight italic">
                  "{item.reason}"
                </div>
              </div>
            ))
          ) : (
            <div className="text-[10px] text-muted-foreground">No significant market correlation detected.</div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
