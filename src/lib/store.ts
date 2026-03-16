import { create } from 'zustand';
import { Incident } from '@/lib/api-client';

export interface UserAsset {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'factory' | 'warehouse' | 'office' | 'port';
}

interface AppState {
  // UI State
  sidebarOpen: boolean;
  activeTab: 'intel' | 'assets' | 'analytics';
  setActiveTab: (tab: 'intel' | 'assets' | 'analytics') => void;
  
  // Map State
  activeLayers: {
    weather: boolean;
    ranges: boolean;
    heatmap: boolean;
  };
  toggleLayer: (layer: keyof AppState['activeLayers']) => void;

  // Context State
  selectedIncident: Incident | null;
  selectIncident: (incident: Incident | null) => void;
  
  // Data State
  incidents: Incident[];
  setIncidents: (incidents: Incident[]) => void;
  mergeIncidents: (newIncidents: Incident[]) => void; // NEW: Robust deduplication

  // Asset Management
  assets: UserAsset[];
  addAsset: (asset: UserAsset) => void;
  removeAsset: (id: string) => void;

  // Dialog & Sentinel States
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  marketSentinelCollapsed: boolean;
  setMarketSentinelCollapsed: (collapsed: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  sidebarOpen: true,
  activeTab: 'intel',
  setActiveTab: (tab) => set({ activeTab: tab }),

  activeLayers: {
    weather: false,
    ranges: false,
    heatmap: true,
  },
  toggleLayer: (layer) => set((state) => ({
    activeLayers: { ...state.activeLayers, [layer]: !state.activeLayers[layer] }
  })),

  selectedIncident: null,
  selectIncident: (incident) => set({ selectedIncident: incident }),

  incidents:[],
  setIncidents: (incidents) => set({ incidents }),

  // Safely merges new API requests into existing data, ignoring duplicates 
  // by checking stable IDs, and capping array length to prevent browser crashes.
  mergeIncidents: (newIncidents) => set((state) => {
    const existingMap = new Map(state.incidents.map(i =>[i.id, i]));
    let addedCount = 0;
    
    newIncidents.forEach(inc => {
      if (!existingMap.has(inc.id)) {
        existingMap.set(inc.id, inc);
        addedCount++;
      }
    });

    // Don't trigger a re-render if no new data was fetched
    if (addedCount === 0) return state;

    // Sort descending and cap at 10,000 maximum map points
    const mergedAndSorted = Array.from(existingMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10000);

    return { incidents: mergedAndSorted };
  }),

  assets:[
    { id: '1', name: 'Main HQ', lat: 28.6139, lng: 77.2090, type: 'office' }, 
  ],
  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
  removeAsset: (id) => set((state) => ({ assets: state.assets.filter(a => a.id !== id) })),

  isExpanded: false,
  setIsExpanded: (expanded) => set({ isExpanded: expanded }),
  
  marketSentinelCollapsed: false,
  setMarketSentinelCollapsed: (collapsed) => set({ marketSentinelCollapsed: collapsed }),
}));