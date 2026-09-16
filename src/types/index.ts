export interface TvDevice {
  deviceId: string;
  name: string;
  ipAddress: string;
  port: number;
  connectionType: 'WIFI' | 'USB';
  state: 'Disconnected' | 'Connecting' | 'Connected' | 'Authenticating' | 'Error' | 'Unauthorized';
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  serial: string;
  manufacturer: string;
  model: string;
  androidVersion: string;
  sdkVersion: number;
  screenResolution: string;
  density: string;
  storage: string;
  currentApp?: string;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
}

export interface DeploymentJob {
  id: string;
  deviceId: string;
  apkPath: string;
  status: 'pending' | 'connecting' | 'installing' | 'configuring' | 'launching' | 'success' | 'failed';
  progress: number;
  error?: string;
  steps: DeploymentStep[];
}

export interface DeploymentStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  output?: string;
}

export interface FileEntry {
  name: string;
  permissions: string;
  size: string;
  isDirectory: boolean;
}

export interface DeploymentPreset {
  id: string;
  name: string;
  steps: PresetStep[];
}

export interface PresetStep {
  type: 'INSTALL_APK' | 'DISABLE_PACKAGE' | 'ENABLE_PACKAGE' | 'UNINSTALL_PACKAGE' | 'FORCE_STOP' | 'LAUNCH_PACKAGE' | 'PUSH_FILE' | 'REBOOT' | 'SEND_KEY' | 'SHELL_COMMAND';
  params: Record<string, any>;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  deviceId: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
