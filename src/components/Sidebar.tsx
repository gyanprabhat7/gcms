'use client';

import { motion } from 'framer-motion';
import { Radio, Clock, Search, Upload, ShieldAlert, Target } from 'lucide-react';
import { parseACLEDCSV, Incident } from '@/lib/api-client';
import { useState, useRef, memo, useEffect } from 'react';
import { format } from 'date-fns';
import { useStore } from '@/lib/store';
import { List } from 'react-window';

// Memoized Incident Row for performance
const IncidentRow = memo(({ index, style, filteredIncidents, selectIncident }: any) => {
  const incident: Incident = filteredIncidents[index];

  return (
    <div style={style} className="px-2 pb-2">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => selectIncident(incident)}
        className={`p-3 border-l-4 cursor-pointer transition-all bg-card/40 hover:bg-card/80 border-border rounded-r-sm group relative overflow-hidden h-full
          ${incident.severity > 80 ? 'border-l-alert' : 'border-l-secondary'}
        `}
      >
        <div className="flex justify-between items-start mb-1.5">
          <span className={`text-[9px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded font-mono
            ${incident.severity > 80 ? 'bg-alert/10 text-alert' : 'bg-secondary/10 text-secondary'}
          `}>
            {incident.type}
          </span>
          <span className="text-[9px] text-muted-foreground font-mono">
            {format(new Date(incident.timestamp), 'HH:mm')}
          </span>
        </div>
        <h3 className="text-foreground font-semibold text-[11px] mb-1 leading-tight group-hover:text-primary transition-colors line-clamp-2 uppercase">
          {incident.summary}
        </h3>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground font-mono uppercase truncate">{incident.country}</span>
          <ShieldAlert className={`w-3 h-3 ${incident.severity > 80 ? 'text-alert' : 'text-muted-foreground'}`} />
        </div>
      </motion.div>
    </div>
  );
});

IncidentRow.displayName = 'IncidentRow';

export default function Sidebar() {
  const { incidents, setIncidents, selectIncident, locationFilter, setLocationFilter } = useStore();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(800);

  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
      
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });
      
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  const filteredIncidents = incidents.filter(i => {
    // 1. Location Filter (if active)
    if (locationFilter) {
      const [lat, lng] = locationFilter.split(',').map(Number);
      // Tolerance for coordinate matching (4 decimal places)
      const latMatch = Math.abs(i.lat - lat) < 0.0001;
      const lngMatch = Math.abs(i.lng - lng) < 0.0001;
      if (!latMatch || !lngMatch) return false;
    }

    // 2. Type Filter
    const matchesFilter = filter === 'All' || i.type.includes(filter);
    
    // 3. Search Filter
    const matchesSearch = 
      i.summary.toLowerCase().includes(search.toLowerCase()) || 
      i.country.toLowerCase().includes(search.toLowerCase());
      
    return matchesFilter && matchesSearch;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseACLEDCSV(content);
      // Merge with existing
      setIncidents([...parsed, ...incidents]);
    };
    reader.readAsText(file);
  };

  return (
    <aside className="h-full bg-background border-r border-border flex flex-col w-full backdrop-blur-md z-20 overflow-hidden shadow-2xl transition-colors">
      
      {/* Header */}
      <div className="p-4 border-b border-border bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 opacity-10 animate-pulse"></div>
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

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="SEARCH INTEL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-sm py-1.5 pl-8 pr-3 text-[10px] font-mono focus:outline-none focus:border-primary/50 text-foreground transition-all placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Filters & Active Filter Status */}
      <div className="border-b border-border bg-card/30 shrink-0">
        <div className="p-3 flex gap-2 overflow-x-auto no-scrollbar">
          {['All', 'Conflict', 'Naval', 'Air', 'Terror'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1 text-[9px] uppercase font-mono tracking-wider rounded-full border transition-all whitespace-nowrap
                ${filter === type 
                  ? 'bg-primary border-primary text-primary-fg shadow-[0_0_10px_var(--primary)]' 
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary bg-background/50'
                }`}
            >
              {type}
            </button>
          ))}
        </div>

        {locationFilter && (
          <div className="px-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[9px] font-mono text-primary animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              LOCATION FOCUS ACTIVE
            </div>
            <button 
              onClick={() => setLocationFilter(null)}
              className="text-[9px] font-mono text-muted-foreground hover:text-white underline underline-offset-2"
            >
              CLEAR FILTER
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-hidden" ref={containerRef}>
        {filteredIncidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-[10px] font-mono gap-2 opacity-50">
            <Radio className="w-6 h-6 animate-pulse" />
            SCANNING...
          </div>
        ) : (
          <List
            rowCount={filteredIncidents.length}
            rowHeight={110}
            rowComponent={IncidentRow}
            rowProps={{ filteredIncidents, selectIncident }}
            style={{ height: containerRef.current?.clientHeight || 800, width: '100%' }}
            className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          />
        )}
      </div>
    </aside>
  );
}
