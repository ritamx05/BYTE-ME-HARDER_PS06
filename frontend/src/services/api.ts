import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    this.socket = io('http://localhost:5000');
    return this.socket;
  }

  getSocket() {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Simulated API Layer as requested
  async addPatient(name: string, severity: number, arrivalType: 'Walk-in' | 'Ambulance') {
    return new Promise<void>((resolve) => {
      this.socket?.emit('add_patient', { name, severity, arrivalType });
      // Simulate network latency
      setTimeout(resolve, 300);
    });
  }

  async assignBed() {
    return new Promise<void>((resolve) => {
      this.socket?.emit('assign_bed');
      setTimeout(resolve, 200);
    });
  }

  async reserveBed() {
    return new Promise<void>((resolve) => {
      this.socket?.emit('reserve_bed');
      setTimeout(resolve, 200);
    });
  }

  async toggleMCI(enabled: boolean) {
    return new Promise<void>((resolve) => {
      this.socket?.emit('toggle_mci', enabled);
      setTimeout(resolve, 100);
    });
  }
}

export const socketService = new SocketService();
