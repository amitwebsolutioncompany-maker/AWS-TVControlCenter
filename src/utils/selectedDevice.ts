import { useDeviceStore } from '../store/deviceStore';

export function getSelectedConnectedDevice() {
  return getSelectedConnectedDevices()[0];
}

/** Returns the shared TV selection, falling back to the primary TV for older flows. */
export function getSelectedConnectedDevices() {
  const state = useDeviceStore.getState();
  const selectedIds = state.selectedDeviceIds.length ? state.selectedDeviceIds : (state.selectedDeviceId ? [state.selectedDeviceId] : []);
  const devices = state.devices.filter(item => selectedIds.includes(item.deviceId) && item.state === 'Connected');
  if (!devices.length) throw new Error('Select at least one connected TV from the TVs page.');
  return devices;
}

export function normalizePickedPath(uri: string | null | undefined): string {
  if (!uri) throw new Error('The selected file is unavailable.');
  return uri.startsWith('file://') ? decodeURIComponent(uri.substring(7)) : uri;
}
