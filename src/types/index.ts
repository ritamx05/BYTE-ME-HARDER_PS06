export interface Patient {
  id: string;
  name: string;
  severity: number;
  arrivalType: 'Walk-in' | 'Ambulance';
  waitTime: number;
  priorityScore: number;
  status: 'Waiting' | 'Assigned' | 'Treated';
  bedId: string | null;
  arrivedAt: number;
}

export interface BedState {
  total: number;
  available: number;
  reserved: number;
}

export interface Reservation {
  id: string;
  expiresAt: number;
}

export interface ERState {
  patients: Patient[];
  beds: BedState;
  reservations: Reservation[];
  mciMode: boolean;
}
