'use client';

import React, { useEffect, useState, memo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { divIcon, Marker as LeafletMarker } from 'leaflet';
import 'leaflet.heat';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { format } from 'date-fns';
import { useStore } from '@/lib/store';
import { Maximize2, X, ExternalLink, Shield, Globe, RefreshCw, Languages } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Incident } from '@/lib/api-client';
import ReactMarkdown from 'react-markdown';

const createPulseIcon = (severity: number, theme: string | undefined) => {
  const isLight = theme === 'light';
  // Use slightly more muted colors in light mode
  const color = severity > 80 
    ? (isLight ? '#BE123C' : '#FF2A2A') 
    : (isLight ? '#0369A1' : '#00F0FF');
    
  return divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="position: relative; width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 6px; height: 6px; background-color: ${color}; border-radius: 50%; box-shadow: 0 0 ${isLight ? '4px' : '10px'} ${color}; z-index: 10;"></div>
        <div style="position: absolute; width: 12px; height: 12px; border: 1px solid ${color}; border-radius: 50%; opacity: ${isLight ? '0.4' : '0.8'}; animation: pulse-slow 2s infinite;"></div>
      </div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -10]
  });
};

const createCustomClusterIcon = (cluster: { getChildCount: () => number }, theme: string | undefined) => {
  const count = cluster.getChildCount();
  const isLight = theme === 'light';
  
  let color = isLight ? '#0369A1' : '#00F0FF';
  if (count > 50) color = isLight ? '#BE123C' : '#FF2A2A';
  else if (count > 15) color = isLight ? '#B45309' : '#FFFF00';

  return divIcon({
    html: `<div style="
      background-color: ${color}${isLight ? '15' : '30'}; 
      border: 2px solid ${color}; 
      box-shadow: 0 0 ${isLight ? '8px' : '15px'} ${color}; 
      color: ${isLight ? 'var(--clean-slate)' : 'white'}; 
      border-radius: 50%; 
      width: 100%; 
      height: 100%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-family: monospace; 
      font-weight: bold; 
      font-size: 14px;
      backdrop-filter: blur(4px);
    ">${count}</div>`,
    className: 'custom-cluster-icon',
    iconSize: [44, 44],
  });
};

// Global cache to store marker references without triggering React re-renders
const markerRefs = new Map<string, LeafletMarker>();

interface IncidentMarkerProps {
  incident: Incident;
  selectIncident: (incident: Incident | null) => void;
  setIsExpanded: (expanded: boolean) => void;
}

const IncidentMarker = memo(({ incident, selectIncident, setIsExpanded }: IncidentMarkerProps) => {
  const markerRef = useRef<LeafletMarker | null>(null);
  const { theme } = useTheme();

  return (
    <Marker
      ref={(r) => {
        if (r) {
          markerRefs.set(incident.id, r);
          markerRef.current = r;
        } else {
          markerRefs.delete(incident.id);
          markerRef.current = null;
        }
      }}
      position={[incident.lat, incident.lng]}
      icon={createPulseIcon(incident.severity, theme)}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          markerRef.current?.openPopup();
          setTimeout(() => {
            selectIncident(incident);
          }, 0);
        },
      }}
    >
      <Popup className="tactical-popup" closeButton={false} autoPan={false}>
        <div className="p-3 min-w-[240px] bg-background/90 border border-primary text-foreground font-mono text-xs relative overflow-hidden backdrop-blur-md">
          <div className="flex justify-between items-center mb-2 border-b border-primary/30 pb-1">
            <span className="text-primary font-bold">{incident.type}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              className="p-1 hover:bg-primary/20 rounded transition-colors text-primary"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
          <h3 className="font-bold mb-1 uppercase text-white">{incident.country}</h3>
          <p className="text-muted-foreground mb-2 line-clamp-3">{incident.summary}</p>
          <div className="flex justify-between items-center text-[10px] text-primary/70">
            <span>{format(new Date(incident.timestamp), 'dd MMM HH:mm')} Z</span>
            <span className={`px-1 rounded ${incident.severity > 80 ? 'bg-alert/20 text-alert' : 'bg-primary/20 text-primary'}`}>
              SEV: {incident.severity}
            </span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

IncidentMarker.displayName = 'IncidentMarker';

function MapController() {
  const map = useMap();
  const selectedIncident = useStore((state) => state.selectedIncident);

  useEffect(() => {
    if (selectedIncident) {
      const { lat, lng, id } = selectedIncident;
      const currentZoom = map.getZoom();
      const isVisible = map.getBounds().contains([lat, lng]);

      // Handle map movement
      if (!isVisible || currentZoom < 8) {
        map.flyTo([lat, lng], Math.max(currentZoom, 10), {
          animate: true,
          duration: 1.5,
          easeLinearity: 0.25
        });
      }

      // Handle popup opening via Leaflet API directly to avoid Marker re-renders
      // Defer slightly to ensure map flyTo has started and MarkerCluster has initialized
      setTimeout(() => {
        const marker = markerRefs.get(id);
        if (marker && !marker.isPopupOpen()) {
          marker.openPopup();
        }
      }, 100);
    }
  }, [selectedIncident, map]);

  return null;
}

function HeatmapOverlay() {
  const map = useMap();
  const { theme } = useTheme();
  const incidents = useStore((state) => state.incidents);
  const show = useStore((state) => state.activeLayers.heatmap);
  const timeframe = useStore((state) => state.timeframe);
  const feedFilters = useStore((state) => state.feedFilters);
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

  useEffect(() => {
    if (!map || !incidents.length || !show) return;

    const points = incidents
      .filter(i => {
        const matchesTime = new Date(i.timestamp).getTime() >= cutoffTime;
        let matchesFilter = feedFilters.includes('All');
        if (!matchesFilter) {
          matchesFilter = feedFilters.some(f => {
            if (f === 'Critical') return i.severity > 80;
            return i.type && i.type.includes(f);
          });
        }
        return matchesTime && matchesFilter && !isNaN(i.lat) && !isNaN(i.lng);
      })
      .map(i => [i.lat, i.lng, i.severity / 100]);

    if (points.length === 0) return;

    const isLight = theme === 'light';
    const gradient = isLight 
      ? { 0.4: '#0369A1', 0.6: '#0EA5E9', 0.8: '#14B8A6', 1: '#BE123C' } // Softer gradient for Light Mode
      : { 0.4: 'blue', 0.6: '#00F0FF', 0.8: '#00FF9F', 1: '#FF2A2A' };

    // L.heatLayer is added by Leaflet.heat and not in the base Leaflet types
    const heat = (L as unknown as { heatLayer: (points: number[][], options: object) => { addTo: (m: unknown) => void } }).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      max: 0.5, // Lower max makes density bleed into red faster
      minOpacity: 0.1,
      gradient: gradient
    });

    try {
      heat.addTo(map);
    } catch { /* suppress */ }

    return () => {
      try {
        if (map && map.hasLayer(heat as L.Layer)) {
          map.removeLayer(heat as L.Layer);
        }
      } catch { /* suppress */ }
    };
  }, [map, incidents, show, cutoffTime, theme, feedFilters]);

  return null;
}

function TacticalRanges() {
  const selected = useStore((state) => state.selectedIncident);
  const show = useStore((state) => state.activeLayers.ranges);

  if (!selected || !show) return null;

  return (
    <>
      <Circle center={[selected.lat, selected.lng]} radius={50000} pathOptions={{ color: '#FF2A2A', dashArray: '10, 10', fill: false, weight: 1 }} />
      <Circle center={[selected.lat, selected.lng]} radius={300000} pathOptions={{ color: '#00F0FF', dashArray: '20, 20', fill: false, weight: 1, opacity: 0.5 }} />
    </>
  );
}

function ExpandedDialogOverlay() {
  const isExpanded = useStore((state) => state.isExpanded);
  const selectedIncident = useStore((state) => state.selectedIncident);
  const setIsExpanded = useStore((state) => state.setIsExpanded);
  const translationCache = useStore((state) => state.translationCache);
  const cacheTranslation = useStore((state) => state.cacheTranslation);

  const [intelOriginal, setIntelOriginal] = useState<string | null>(null);
  const [intelTranslated, setIntelTranslated] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'translated'>('original');
  const [intelLoading, setIntelLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (isExpanded && selectedIncident?.url) {
      setIntelLoading(true);
      setViewMode('original');

      // Check Cache First
      const cached = translationCache[selectedIncident.url];
      if (cached) {
        setIntelOriginal(cached.original);
        setIntelTranslated(cached.translated);
        if (cached.translated) setViewMode('translated');
        setIntelLoading(false);
        return;
      }

      setIntelOriginal(null);
      setIntelTranslated(null);

      fetch('/api/intel/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedIncident.url })
      })
        .then(res => res.json())
        .then(data => {
          const content = data.content || null;
          setIntelOriginal(content);
          // Cache the original fetch so we don't re-fetch the markdown later either
          if (content) cacheTranslation(selectedIncident.url!, content, null);
        })
        .catch(() => setIntelOriginal('Failed to extract raw data.'))
        .finally(() => setIntelLoading(false));
    } else {
      setIntelOriginal(null);
      setIntelTranslated(null);
    }
  }, [isExpanded, selectedIncident, translationCache, cacheTranslation]);

  const handleTranslate = async () => {
    // If we already translated it, just switch the view
    if (intelTranslated) {
      setViewMode('translated');
      return;
    }

    const textToTranslate = intelOriginal || selectedIncident?.summary;
    if (!textToTranslate) return;

    setIsTranslating(true);
    try {
      const res = await fetch('/api/intel/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate })
      });
      const data = await res.json();
      if (data.translatedText) {
        setIntelTranslated(data.translatedText);
        setViewMode('translated');
        // Save to cache
        if (selectedIncident?.url) {
          cacheTranslation(selectedIncident.url, intelOriginal, data.translatedText);
        }
      }
    } catch { /* handle */ }
    finally { setIsTranslating(false); }
  };

  if (!isExpanded || !selectedIncident) return null;

  const displayContent = viewMode === 'translated' ? intelTranslated : (intelOriginal || selectedIncident.summary);
  
  // Clean up malformed markdown (such as unescaped nested quotes in image titles which break the parser)
  const sanitizedContent = (displayContent || "").replace(/(!?)\[(.*?)\]\(([^)\s]+)\s+[^)]+\)/g, '$1[$2]($3)');

  return (
    <div className="absolute inset-0 z-[1000] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-2xl bg-card border border-primary/30 shadow-2xl rounded-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-border bg-primary/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className={`w-5 h-5 ${selectedIncident.severity > 80 ? 'text-alert' : 'text-primary'}`} />
            <div>
              <h2 className="text-sm font-bold font-mono text-white uppercase tracking-widest leading-none">Intelligence Report</h2>
              <p className="text-[10px] text-muted-foreground font-mono mt-1">ID: {selectedIncident.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {intelTranslated && viewMode === 'translated' ? (
              <button onClick={() => setViewMode('original')} className="flex items-center gap-2 px-3 py-1.5 bg-secondary/10 border border-secondary/30 text-secondary text-[10px] font-mono uppercase rounded hover:bg-secondary/20 transition-all">
                <Globe className="w-3 h-3" /> View Original
              </button>
            ) : (
              <button onClick={handleTranslate} disabled={isTranslating || intelLoading} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono uppercase rounded hover:bg-primary/20 transition-all disabled:opacity-50">
                {isTranslating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                {isTranslating ? 'Translating...' : (intelTranslated ? 'View Translation' : 'Translate to EN')}
              </button>
            )}
            <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6 font-mono">
          <div>
            <h3 className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><Globe className="w-3 h-3" /> Theater of Operation</h3>
            <p className="text-xl font-bold text-white uppercase tracking-tight">{selectedIncident.country}</p>
          </div>
          <div>
            <h3 className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-2 flex justify-between items-center">
              <span>{viewMode === 'translated' ? 'TRANSLATED INTEL DATA' : 'RAW INTEL DATA'}</span>
              {intelLoading && <span className="text-[9px] animate-pulse">HYDRATING...</span>}
            </h3>
            <div className="bg-background/50 p-6 border border-primary/20 rounded relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
              <div className="text-sm leading-relaxed text-foreground prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-primary/20 prose-img:rounded-sm prose-img:border prose-img:border-primary/30 prose-img:shadow-lg max-w-none">
                {intelLoading ? (
                  <span className="text-muted-foreground opacity-50 italic">Establishing secure connection...</span>
                ) : (
                  <ReactMarkdown
                    components={{
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      img: ({ src, alt, ...props }: any) => {
                        if (!src) return null;
                        // eslint-disable-next-line @next/next/no-img-element
                        return <img src={src} alt={alt || ''} {...props} />;
                      }
                    }}
                  >{sanitizedContent}</ReactMarkdown>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <span className="px-2 py-1 bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono uppercase rounded">Type: {selectedIncident.type}</span>
            <span className="px-2 py-1 bg-secondary/10 border border-secondary/30 text-secondary text-[10px] font-mono uppercase rounded">Source: {selectedIncident.source}</span>
            <span className={`px-2 py-1 border text-[10px] font-mono uppercase rounded ${selectedIncident.severity > 80 ? 'bg-alert/10 border-alert/30 text-alert' : 'bg-primary/10 border-primary/30 text-primary'}`}>Severity: {selectedIncident.severity}</span>
          </div>
        </div>
        <div className="p-4 border-t border-border bg-background flex justify-end gap-3">
          {selectedIncident.url && (
            <a href={selectedIncident.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-fg text-xs font-bold font-mono rounded hover:bg-primary/90 transition-all uppercase">
              <ExternalLink className="w-3.5 h-3.5" /> View Original Source
            </a>
          )}
          <button onClick={() => setIsExpanded(false)} className="px-4 py-2 border border-border text-foreground text-xs font-bold font-mono rounded hover:bg-white/5 transition-all uppercase">Close Report</button>
        </div>
      </div>
    </div>
  );
}

export default function TacticalMap() {
  const incidents = useStore((state) => state.incidents);
  const selectIncident = useStore((state) => state.selectIncident);
  const setIsExpanded = useStore((state) => state.setIsExpanded);
  const timeframe = useStore((state) => state.timeframe);
  const feedFilters = useStore((state) => state.feedFilters);
  const [cutoffTime, setCutoffTime] = useState(0);

  useEffect(() => {
    let hours = 24;
    if (timeframe.endsWith('H')) hours = parseInt(timeframe, 10);
    else if (timeframe.endsWith('D')) hours = parseInt(timeframe, 10) * 24;
    
    // Set safely inside effect to prevent React Hook Purity violations (Date.now() is impure)
    const handle = requestAnimationFrame(() => {
      setCutoffTime(Date.now() - (hours * 60 * 60 * 1000));
    });
    return () => cancelAnimationFrame(handle);
  }, [timeframe]);

  const scatteredIncidents = React.useMemo(() => {
    const filtered = incidents.filter(i => {
      const matchesTime = new Date(i.timestamp).getTime() >= cutoffTime;
      let matchesFilter = feedFilters.includes('All');
      if (!matchesFilter) {
        matchesFilter = feedFilters.some(f => {
          if (f === 'Critical') return i.severity > 80;
          return i.type && i.type.includes(f);
        });
      }
      return matchesTime && matchesFilter;
    });
    
    // Group by exact coordinates
    const groups: Record<string, Incident[]> = {};
    filtered.forEach(inc => {
      const key = `${inc.lat.toFixed(4)},${inc.lng.toFixed(4)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(inc);
    });

    // Scatter overlapping points using a spiral algorithm
    const result: (Incident & { scatteredLat: number; scatteredLng: number })[] = [];
    
    Object.values(groups).forEach(group => {
      if (group.length === 1) {
        result.push({ ...group[0], scatteredLat: group[0].lat, scatteredLng: group[0].lng });
        return;
      }

      const centerLat = group[0].lat;
      const centerLng = group[0].lng;
      
      // Base radius in meters (~500m per ring)
      const ringSpacingMeters = 500; 

      group.forEach((inc, index) => {
        if (index === 0) {
          result.push({ ...inc, scatteredLat: centerLat, scatteredLng: centerLng });
          return;
        }

        // Calculate ring metrics mathematically for a nice distribution
        // Ring 1 holds ~8 items, Ring 2 holds ~16 items, etc.
        let itemsInCurrentRing = 8;
        let ringIndex = 1;
        let itemsCounted = 1;

        while (index >= itemsCounted + itemsInCurrentRing) {
          itemsCounted += itemsInCurrentRing;
          ringIndex++;
          itemsInCurrentRing = ringIndex * 8;
        }

        const positionInRing = index - itemsCounted;
        const angleStep = (Math.PI * 2) / itemsInCurrentRing;
        const angle = positionInRing * angleStep;

        const radiusMeters = ringIndex * ringSpacingMeters;
        
        // Convert offset in meters to lat/lng degrees
        // 1 degree lat is ~111,320 meters
        const dLat = (radiusMeters * Math.sin(angle)) / 111320;
        // 1 degree lng varies by latitude
        const dLng = (radiusMeters * Math.cos(angle)) / (111320 * Math.cos(centerLat * (Math.PI / 180)));

        result.push({
          ...inc,
          scatteredLat: centerLat + dLat,
          scatteredLng: centerLng + dLng
        });
      });
    });

    return result;
  }, [incidents, cutoffTime, feedFilters]);
  const { theme } = useTheme();

  const markers = scatteredIncidents.map((incident) => (
    <IncidentMarker
      key={incident.id}
      incident={{...incident, lat: incident.scatteredLat, lng: incident.scatteredLng}}
      selectIncident={selectIncident}
      setIsExpanded={setIsExpanded}
    />
  ));

  const mapStyle = theme === 'light' 
    ? "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  return (
    <div className="relative w-full h-full z-0 bg-background">
      <MapContainer
        center={[20, 0]}
        zoom={3}
        className="w-full h-full outline-none bg-background transition-colors duration-300"
        attributionControl={false}
      >
        <TileLayer url={mapStyle} attribution="&copy; CARTO" />
        <MapController />
        <HeatmapOverlay />
        <TacticalRanges />

        {scatteredIncidents.length > 300 ? (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={100}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom={true}
            iconCreateFunction={(c: { getChildCount: () => number }) => createCustomClusterIcon(c, theme)}
          >
            {markers}
          </MarkerClusterGroup>
        ) : (
          <>{markers}</>
        )}
      </MapContainer>

      <ExpandedDialogOverlay />
    </div>
  );
}