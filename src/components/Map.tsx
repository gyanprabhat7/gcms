'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { divIcon } from 'leaflet';
import 'leaflet.heat'; 
import { format } from 'date-fns';
import { Incident } from '@/lib/api-client';
import { useStore } from '@/lib/store';

// --- Sub-Components ---

// 1. Flight Controller
function MapController() {
  const map = useMap();
  const selectedIncident = useStore((state) => state.selectedIncident);

  useEffect(() => {
    if (selectedIncident) {
      map.flyTo([selectedIncident.lat, selectedIncident.lng], 8, { duration: 1.5 });
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

    const points = incidents
      .filter(i => !isNaN(i.lat) && !isNaN(i.lng))
      .map(i => [i.lat, i.lng, i.severity / 100]);

    // @ts-ignore
    const heat = L.heatLayer(points, {
      radius: 30,
      blur: 20,
      maxZoom: 10,
      gradient: { 0.4: 'blue', 0.6: '#00F0FF', 0.8: '#00FF9F', 1: '#FF2A2A' }
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
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

export default function Map() {
  const { incidents, selectIncident } = useStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="relative w-full h-full z-0 bg-[#050505]">
      <MapContainer
        center={[20, 0]}
        zoom={3}
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
        
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.lat, incident.lng]}
            icon={createPulseIcon(incident.severity)}
            eventHandlers={{
              click: () => selectIncident(incident),
            }}
          >
            <Popup className="tactical-popup" closeButton={false}>
              <div className="p-3 min-w-[240px] bg-[#050505]/90 border border-primary text-foreground font-mono text-xs relative overflow-hidden backdrop-blur-md">
                <div className="flex justify-between items-center mb-2 border-b border-primary/30 pb-1">
                  <span className="text-primary font-bold">{incident.type}</span>
                  <span className={`px-1.5 rounded ${incident.severity > 80 ? 'bg-alert/20 text-alert' : 'bg-primary/20 text-primary'}`}>
                    SEV: {incident.severity}
                  </span>
                </div>
                <h3 className="font-bold mb-1 uppercase text-white">{incident.country}</h3>
                <p className="text-muted-foreground mb-2 line-clamp-3">{incident.summary}</p>
                <div className="text-[10px] text-primary/70">
                  {format(new Date(incident.timestamp), 'dd MMM HH:mm')} Z
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}