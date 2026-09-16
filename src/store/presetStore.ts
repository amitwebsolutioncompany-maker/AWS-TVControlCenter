import { create } from 'zustand';
import { DeploymentPreset } from '../types';

interface PresetState {
  presets: DeploymentPreset[];
  addPreset: (preset: DeploymentPreset) => void;
  updatePreset: (presetId: string, updates: Partial<DeploymentPreset>) => void;
  removePreset: (presetId: string) => void;
  getPreset: (presetId: string) => DeploymentPreset | undefined;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  presets: [
    {
      id: 'cloudwalker-signage',
      name: 'CloudWalker Cleanup & Optimization',
      steps: [
        { type: 'DISABLE_PACKAGE', params: { packageName: 'tv.cloudwalker.updater' } },
        { type: 'DISABLE_PACKAGE', params: { packageName: 'com.cvte.tv.systemupgrade' } },
        { type: 'DISABLE_PACKAGE', params: { packageName: 'tv.cloudwalker.inputserver' } },
        { type: 'DISABLE_PACKAGE', params: { packageName: 'tv.cloudwalker.market' } },
        {
          type: 'DISABLE_PACKAGE',
          params: { packageName: 'tv.cloudwalker.profile' }
        },
        {
          type: 'DISABLE_PACKAGE',
          params: { packageName: 'tv.cloudwalker.channels' }
        },
        { type: 'DISABLE_PACKAGE', params: { packageName: 'tv.cloudwalker.voice' } },
        { type: 'DISABLE_PACKAGE', params: { packageName: 'tv.cloudwalker.player' } },
        { type: 'DISABLE_PACKAGE', params: { packageName: 'tv.cloudwalker.guide' } },
        { type: 'DISABLE_PACKAGE', params: { packageName: 'com.stark.store' } },
        { type: 'DISABLE_PACKAGE', params: { packageName: 'com.seraphic.openinet.cvte' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put global ota_disable_automatic_update 1' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put global auto_update_apps 0' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put global auto_update_system 0' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put global heads_up_notifications_enabled 0' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put secure show_notification_snooze 0' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put global heads_up_off 1' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put system screen_off_timeout 2147483647' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put secure screensaver_enabled 0' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put secure screensaver_activate_on_sleep 0' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put secure screensaver_activate_on_dock 0' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put global stay_on_while_plugged_in 3' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put global low_power 0' } },
        { type: 'SHELL_COMMAND', params: { command: 'svc power stayon true' } },
        { type: 'SHELL_COMMAND', params: { command: 'settings put secure sleep_timeout -1' } }
      ]
    }
  ],
  addPreset: (preset) => set((state) => ({ presets: [...state.presets, preset] })),
  updatePreset: (presetId, updates) => set((state) => ({
    presets: state.presets.map(p => p.id === presetId ? { ...p, ...updates } : p)
  })),
  removePreset: (presetId) => set((state) => ({ presets: state.presets.filter(p => p.id !== presetId) })),
  getPreset: (presetId) => get().presets.find(p => p.id === presetId),
}));
