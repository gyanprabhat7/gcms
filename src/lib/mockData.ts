export interface Incident {
  id: string;
  lat: number;
  lng: number;
  type: 'Conflict' | 'Naval' | 'Air' | 'Protest' | 'Terror' | 'Disaster';
  severity: number;
  summary: string;
  source: string;
  timestamp: string;
  country: string;
}

export const mockIncidents: Incident[] = [
  {
    id: 'inc-001',
    lat: 48.3794,
    lng: 31.1656,
    type: 'Conflict',
    severity: 85,
    summary: 'Heavy artillery fire reported near frontline positions.',
    source: 'ACLED',
    timestamp: new Date().toISOString(),
    country: 'Ukraine'
  },
  {
    id: 'inc-002',
    lat: 31.5,
    lng: 34.4667,
    type: 'Conflict',
    severity: 92,
    summary: 'Airstrike reported in residential area.',
    source: 'GDELT',
    timestamp: new Date().toISOString(),
    country: 'Gaza'
  },
  {
    id: 'inc-003',
    lat: 15.5527,
    lng: 48.5164,
    type: 'Conflict',
    severity: 78,
    summary: 'Clashes between rival factions.',
    source: 'ReliefWeb',
    timestamp: new Date().toISOString(),
    country: 'Yemen'
  },
  {
    id: 'inc-004',
    lat: 25.276987,
    lng: 55.296249,
    type: 'Naval',
    severity: 60,
    summary: 'Suspicious naval activity detected in the Gulf.',
    source: 'AISHub',
    timestamp: new Date().toISOString(),
    country: 'UAE'
  },
  {
    id: 'inc-005',
    lat: 35.6892,
    lng: 51.3890,
    type: 'Air',
    severity: 45,
    summary: 'Unidentified aircraft tracked near airspace boundary.',
    source: 'OpenSky',
    timestamp: new Date().toISOString(),
    country: 'Iran'
  },
  {
    id: 'inc-006',
    lat: 12.8628,
    lng: 30.2176,
    type: 'Conflict',
    severity: 88,
    summary: 'Large-scale military mobilization observed.',
    source: 'ACLED',
    timestamp: new Date().toISOString(),
    country: 'Sudan'
  },
   {
    id: 'inc-007',
    lat: 23.6345,
    lng: -102.5528,
    type: 'Terror',
    severity: 75,
    summary: 'Cartel related violence escalating in the region.',
    source: 'NewsAPI',
    timestamp: new Date().toISOString(),
    country: 'Mexico'
  },
   {
    id: 'inc-008',
    lat: 33.8547,
    lng: 35.8623,
    type: 'Conflict',
    severity: 82,
    summary: 'Cross-border skirmishes reported.',
    source: 'GNews',
    timestamp: new Date().toISOString(),
    country: 'Lebanon'
  }
];

export const mockStats = {
  totalIncidents: 142,
  criticalAlerts: 12,
  topRisks: [
    { country: 'Ukraine', score: 92 },
    { country: 'Gaza', score: 89 },
    { country: 'Sudan', score: 85 },
    { country: 'Yemen', score: 78 },
    { country: 'Myanmar', score: 72 }
  ]
};
