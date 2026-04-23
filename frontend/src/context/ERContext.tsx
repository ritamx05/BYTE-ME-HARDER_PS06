import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { socketService } from '../services/api';
import { ERState, Patient, BedState, Reservation } from '../types';

export interface EscalationToast {
  id: string;
  message: string;
  action: 'bed_assigned' | 'with_doctor';
  patientName: string;
  severity: number;
}

interface ERContextType extends ERState {
  addPatient: (name: string, severity: number, arrivalType: 'Walk-in' | 'Ambulance') => Promise<void>;
  assignBed: () => Promise<void>;
  reserveBed: () => Promise<void>;
  toggleMCI: (enabled: boolean) => Promise<void>;
  isConnected: boolean;
  toasts: EscalationToast[];
  dismissToast: (id: string) => void;
}

const ERContext = createContext<ERContextType | undefined>(undefined);

export const ERProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ERState>({
    patients: [],
    beds: { total: 0, available: 0, reserved: 0 },
    reservations: [],
    mciMode: false,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [toasts, setToasts] = useState<EscalationToast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('initial_state', (data: ERState) => setState(data));

    socket.on('update_queue', (patients: Patient[]) => {
      setState(prev => ({ ...prev, patients }));
    });
    socket.on('update_beds', (beds: BedState) => {
      setState(prev => ({ ...prev, beds }));
    });
    socket.on('update_reservations', (reservations: Reservation[]) => {
      setState(prev => ({ ...prev, reservations }));
    });
    socket.on('update_mci', (mciMode: boolean) => {
      setState(prev => ({ ...prev, mciMode }));
    });

    // Real-time escalation notifications
    socket.on('patient_escalated', (data: {
      patient: Patient;
      action: 'bed_assigned' | 'with_doctor';
      message: string;
    }) => {
      const toast: EscalationToast = {
        id: `${data.patient.id}-${Date.now()}`,
        message: data.message,
        action: data.action,
        patientName: data.patient.name,
        severity: data.patient.severity,
      };
      setToasts(prev => [toast, ...prev].slice(0, 5)); // max 5 toasts
      // Auto-dismiss after 6s
      setTimeout(() => dismissToast(toast.id), 6000);
    });

    return () => {
      socketService.disconnect();
    };
  }, [dismissToast]);

  const addPatient = async (name: string, severity: number, arrivalType: 'Walk-in' | 'Ambulance') => {
    await socketService.addPatient(name, severity, arrivalType);
  };

  const assignBed = async () => {
    await socketService.assignBed();
  };

  const reserveBed = async () => {
    await socketService.reserveBed();
  };

  const toggleMCI = async (enabled: boolean) => {
    await socketService.toggleMCI(enabled);
  };

  return (
    <ERContext.Provider value={{ ...state, addPatient, assignBed, reserveBed, toggleMCI, isConnected, toasts, dismissToast }}>
      {children}
    </ERContext.Provider>
  );
};

export const useER = () => {
  const context = useContext(ERContext);
  if (!context) throw new Error('useER must be used within an ERProvider');
  return context;
};
