import { create } from 'zustand';
import { TvDevice } from '../types';

interface DeviceState {
  devices: TvDevice[];
  selectedDeviceId: string | null;
  selectedDeviceIds: string[];
  addDevice: (device: TvDevice) => void;
  removeDevice: (deviceId: string) => void;
  updateDevice: (deviceId: string, updates: Partial<TvDevice>) => void;
  setSelectedDevice: (deviceId: string | null) => void;
  toggleDeviceSelection: (deviceId: string) => void;
  selectAllConnected: () => void;
  clearDevices: () => void;
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: [],
  selectedDeviceId: null,
  selectedDeviceIds: [],
  addDevice: (device) => set((state) => {
    const isConnected = device.state === 'Connected';
    const alreadySelected = state.selectedDeviceIds.includes(device.deviceId);
    return {
      devices: [...state.devices.filter(d => d.deviceId !== device.deviceId), device],
      // A TV which has just connected must be immediately usable from every
      // tab.  This also covers connection events emitted by the native module.
      selectedDeviceId: state.selectedDeviceId || (isConnected ? device.deviceId : null),
      selectedDeviceIds: isConnected && !alreadySelected
        ? [...state.selectedDeviceIds, device.deviceId]
        : state.selectedDeviceIds,
    };
  }),
  removeDevice: (deviceId) => set((state) => ({ 
    devices: state.devices.filter(d => d.deviceId !== deviceId),
    selectedDeviceId: state.selectedDeviceId === deviceId ? null : state.selectedDeviceId,
    selectedDeviceIds: state.selectedDeviceIds.filter(id => id !== deviceId),
  })),
  updateDevice: (deviceId, updates) => set((state) => {
    const device = state.devices.find(item => item.deviceId === deviceId);
    const nextState = updates.state ?? device?.state;
    const stillSelected = nextState === 'Connected' || !updates.state
      ? state.selectedDeviceIds
      : state.selectedDeviceIds.filter(id => id !== deviceId);
    return {
      devices: state.devices.map(d => d.deviceId === deviceId ? { ...d, ...updates } : d),
      selectedDeviceIds: stillSelected,
      selectedDeviceId: state.selectedDeviceId === deviceId && nextState !== 'Connected'
        ? (stillSelected[0] || null)
        : state.selectedDeviceId,
    };
  }),
  setSelectedDevice: (deviceId) => set((state) => ({
    selectedDeviceId: deviceId,
    selectedDeviceIds: deviceId && state.devices.some(d => d.deviceId === deviceId && d.state === 'Connected')
      ? Array.from(new Set([...state.selectedDeviceIds, deviceId]))
      : state.selectedDeviceIds,
  })),
  toggleDeviceSelection: (deviceId) => set((state) => {
    const device = state.devices.find(item => item.deviceId === deviceId);
    if (!device || device.state !== 'Connected') return state;
    const selectedDeviceIds = state.selectedDeviceIds.includes(deviceId)
      ? state.selectedDeviceIds.filter(id => id !== deviceId)
      : [...state.selectedDeviceIds, deviceId];
    return { selectedDeviceIds, selectedDeviceId: selectedDeviceIds.includes(state.selectedDeviceId || '') ? state.selectedDeviceId : (selectedDeviceIds[0] || null) };
  }),
  selectAllConnected: () => set((state) => ({
    selectedDeviceIds: state.devices.filter(device => device.state === 'Connected').map(device => device.deviceId),
  })),
  clearDevices: () => set({ devices: [], selectedDeviceId: null, selectedDeviceIds: [] }),
}));
