'use client';

import { Activity, Skull, Target, Zap, ShieldAlert, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Incident } from '@/lib/api-client';
import { AreaChart, Area, ResponsiveContainer, XAxis } from 'recharts';
import SitrepGenerator from './SitrepGenerator';

import { useStore } from '@/lib/store';

interface AnalyticsProps {
  incidents: Incident[];
}

// Sub-component for a single stat block
function StatCard({ label, value, subtext, icon: Icon, color = "primary", trend }: any) {
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
  const { selectIncident } = useStore();

  // Compute Stats Dynamically
  const stats = useMemo(() => {
    if (!incidents.length) return null;

    const totalEvents = incidents.length;
    const totalFatalities = incidents.reduce((acc, curr) => acc + (curr.fatalities || 0), 0);
    const criticalEvents = incidents.filter(i => i.severity > 80).length;
    
    // Most active country
    const countryCount: Record<string, number> = {};
    incidents.forEach(i => { countryCount[i.country] = (countryCount[i.country] || 0) + 1; });
    const topCountry = Object.keys(countryCount).sort((a, b) => countryCount[b] - countryCount[a])[0];

    // Recent Intensity Trend (Last 20)
    const trendData = incidents.slice(0, 20).reverse().map((i, idx) => ({
      idx,
      sev: i.severity
    }));

    return { totalEvents, totalFatalities, criticalEvents, topCountry, trendData };
  }, [incidents]);

  if (!stats) return (
     <aside className="h-full w-full bg-background/95 border-l border-border flex flex-col items-center justify-center text-muted-foreground text-xs font-mono">
        <Activity className="w-6 h-6 animate-pulse mb-2 opacity-50" />
        NO INTEL STREAM
     </aside>
  );

  return (
    <aside className="h-full w-full bg-background/95 border-l border-border flex flex-col backdrop-blur-md overflow-y-auto shadow-2xl p-4 gap-4">
      
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
        <h2 className="text-sm font-bold font-mono uppercase tracking-widest text-primary flex items-center gap-2">
          <Zap className="w-4 h-4" />
          SitRep
        </h2>
        <span className="text-[9px] font-mono text-alert animate-pulse">LIVE FEED</span>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard 
          label="Confirmed KIAs" 
          value={stats.totalFatalities} 
          subtext="EST. CASUALTIES" 
          icon={Skull} 
          color="alert"
        />
        <StatCard 
          label="Active Events" 
          value={stats.totalEvents} 
          subtext="24H WINDOW" 
          icon={Activity} 
          color="primary"
          trend="+12%"
        />
        <StatCard 
          label="Critical Threats" 
          value={stats.criticalEvents} 
          subtext=">80 SEVERITY" 
          icon={ShieldAlert} 
          color="alert"
        />
        <StatCard 
          label="Primary Theater" 
          value={stats.topCountry?.slice(0, 8) || "N/A"} 
          subtext="MOST ACTIVE" 
          icon={Target} 
          color="secondary"
        />
      </div>

      {/* Intensity Chart */}
      <div className="bg-card/30 border border-border rounded p-3">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono mb-2">
          Contact Intensity (Last 20)
        </div>
        <div className="h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.trendData}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="sev" 
                stroke="var(--primary)" 
                strokeWidth={2}
                fill="url(#chartGradient)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Regional Breakdown List */}
      <div className="flex-1 overflow-y-auto">
        <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-mono mb-2 border-b border-border pb-1">
          Regional Activity
        </div>
        <div className="space-y-1">
          {/* We'll recalculate top countries list */}
          {Object.entries(incidents.reduce((acc: any, i) => {
            acc[i.country] = (acc[i.country] || 0) + 1;
            return acc;
          }, {})).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10).map(([country, count]: any, idx) => (
            <div 
              key={country} 
              className="flex justify-between items-center text-[10px] font-mono p-1 hover:bg-white/5 rounded cursor-pointer group"
              onClick={() => {
                const countryIncident = incidents.find(i => i.country === country);
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

      {/* Action Footer */}
      <div className="pt-2 border-t border-border mt-2">
        <SitrepGenerator />
      </div>

    </aside>
  );
}