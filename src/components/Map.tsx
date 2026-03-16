'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { divIcon } from 'leaflet';
import 'leaflet.heat'; 
import MarkerClusterGroup from 'react-leaflet-cluster';
import { format } from 'date-fns';
import { Incident } from '@/lib/api-client';
import { useStore } from '@/lib/store';
import React, { memo } from 'react';
import { Maximize2, X, ExternalLink, Shield, Globe, Clock, MapPin, Languages, RefreshCw } from 'lucide-react';

// --- Icons ---
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

// --- Sub-Components ---

// Memoized Marker to prevent unnecessary re-renders
const IncidentMarker = memo(({ incident, selectIncident, setIsExpanded }: any) => {
  return (
    <Marker
      position={[incident.lat, incident.lng]}
      icon={createPulseIcon(incident.severity)}
      eventHandlers={{
        click: () => {
          selectIncident(incident);
        },
      }}
    >
      <Popup className="tactical-popup" closeButton={false}>
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

// 1. Flight Controller
function MapController() {
  const map = useMap();
  const selectedIncident = useStore((state) => state.selectedIncident);

  useEffect(() => {
    if (selectedIncident) {
      const currentZoom = map.getZoom();
      const targetZoom = currentZoom > 8 ? currentZoom : 8;
      map.flyTo([selectedIncident.lat, selectedIncident.lng], targetZoom, { duration: 1.5 });
    }
  }, [selectedIncident, map]);

  return null;
}

// 2. Heatmap Layer
function HeatmapOverlay() {
  const map = useMap();
  const incidents = useStore((state) => state.incidents);
  const show = useStore((state) => state.activeLayers.heatmap);

  useEffect(() => {
    if (!map || !incidents.length || !show) return;

    // Ensure map is ready and has panes
    if (!map.getPane('overlayPane')) return;

    const points = incidents
      .filter(i => !isNaN(i.lat) && !isNaN(i.lng))
      .map(i => [i.lat, i.lng, i.severity / 100]);

    // @ts-ignore
    const heat = L.heatLayer(points, {
      radius: 15,
      blur: 10,
      maxZoom: 10,
      minOpacity: 0.1,
      gradient: { 0.4: 'blue', 0.6: '#00F0FF', 0.8: '#00FF9F', 1: '#FF2A2A' }
    });

    try {
      heat.addTo(map);
    } catch (e) {
      console.warn("Heatmap add failed", e);
    }

    return () => {
      try {
        if (map && map.hasLayer(heat)) {
          map.removeLayer(heat);
        }
      } catch (e) {}
    };
  }, [map, incidents, show]);

  return null;
}

// 3. Tactical Ranges (Weapon Zones)
function TacticalRanges() {
  const selected = useStore((state) => state.selectedIncident);
  const show = useStore((state) => state.activeLayers.ranges);

  if (!selected || !show) return null;

  return (
    <>
      {/* 50km Artillery Range */}
      <Circle 
        center={[selected.lat, selected.lng]} 
        radius={50000} 
        pathOptions={{ color: '#FF2A2A', dashArray: '10, 10', fill: false, weight: 1 }} 
      />
      {/* 300km Missile Range */}
      <Circle 
        center={[selected.lat, selected.lng]} 
        radius={300000} 
        pathOptions={{ color: '#00F0FF', dashArray: '20, 20', fill: false, weight: 1, opacity: 0.5 }} 
      />
    </>
  );
}

// --- Main Map Component ---

export default function Map() {
  const { 
    incidents, 
    selectIncident, 
    selectedIncident, 
    isExpanded, 
    setIsExpanded,
    scrapedContent,
    cacheScrapedContent
  } = useStore();
  const [mounted, setMounted] = useState(false);
  const [intelLoading, setIntelLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  // Apply spiral jitter to markers at the same coordinate
  const jitteredIncidents = React.useMemo(() => {
    const coordMap: Record<string, number> = {};
    return incidents.map((inc) => {
      const key = `${inc.lat.toFixed(4)}-${inc.lng.toFixed(4)}`;
      const index = coordMap[key] || 0;
      coordMap[key] = index + 1;

      if (index === 0) return inc;

      const shift = 0.00008 * Math.sqrt(index);
      const angle = index * 137.508;
      return {
        ...inc,
        lat: inc.lat + shift * Math.cos(angle * (Math.PI / 180)),
        lng: inc.lng + shift * Math.sin(angle * (Math.PI / 180))
      };
    });
  }, [incidents]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (isExpanded && selectedIncident?.url) {
      // Check cache first
      if (scrapedContent[selectedIncident.url]) {
        return; 
      }

      setIntelLoading(true);
      fetch('/api/intel/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: selectedIncident.url })
      })
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          cacheScrapedContent(selectedIncident.url!, data.content);
        }
      })
      .catch(e => console.error("Intel fetch error", e))
      .finally(() => setIntelLoading(false));
    }
  }, [isExpanded, selectedIncident, scrapedContent, cacheScrapedContent]);

  const handleTranslate = async () => {
    const textToTranslate = (selectedIncident?.url ? scrapedContent[selectedIncident.url] : null) || selectedIncident?.summary;
    if (!textToTranslate) return;

    setIsTranslating(true);
    try {
      const res = await fetch('/api/intel/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate })
      });
      const data = await res.json();
      if (data.translatedText && selectedIncident?.url) {
        cacheScrapedContent(selectedIncident.url, data.translatedText);
      }
    } catch (e) {
      console.error("Translation failed", e);
    } finally {
      setIsTranslating(false);
    }
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
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; CARTO"
        />

        <MapController />
        <HeatmapOverlay />
        <TacticalRanges />
        
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={30}
          disableClusteringAtZoom={14}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={false}
        >
          {jitteredIncidents.map((incident) => (
            <IncidentMarker
              key={incident.id}
              incident={incident}
              selectIncident={selectIncident}
              setIsExpanded={setIsExpanded}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Expanded Dialog */}
      {isExpanded && selectedIncident && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-card border border-primary/30 shadow-2xl rounded-sm overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-4 border-b border-border bg-primary/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Shield className={`w-5 h-5 ${selectedIncident.severity > 80 ? 'text-alert' : 'text-primary'}`} />
                <div>
                  <h2 className="text-sm font-bold font-mono text-white uppercase tracking-widest leading-none">
                    Intelligence Report
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">ID: {selectedIncident.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTranslate}
                  disabled={isTranslating || intelLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono uppercase rounded hover:bg-primary/20 transition-all disabled:opacity-50"
                >
                  {isTranslating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                  {isTranslating ? 'Translating...' : 'Translate to EN'}
                </button>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6 font-mono">
              <div>
                <h3 className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Theater of Operation
                </h3>
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
                    {intelLoading ? (
                      <span className="text-muted-foreground opacity-50 italic">Establishing secure connection to source theater...</span>
                    ) : (selectedIncident.url ? scrapedContent[selectedIncident.url] : null) || selectedIncident.summary}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                <span className="px-2 py-1 bg-primary/10 border border-primary/30 text-primary text-[10px] font-mono uppercase rounded">
                  Type: {selectedIncident.type}
                </span>
                <span className="px-2 py-1 bg-secondary/10 border border-secondary/30 text-secondary text-[10px] font-mono uppercase rounded">
                  Source: {selectedIncident.source}
                </span>
                <span className={`px-2 py-1 border text-[10px] font-mono uppercase rounded ${
                  selectedIncident.severity > 80 
                    ? 'bg-alert/10 border-alert/30 text-alert' 
                    : 'bg-primary/10 border-primary/30 text-primary'
                }`}>
                  Severity: {selectedIncident.severity}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-background flex justify-end gap-3">
              {selectedIncident.url && (
                <a 
                  href={selectedIncident.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-fg text-xs font-bold font-mono rounded hover:bg-primary/90 transition-all uppercase"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Original Source
                </a>
              )}
              <button 
                onClick={() => setIsExpanded(false)}
                className="px-4 py-2 border border-border text-foreground text-xs font-bold font-mono rounded hover:bg-white/5 transition-all uppercase"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
