import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  
  // Data State & Persistent Log
  incidents: Incident[];
  setIncidents: (incidents: Incident[]) => void;
  
  // Location Filter
  locationFilter: string | null;
  setLocationFilter: (filter: string | null) => void;
  
  // Scraped Content Cache
  scrapedContent: Record<string, string>; // url -> content
  cacheScrapedContent: (url: string, content: string) => void;

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

export const useStore = create<AppState>()(
  persist(
    (set) => ({
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
      setIncidents: (newIncidents) => set((state) => {
        // Merge new incidents with existing ones, deduplicating by ID
        const existingIds = new Set(state.incidents.map(i => i.id));
        const uniqueNew = newIncidents.filter(i => !existingIds.has(i.id));
        // Keep most recent at the top
        const combined = [...uniqueNew, ...state.incidents].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        return { incidents: combined };
      }),

      locationFilter: null,
      setLocationFilter: (filter) => set({ locationFilter: filter }),

      scrapedContent: {},
      cacheScrapedContent: (url, content) => set((state) => ({
        scrapedContent: { ...state.scrapedContent, [url]: content }
      })),

      assets: [
        { id: '1', name: 'Main HQ', lat: 28.6139, lng: 77.2090, type: 'office' },
      ],
      addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),
      removeAsset: (id) => set((state) => ({ assets: state.assets.filter(a => a.id !== id) })),

      isExpanded: false,
      setIsExpanded: (expanded) => set({ isExpanded: expanded }),
      
      marketSentinelCollapsed: false,
      setMarketSentinelCollapsed: (collapsed) => set({ marketSentinelCollapsed: collapsed }),
    }),
    {
      name: 'gcms-intelligence-cache',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        incidents: state.incidents, 
        scrapedContent: state.scrapedContent,
        assets: state.assets,
        marketSentinelCollapsed: state.marketSentinelCollapsed 
      }),
    }
  )
);