'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store';
import { TrendingUp, TrendingDown, DollarSign, Loader2, ChevronDown } from 'lucide-react';
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
  const marketSentinelCollapsed = useStore((state) => state.marketSentinelCollapsed);
  const setMarketSentinelCollapsed = useStore((state) => state.setMarketSentinelCollapsed);
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
        const impacts = result.impacts || result.data || result; 
        if (Array.isArray(impacts)) {
           setData(impacts);
        } else {
           setData([]);
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
        layout
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          y: 0,
          width: marketSentinelCollapsed ? 180 : 320,
          height: marketSentinelCollapsed ? 40 : 'auto'
        }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-20 left-4 z-50 bg-card/95 border border-primary/30 backdrop-blur-md rounded-sm shadow-2xl overflow-hidden flex flex-col"
      >
        <div 
          className="h-10 px-3 border-b border-primary/20 bg-primary/5 flex items-center justify-between cursor-pointer hover:bg-primary/10 transition-colors shrink-0"
          onClick={() => setMarketSentinelCollapsed(!marketSentinelCollapsed)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <DollarSign className="w-4 h-4 text-primary shrink-0" />
            <motion.h3 
              layout
              className="text-[10px] font-bold font-mono text-primary uppercase tracking-wider truncate whitespace-nowrap overflow-hidden"
            >
              MARKET SENTINEL
            </motion.h3>
            {loading && !marketSentinelCollapsed && <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0 ml-1" />}
          </div>
          <motion.div 
            animate={{ rotate: marketSentinelCollapsed ? -90 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-muted-foreground hover:text-white shrink-0"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>

        <AnimatePresence>
          {!marketSentinelCollapsed && (
            <motion.div 
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
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
                        &quot;{item.reason}&quot;
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-muted-foreground">No significant market correlation detected.</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}