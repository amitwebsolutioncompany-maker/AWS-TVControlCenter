import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  defaultAdbPort: number;
  scanConcurrency: number;
  deploymentConcurrency: number;
  autoReconnect: boolean;
  updateSettings: (updates: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      defaultAdbPort: 5555,
      scanConcurrency: 10,
      deploymentConcurrency: 3,
      autoReconnect: true,
      updateSettings: (updates) => set(updates),
    }),
    {
      name: 'tv-control-settings',
    }
  )
);
