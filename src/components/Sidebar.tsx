'use client';

import { motion } from 'framer-motion';
import { Radio, Search, Upload, ShieldAlert, Target } from 'lucide-react';
import { parseACLEDCSV, Incident } from '@/lib/api-client';
import { useState, useRef, memo, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { useStore } from '@/lib/store';
// We use Virtuoso because it is compatible with Next.js Turbopack 
// whereas react-window currently has broken ESM exports.
import { Virtuoso as List } from 'react-virtuoso';

interface RowProps {
  incident: Incident;
  selectIncident: (incident: Incident | null) => void;
}

const IncidentRow = memo(({ incident, selectIncident }: RowProps) => {
  if (!incident) return null;

  return (
    <div className="px-2 pb-2">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => selectIncident(incident)}
        className={`p-3 border-l-4 cursor-pointer transition-all bg-card/40 hover:bg-card/80 border-border rounded-r-sm group relative h-24
          ${incident.severity > 80 ? 'border-l-alert' : 'border-l-secondary'}
        `}
      >
        <div className="flex justify-between items-start mb-1.5">
          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-mono
            ${incident.severity > 80 ? 'bg-alert/10 text-alert' : 'bg-secondary/10 text-secondary'}
          `}>
            {incident.type || 'CONFLICT'}
          </span>
          <span className="text-[9px] text-muted-foreground font-mono">
            {incident.timestamp ? format(new Date(incident.timestamp), 'HH:mm') : '--:--'}
          </span>
        </div>
        <h3 className="text-foreground font-semibold text-[11px] mb-1 leading-tight group-hover:text-primary transition-colors line-clamp-2 uppercase">
          {incident.summary || 'NO DATA'}
        </h3>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground font-mono uppercase truncate">{incident.country || 'GLOBAL'}</span>
          <ShieldAlert className={`w-3 h-3 ${incident.severity > 80 ? 'text-alert' : 'text-muted-foreground'}`} />
        </div>
      </motion.div>
    </div>
  );
});

IncidentRow.displayName = 'IncidentRow';

export default function Sidebar() {
  const { incidents, setIncidents, selectIncident } = useStore();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [timeframe, setTimeframe] = useState('24H'); 
  const [cutoffTime, setCutoffTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeLimits: Record<string, number> = { '1H': 1, '6H': 6, '24H': 24, '7D': 168 };
    const hours = timeLimits[timeframe] || 24;
    const handle = requestAnimationFrame(() => {
      setCutoffTime(Date.now() - (hours * 60 * 60 * 1000));
    });
    return () => cancelAnimationFrame(handle);
  }, [timeframe]);

  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter(i => {
      const matchesFilter = filter === 'All' || (i.type && i.type.includes(filter));
      const matchesSearch = 
        (i.summary || '').toLowerCase().includes(search.toLowerCase()) || 
        (i.country || '').toLowerCase().includes(search.toLowerCase());
      const matchesTime = new Date(i.timestamp).getTime() >= cutoffTime;

      return matchesFilter && matchesSearch && matchesTime;
    });
  }, [incidents, filter, search, cutoffTime]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseACLEDCSV(content);
      setIncidents([...parsed, ...incidents]);
    };
    reader.readAsText(file);
  };

  return (
    <aside className="h-full bg-background border-r border-border flex flex-col w-full backdrop-blur-md z-20 overflow-hidden shadow-2xl transition-colors">
      <div className="p-4 border-b border-border bg-background relative overflow-hidden">
        <div className="flex justify-between items-center relative z-10 mb-4">
          <h2 className="text-primary font-bold text-lg flex items-center gap-2 tracking-widest uppercase font-mono">
            <Target className="w-5 h-5 text-primary" />
            INTEL FEED
          </h2>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-sm bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono font-bold">IMPORT</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
        </div>

        <div className="grid grid-cols-4 gap-1 mb-4">
          {['1H', '6H', '24H', '7D'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`py-1 text-[10px] font-mono border rounded transition-all ${
                timeframe === t 
                  ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(0,240,255,0.3)]' 
                  : 'border-border text-muted-foreground hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input 
            type="text"
            placeholder="SEARCH INTEL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-sm py-1.5 pl-8 pr-3 text-[10px] font-mono focus:outline-none focus:border-primary/50 text-foreground transition-all"
          />
        </div>
      </div>

      <div className="p-3 border-b border-border flex gap-2 overflow-x-auto no-scrollbar bg-card/30 shrink-0">
        {['All', 'Conflict', 'Terror'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 text-[9px] uppercase font-mono tracking-wider rounded-full border transition-all
              ${filter === type 
                ? 'bg-primary border-primary text-primary-fg' 
                : 'border-border text-muted-foreground hover:border-primary/50 bg-background/50'
              }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-[10px] font-mono gap-2 opacity-50">
            <Radio className="w-6 h-6 animate-pulse" />
            SCANNING...
          </div>
        ) : (
          <List
            style={{ height: '100%' }}
            totalCount={filteredIncidents.length}
            itemContent={(index) => (
              <IncidentRow 
                incident={filteredIncidents[index]} 
                selectIncident={selectIncident} 
              />
            )}
          />
        )}
      </div>
    </aside>
  );
}