import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Search, Upload, ShieldAlert, Target, Settings, Check } from 'lucide-react';
import { parseACLEDCSV, fetchLiveIncidents } from '@/lib/api-client';
import { useState, useRef, memo, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { useStore, AppIncident } from '@/lib/store';
// We use Virtuoso because it is compatible with Next.js Turbopack 
// whereas react-window currently has broken ESM exports.
import { Virtuoso as List } from 'react-virtuoso';

interface RowProps {
  incident: AppIncident;
  selectIncident: (incident: AppIncident | null) => void;
  isSelected: boolean;
}

const IncidentRow = memo(({ incident, selectIncident, isSelected }: RowProps) => {
  const [isNew, setIsNew] = useState(() => {
    if (!incident.timestamp) return false;
    // Show 'Live' if the incident occurred within the last 30 minutes
    return Date.now() - new Date(incident.timestamp).getTime() < 30 * 60 * 1000;
  });

  useEffect(() => {
    if (!incident.timestamp || !isNew) return;
    const thirtyMinutes = 30 * 60 * 1000;
    const timeSinceEvent = Date.now() - new Date(incident.timestamp).getTime();
    const timeout = setTimeout(() => setIsNew(false), Math.max(0, thirtyMinutes - timeSinceEvent));
    return () => clearTimeout(timeout);
  }, [incident.timestamp, isNew]);

  if (!incident) return null;

  return (
    <div className="px-2 pb-2">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{
          opacity: 1,
          x: 0,
          borderColor: isSelected ? 'var(--neon-blue)' : 'transparent',
          boxShadow: isSelected ? '0 0 15px rgba(0, 240, 255, 0.15)' : 'none'
        }}
        whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        onClick={() => selectIncident(incident)}
        className={`p-3 pt-2 pb-2 border cursor-pointer transition-all bg-card/40 border-l-4 rounded-r-sm group relative h-24 flex flex-col
          ${incident.severity > 80 ? 'border-l-alert' : 'border-l-secondary'}
          ${isSelected ? 'bg-primary/5' : 'hover:bg-card/80'}
          ${isNew ? 'bg-alert/5 ring-1 ring-alert/30' : ''}
        `}
      >
        <div className="flex justify-between items-start mb-1">
          <div className="flex gap-1.5 items-center">
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded font-mono
              ${incident.severity > 80 ? 'bg-alert/10 text-alert' : 'bg-secondary/10 text-secondary'}
            `}>
              {incident.type || 'CONFLICT'}
            </span>
            <span className="text-[8px] text-muted-foreground font-mono opacity-60">
              {incident.source.split(' ')[0]}
            </span>
            {isNew && (
              <div className="flex items-center gap-1 bg-alert/20 px-1 py-0.5 rounded">
                <div className="w-1.5 h-1.5 rounded-full bg-alert animate-pulse" />
                <span className="text-[7px] text-alert font-bold uppercase">Live</span>
              </div>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground font-mono flex items-center gap-1.5">
            {incident.timestamp ? format(new Date(incident.timestamp), 'HH:mm') : '--:--'}
          </span>
        </div>
        <h3 className={`text-[11px] mb-1 leading-tight transition-colors line-clamp-2 uppercase font-mono
          ${isSelected ? 'text-primary font-bold' : 'text-foreground font-semibold group-hover:text-primary'}
        `}>
          {incident.summary || 'NO DATA'}
        </h3>
        <div className="flex justify-between items-center mt-auto pt-1.5 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground font-mono uppercase truncate">{incident.country || 'GLOBAL'}</span>
          <div className="flex items-center gap-2">
            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            <ShieldAlert className={`w-3 h-3 ${incident.severity > 80 ? 'text-alert' : 'text-muted-foreground'}`} />
          </div>
        </div>
      </motion.div>
    </div>
  );
});

IncidentRow.displayName = 'IncidentRow';

export default function Sidebar() {
  const incidents = useStore((state) => state.incidents);
  const setIncidents = useStore((state) => state.setIncidents);
  const mergeIncidents = useStore((state) => state.mergeIncidents);
  const selectIncident = useStore((state) => state.selectIncident);
  const selectedIncident = useStore((state) => state.selectedIncident);
  const timeframe = useStore((state) => state.timeframe);
  const setTimeframe = useStore((state) => state.setTimeframe);
  const feedFilters = useStore((state) => state.feedFilters);
  const toggleFeedFilter = useStore((state) => state.toggleFeedFilter);
  const setIsFetchingIntel = useStore((state) => state.setIsFetchingIntel);

  const [search, setSearch] = useState('');

  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customHours, setCustomHours] = useState('48');
  const [isFetching, setIsFetching] = useState(false);
  const maxFetchedHours = useRef<number>(24);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cutoffTime = useMemo(() => {
    let hours = 24;
    if (timeframe.endsWith('H')) hours = parseInt(timeframe, 10);
    else if (timeframe.endsWith('D')) hours = parseInt(timeframe, 10) * 24;
    return Date.now() - (hours * 60 * 60 * 1000);
  }, [timeframe]);

  const handleTimeframeSelect = async (t: string) => {
    setShowCustomTime(false);
    setTimeframe(t);

    let requiredHours = 24;
    if (t.endsWith('H')) requiredHours = parseInt(t, 10);
    else if (t.endsWith('D')) requiredHours = parseInt(t, 10) * 24;

    // Check if we need to fetch historical data
    if (requiredHours > maxFetchedHours.current) {
      setIsFetching(true);
      setIsFetchingIntel(true);
      try {
        const newData = await fetchLiveIncidents(requiredHours * 60); // API takes minutes
        mergeIncidents(newData);
        maxFetchedHours.current = requiredHours;
      } catch (err) {
        console.error("Failed to fetch historical data", err);
      } finally {
        setIsFetching(false);
        setIsFetchingIntel(false);
      }
    }
  };

  const submitCustomTime = () => {
    const hours = parseInt(customHours, 10);
    if (!isNaN(hours) && hours > 0) {
      handleTimeframeSelect(`${hours}H`);
    } else {
      setShowCustomTime(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    if (!incidents) return [];
    return incidents.filter(i => {
      let matchesFilter = feedFilters.includes('All');
      if (!matchesFilter) {
        matchesFilter = feedFilters.some(f => {
          if (f === 'Critical') return i.severity > 80;
          return i.type && i.type.includes(f);
        });
      }

      const matchesSearch =
        (i.summary || '').toLowerCase().includes(search.toLowerCase()) ||
        (i.country || '').toLowerCase().includes(search.toLowerCase());
      const matchesTime = new Date(i.timestamp).getTime() >= cutoffTime;

      return matchesFilter && matchesSearch && matchesTime;
    });
  }, [incidents, feedFilters, search, cutoffTime]);

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

        <div className="flex gap-1 mb-4 relative">
          <div className="flex gap-1 flex-1">
            {['1H', '6H', '24H', '7D'].map((t) => (
              <button
                key={t}
                onClick={() => handleTimeframeSelect(t)}
                className={`flex-1 py-1 text-[10px] font-mono border rounded transition-all ${timeframe === t && !showCustomTime
                    ? 'bg-primary/20 border-primary text-primary shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                    : 'border-border text-muted-foreground hover:bg-white/5'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCustomTime(!showCustomTime)}
            className={`px-2 py-1 text-[10px] font-mono border rounded transition-all flex items-center justify-center ${showCustomTime || (!['1H', '6H', '24H', '7D'].includes(timeframe))
                ? 'bg-secondary/20 border-secondary text-secondary shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                : 'border-border text-muted-foreground hover:bg-white/5'
              }`}
          >
            <Settings className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          <AnimatePresence>
            {showCustomTime && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#050505] border border-secondary shadow-lg p-2 rounded flex gap-2 items-center"
              >
                <span className="text-[10px] font-mono text-secondary uppercase whitespace-nowrap">CUSTOM HOURS:</span>
                <input
                  type="number"
                  value={customHours}
                  onChange={(e) => setCustomHours(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitCustomTime()}
                  className="bg-background border border-border text-foreground text-[10px] font-mono px-2 py-1 w-full rounded focus:outline-none focus:border-secondary transition-colors"
                  min="1"
                />
                <button
                  onClick={submitCustomTime}
                  className="bg-secondary/20 hover:bg-secondary text-secondary hover:text-[#050505] p-1 rounded transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
        {['All', 'Conflict', 'Terror', 'Military', 'Critical'].map((type) => (
          <button
            key={type}
            onClick={() => toggleFeedFilter(type)}
            className={`px-3 py-1 text-[9px] uppercase font-mono tracking-wider rounded-full border transition-all whitespace-nowrap
              ${feedFilters.includes(type)
                ? (type === 'Critical' ? 'bg-alert border-alert text-white' : 'bg-primary border-primary text-primary-fg')
                : 'border-border text-muted-foreground hover:border-primary/50 bg-background/50'
              }`}
          >
            {type === 'Critical' ? '🔴 Critical' : type}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center h-40 text-secondary text-[10px] font-mono gap-2 opacity-80">
            <Radio className="w-6 h-6 animate-pulse" />
            EXTRACTING HISTORICAL DATA...
          </div>
        ) : filteredIncidents.length === 0 ? (
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
                isSelected={selectedIncident?.id === filteredIncidents[index].id}
              />
            )}
          />
        )}
      </div>
    </aside>
  );
}