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
import { Incident } from '@/lib/api-client';

const createPulseIcon = (severity: number) => {
  const color = severity > 80 ? '#FF2A2A' : '#00F0FF';
  return divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="position: relative; width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 6px; height: 6px; background-color: ${color}; border-radius: 50%; box-shadow: 0 0 10px ${color}; z-index: 10;"></div>
        <div style="position: absolute; width: 12px; height: 12px; border: 1px solid ${color}; border-radius: 50%; opacity: 0.8; animation: pulse-slow 2s infinite;"></div>
      </div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -10]
  });
};

const createCustomClusterIcon = (cluster: { getChildCount: () => number }) => {
  const count = cluster.getChildCount();
  let color = '#00F0FF';
  if (count > 50) color = '#FF2A2A';
  else if (count > 15) color = '#FFFF00';

  return divIcon({
    html: `<div style="
      background-color: ${color}30; 
      border: 2px solid ${color}; 
      box-shadow: 0 0 15px ${color}; 
      color: white; 
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

interface IncidentMarkerProps {
  incident: Incident;
  selectIncident: (incident: Incident | null) => void;
  selectedIncident: Incident | null;
  setIsExpanded: (expanded: boolean) => void;
}

const IncidentMarker = memo(({ incident, selectIncident, selectedIncident, setIsExpanded }: IncidentMarkerProps) => {
  const markerRef = useRef<LeafletMarker>(null);
  const map = useMap();
  const isSelected = selectedIncident?.id === incident.id;

  useEffect(() => {
    if (isSelected && markerRef.current) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  return (
    <Marker
      ref={markerRef}
      position={[incident.lat, incident.lng]}
      icon={createPulseIcon(incident.severity)}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          selectIncident(incident);
        },
      }}
    >
      <Popup className="tactical-popup" closeButton={false} autoPan={false}>
        <div className="p-3 min-w-[240px] bg-[#050505]/90 border border-primary text-foreground font-mono text-xs relative overflow-hidden backdrop-blur-md">
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
  // FlyTo logic disabled per user request to prevent inconvenient zooming
  return null;
}

function HeatmapOverlay() {
  const map = useMap();
  const incidents = useStore((state) => state.incidents);
  const show = useStore((state) => state.activeLayers.heatmap);

  useEffect(() => {
    if (!map || !incidents.length || !show) return;

    const points = incidents
      .filter(i => !isNaN(i.lat) && !isNaN(i.lng))
      .map(i => [i.lat, i.lng, i.severity / 100]);

    // @ts-expect-error - L.heatLayer is added by Leaflet.heat and not in the base Leaflet types
    const heat = (L as unknown as { heatLayer: (points: number[][], options: object) => { addTo: (m: unknown) => void } }).heatLayer(points, {
      radius: 15,
      blur: 10,
      maxZoom: 10,
      minOpacity: 0.1,
      gradient: { 0.4: 'blue', 0.6: '#00F0FF', 0.8: '#00FF9F', 1: '#FF2A2A' }
    });

    try {
      heat.addTo(map);
    } catch { /* suppress */ }

    return () => {
      try {
        if (map && map.hasLayer(heat)) {
          map.removeLayer(heat);
        }
      } catch { /* suppress */ }
    };
  }, [map, incidents, show]);

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

export default function Map() {
  const { incidents, selectIncident, selectedIncident, isExpanded, setIsExpanded } = useStore();
  const [mounted, setMounted] = useState(false);
  const [intelContent, setIntelContent] = useState<string | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const handle = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(handle);
  }, []);

  useEffect(() => {
    if (isExpanded && selectedIncident?.url) {
      setIntelLoading(true);
      fetch('/api/intel/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedIncident.url })
      })
      .then(res => res.json())
      .then(data => {
        setIntelContent(data.content || null);
      })
      .catch(() => setIntelContent('Failed to extract raw data.'))
      .finally(() => setIntelLoading(false));
    } else {
      setIntelContent(null);
    }
  }, [isExpanded, selectedIncident]);

  const handleTranslate = async () => {
    const textToTranslate = intelContent || selectedIncident?.summary;
    if (!textToTranslate) return;

    setIsTranslating(true);
    try {
      const res = await fetch('/api/intel/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate })
      });
      const data = await res.json();
      if (data.translatedText) setIntelContent(data.translatedText);
    } catch { /* handle */ } 
    finally { setIsTranslating(false); }
  };

  if (!mounted) return null;

  return (
    <div className="relative w-full h-full z-0 bg-[#050505]">
      <MapContainer
        center={[20, 0]}
        zoom={3}
        preferCanvas={true}
        className="w-full h-full outline-none bg-[#050505]"
        attributionControl={false}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
        <MapController />
        <HeatmapOverlay />
        <TacticalRanges />
        
        <MarkerClusterGroup 
          chunkedLoading 
          maxClusterRadius={100} 
          showCoverageOnHover={false} 
          spiderfyOnMaxZoom={true} 
          iconCreateFunction={createCustomClusterIcon}
        >
          {incidents.map((incident) => (
            <IncidentMarker 
              key={incident.id} 
              incident={incident} 
              selectIncident={selectIncident} 
              selectedIncident={selectedIncident} 
              setIsExpanded={setIsExpanded} 
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Expanded Dialog Overlay */}
      {isExpanded && selectedIncident && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm">
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
                <button onClick={handleTranslate} disabled={isTranslating || intelLoading} className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono uppercase rounded hover:bg-primary/20 transition-all disabled:opacity-50">
                  {isTranslating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                  {isTranslating ? 'Translating...' : 'Translate to EN'}
                </button>
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
                  <span>RAW INTEL DATA</span>
                  {intelLoading && <span className="text-[9px] animate-pulse">HYDRATING...</span>}
                </h3>
                <div className="bg-background/50 p-6 border border-primary/20 rounded relative group overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {intelLoading ? <span className="text-muted-foreground opacity-50 italic">Establishing secure connection...</span> : intelContent || selectedIncident.summary}
                  </p>
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
      )}
    </div>
  );
}