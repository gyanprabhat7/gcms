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

  // Asset Management (The "Killer" Use Case)
  assets: UserAsset[];
  addAsset: (asset: UserAsset) => void;
  removeAsset: (id: string) => void;
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

  incidents: [],
  setIncidents: (incidents) => set({ incidents }),

  assets: [
    { id: '1', name: 'Main HQ', lat: 28.6139, lng: 77.2090, type: 'office' }, // Default New Delhi HQ
  ],
  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
  removeAsset: (id) => set((state) => ({ assets: state.assets.filter(a => i.id !== id) })),
}));