'use client';

import { Activity, Skull, Target, Zap, ShieldAlert, TrendingUp } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Incident } from '@/lib/api-client';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import SitrepGenerator from './SitrepGenerator';
import { useStore } from '@/lib/store';

interface AnalyticsProps {
  incidents: Incident[];
}

interface StatCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ElementType;
  color?: string;
  trend?: string;
}

function StatCard({ label, value, subtext, icon: Icon, color = "primary", trend }: StatCardProps) {
  return (
    <div className={`bg-card/40 border border-border p-3 rounded relative overflow-hidden group hover:border-${color}/50 transition-colors`}>
      <div className={`absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 text-${color}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono mb-1">{label}</div>
      <div className={`text-2xl font-bold font-mono leading-none text-foreground group-hover:text-${color} transition-colors`}>
        {value}
      </div>
      <div className="flex justify-between items-end mt-1">
        <div className="text-[9px] text-muted-foreground/60 font-mono truncate max-w-[80px]">{subtext}</div>
        {trend && (
          <div className="text-[9px] text-secondary font-mono flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> {trend}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Analytics({ incidents }: AnalyticsProps) {
  const selectIncident = useStore((state) => state.selectIncident);
  const timeframe = useStore((state) => state.timeframe);
  const [cutoffTime, setCutoffTime] = useState(0);

  useEffect(() => {
    let hours = 24;
    if (timeframe.endsWith('H')) hours = parseInt(timeframe, 10);
    else if (timeframe.endsWith('D')) hours = parseInt(timeframe, 10) * 24;
    
    const handle = requestAnimationFrame(() => {
      setCutoffTime(Date.now() - (hours * 60 * 60 * 1000));
    });
    return () => cancelAnimationFrame(handle);
  }, [timeframe]);

  const stats = useMemo(() => {
    if (!incidents || incidents.length === 0) return null;

    const filteredIncidents = incidents.filter(i => 
      new Date(i.timestamp).getTime() >= cutoffTime
    );

    if (filteredIncidents.length === 0) return null;

    const totalEvents = filteredIncidents.length;
    const totalFatalities = filteredIncidents.reduce((acc, curr) => acc + (curr.fatalities || 0), 0);
    const criticalEvents = filteredIncidents.filter(i => i.severity > 80).length;
    
    const countryCount: Record<string, number> = {};
    filteredIncidents.forEach(i => { 
      if (i.country) countryCount[i.country] = (countryCount[i.country] || 0) + 1; 
    });
    
    const sortedCountries = Object.keys(countryCount).sort((a, b) => countryCount[b] - countryCount[a]);
    const topCountry = sortedCountries[0] || "N/A";

    const trendData = filteredIncidents.slice(0, 20).reverse().map((i, idx) => ({
      idx,
      sev: i.severity || 50
    }));

    return { totalEvents, totalFatalities, criticalEvents, topCountry, trendData, countryCount, filteredIncidents };
  }, [incidents, cutoffTime]);

  if (!stats) return (
     <aside className="h-full w-full bg-background/95 border-l border-border flex flex-col items-center justify-center text-muted-foreground text-xs font-mono">
        <Activity className="w-6 h-6 animate-pulse mb-2 opacity-50" />
        INITIALIZING FEED...
     </aside>
  );

  return (
    <aside className="h-full w-full bg-background/95 border-l border-border flex flex-col backdrop-blur-md overflow-y-auto shadow-2xl p-4 gap-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
        <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-primary flex items-center gap-2">
          <Zap className="w-4 h-4" /> SITREP
        </h2>
        <span className="text-[9px] font-mono text-alert animate-pulse">LIVE</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="KIAs" value={stats.totalFatalities} subtext="ESTIMATED" icon={Skull} color="alert" />
        <StatCard label="Events" value={stats.totalEvents} subtext={`${timeframe} WINDOW`} icon={Activity} color="primary" trend="+12%" />
        <StatCard label="Critical" value={stats.criticalEvents} subtext=">80 SEV" icon={ShieldAlert} color="alert" />
        <StatCard label="Primary" value={stats.topCountry.slice(0, 8)} subtext="THEATER" icon={Target} color="secondary" />
      </div>

      <div className="bg-card/30 border border-border rounded p-3">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono mb-2">Intensity Trend</div>
        <div className="h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.trendData}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="sev" stroke="var(--primary)" strokeWidth={2} fill="url(#chartGradient)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono mb-2 border-b border-border pb-1">Regional Distribution</div>
        <div className="space-y-1">
          {Object.entries(stats.countryCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([country, count], idx) => (
            <div 
              key={country} 
              className="flex justify-between items-center text-[10px] font-mono p-1 hover:bg-white/5 rounded cursor-pointer group"
              onClick={() => {
                const countryIncident = stats.filteredIncidents.find(i => i.country === country);
                if (countryIncident) selectIncident(countryIncident);
              }}
            >
              <span className="text-foreground group-hover:text-primary transition-colors">
                {idx + 1}. {country}
              </span>
              <span className="text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-border mt-2">
        <SitrepGenerator />
      </div>
    </aside>
  );
}