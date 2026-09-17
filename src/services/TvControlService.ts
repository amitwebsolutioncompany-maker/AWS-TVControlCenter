import { NativeModules, NativeEventEmitter } from 'react-native';

const { TvControlModule } = NativeModules;

if (!TvControlModule) {
  console.error('TvControlModule not found');
}

const eventEmitter = new NativeEventEmitter(TvControlModule);

export interface TvControlService {
  scanWifiDevices: () => Promise<any[]>;
  getSavedWifiDevices: () => Promise<Array<{ipAddress: string; port: number}>>;
  connectWifiDevice: (ip: string, port: number) => Promise<any>;
  pairWifiDevice: (ip: string, port: number, pairingCode: string) => Promise<void>;
  disconnectDevice: (deviceId: string) => Promise<void>;
  scanUsbDevices: () => Promise<any[]>;
  requestUsbPermission: (deviceId: string) => Promise<boolean>;
  connectUsbDevice: (deviceId: string) => Promise<any>;
  shell: (deviceId: string, command: string) => Promise<CommandResult>;
  installApk: (deviceId: string, localPath: string) => Promise<void>;
  pushFile: (deviceId: string, localPath: string, remotePath: string) => Promise<void>;
  pullFile: (deviceId: string, remotePath: string, localPath: string) => Promise<void>;
  listFiles: (deviceId: string, remotePath: string) => Promise<any[]>;
  deleteFile: (deviceId: string, remotePath: string) => Promise<void>;
  getDeviceInfo: (deviceId: string) => Promise<Record<string, string>>;
  disablePackage: (deviceId: string, packageName: string) => Promise<CommandResult>;
  enablePackage: (deviceId: string, packageName: string) => Promise<CommandResult>;
  uninstallPackage: (deviceId: string, packageName: string) => Promise<CommandResult>;
  forceStopPackage: (deviceId: string, packageName: string) => Promise<CommandResult>;
  launchPackage: (deviceId: string, packageName: string) => Promise<CommandResult>;
  sendKeyEvent: (deviceId: string, keyCode: number) => Promise<void>;
  rebootDevice: (deviceId: string) => Promise<void>;
  screenOn: (deviceId: string) => Promise<void>;
  screenOff: (deviceId: string) => Promise<void>;
  getConnectedDevices: () => Promise<any[]>;
  startMirrorActivity: (deviceId: string) => Promise<void>;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
}

export const TvControlService: TvControlService = TvControlModule as any;

export const subscribeToDeviceConnected = (callback: (device: any) => void) => {
  return eventEmitter.addListener('deviceConnected', callback);
};

export const subscribeToDeviceDisconnected = (callback: (deviceId: string) => void) => {
  return eventEmitter.addListener('deviceDisconnected', callback);
};
