export interface Patient {
  id: string;
  name: string;
  severity: number;
  arrivalType: 'Walk-in' | 'Ambulance';
  isAmbulance: boolean;
  waitTime: number;
  priorityScore: number;
  survivalProbability: number;
  status: 'waiting' | 'assigned' | 'with_doctor' | 'treated';
  bedId: string | null;
  arrivedAt: number;       // epoch ms (client-stamped on add)
  arrivedAtMs?: number;    // ms epoch set by backend on insert (same as arrivedAt)
  arrivalTime: string;     // ISO string from backend
  symptoms?: string;
  assignedDoctorId?: string | null;
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

export type BedStatus = 'available' | 'occupied' | 'reserved';
export type Dept = 'ER' | 'OPD';
export type Spec = 'ENT' | 'Cardiology' | 'Surgeon' | 'General' | 'Orthopedic';

export interface Bed {
  id: string;
  number: number;
  status: BedStatus;
  patientId: string | null;
}

export interface Room {
  id: string;
  number: number;
  beds: Bed[];
}

export interface Doctor {
  id: string;
  name: string;
  specialization: Spec;
  department: Dept;
  isAvailable: boolean;
  currentPatientId: string | null;
}
