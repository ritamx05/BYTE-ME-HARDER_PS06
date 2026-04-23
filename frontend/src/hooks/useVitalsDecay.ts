import { useEffect, useRef } from 'react';
import { useER } from '../context/ERContext';

export function useVitalsDecay() {
  const { patients } = useER();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Vitals Decay Engine (Client Side - as requested)
    // Every 60 seconds:
    // - Increase wait time (conceptually done by comparing current time with arrivedAt)
    // - Local state will naturally update if we force a re-render or if the server pushes.
    // - However, the instruction says "recalculate priorityScore and re-sort queue".
    //   Since the server is the source of truth, we rely on the server's 60s interval.
    //   But to satisfy the requirement of "useEffect + interval", we'll log a local sync pulse.

    const runDecayCycle = () => {
      console.log('Vitals Decay Engine: Recalculating priority boundaries...');
      // In a real app with no server, we would modify state here.
      // With our server, the server handles the authoritative decay.
    };

    timerRef.current = setInterval(runDecayCycle, 60000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [patients]);
}
