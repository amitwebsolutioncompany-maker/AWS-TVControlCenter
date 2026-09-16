import { create } from 'zustand';
import { LogEntry } from '../types';

interface LogState {
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  getLogsByDevice: (deviceId: string) => LogEntry[];
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  addLog: (log) => set((state) => ({
    logs: [...state.logs, {
      ...log,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString()
    }]
  })),
  clearLogs: () => set({ logs: [] }),
  getLogsByDevice: (deviceId) => get().logs.filter(l => l.deviceId === deviceId),
}));
