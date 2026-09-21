import { DeviceEventEmitter, EmitterSubscription } from 'react-native';

export interface DiscoveredSignageTV {
  deviceId: string;
  name: string;
  host: string;
  port: number;
  ipAddress: string;
  pairingCode?: string;
}

export interface SignageConnectionState {
  connected: boolean;
  authenticated: boolean;
}

class SignageService {
  private subscriptions: Map<string, EmitterSubscription> = new Map();
  private discoveryInterval: NodeJS.Timeout | null = null;
  private currentTV: DiscoveredSignageTV | null = null;
  private sessionToken: string | null = null;
  private videoStreamPort: number = 8082;
  private controlSocket: WebSocket | null = null;
  private isControlSocketReady: boolean = false;
  private pendingCommands: string[] = [];

  // Scan local network for AWS Signage TVs
  async startDiscovery(): Promise<void> {
    // Scan common IP ranges for port 8080
    const subnets = ['192.168.1', '192.168.0', '192.168.2', '10.0.0', '172.16.0'];
    const discoveredTVs: DiscoveredSignageTV[] = [];

    // Scan multiple common subnets
    for (const subnet of subnets) {
      // Scan the subnet (last octet 1-254)
      for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 300);
          const response = await fetch(`http://${ip}:8080/api/tv/discovery`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              const tv: DiscoveredSignageTV = {
                deviceId: data.deviceId,
                name: data.deviceName,
                host: ip,
                port: data.port || 8080,
                ipAddress: ip,
                pairingCode: data.pairingCode,
              };
              discoveredTVs.push(tv);
              this.emit('serviceDiscovered', tv);
            }
          }
        } catch {
          // Device not responding or not a Signage TV
        }
      }
    }

    if (discoveredTVs.length === 0) {
      this.emit('discoveryFailed', 'No AWS Signage TVs found on network');
    }
    // Discovery now only runs once per button click
  }

  stopDiscovery(): Promise<void> {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    return Promise.resolve();
  }

  async connectTV(ipAddress: string, port: number): Promise<void> {
    try {
      const response = await fetch(`http://${ipAddress}:${port}/api/tv/discovery`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to connect to TV');
      }

      const data = await response.json();
      if (data.success) {
        this.currentTV = {
          deviceId: data.deviceId,
          name: data.deviceName,
          host: ipAddress,
          port: port,
          ipAddress: ipAddress,
        };
        this.emit('connected', this.currentTV);
      } else {
        throw new Error('Invalid response from TV');
      }
    } catch (error: any) {
      this.emit('error', error.message || 'Connection failed');
      throw error;
    }
  }

  async requestPairingCode(): Promise<string> {
    if (!this.currentTV) {
      throw new Error('Not connected to any TV');
    }

    try {
      const response = await fetch(`http://${this.currentTV.ipAddress}:${this.currentTV.port}/api/tv/request-pairing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: this.currentTV.deviceId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        this.currentTV.pairingCode = data.pairingCode;
        this.emit('pairingCodeGenerated', data.pairingCode);
        return data.pairingCode;
      } else {
        throw new Error(data.error || 'Failed to request pairing code');
      }
    } catch (error: any) {
      this.emit('error', error.message || 'Pairing code request failed');
      throw error;
    }
  }

  async disconnectTV(): Promise<void> {
    this.currentTV = null;
    this.sessionToken = null;
    if (this.controlSocket) {
      this.controlSocket.close();
      this.controlSocket = null;
    }
    this.isControlSocketReady = false;
    this.emit('disconnected', null);
  }

  async authenticate(pairingCode: string): Promise<void> {
    if (!this.currentTV) {
      throw new Error('Not connected to any TV');
    }

    try {
      const response = await fetch(`http://${this.currentTV.ipAddress}:${this.currentTV.port}/api/tv/verify-pairing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: this.currentTV.deviceId,
          pairingCode: pairingCode,
        }),
      });

      const data = await response.json();
      if (data.success) {
        this.sessionToken = data.sessionToken;
        this.videoStreamPort = data.videoStreamPort || 8082;
        this.emit('authResult', true);
        this.initControlSocket();
      } else {
        this.emit('authResult', false);
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (error: any) {
      this.emit('authResult', false);
      this.emit('error', error.message || 'Authentication failed');
      throw error;
    }
  }

  async sendTap(x: number, y: number): Promise<void> {
    if (!this.sessionToken || !this.currentTV) {
      throw new Error('Not authenticated');
    }

    await this.sendControlCommand('tap', { x, y });
  }

  async sendLongPress(x: number, y: number): Promise<void> {
    if (!this.sessionToken || !this.currentTV) {
      throw new Error('Not authenticated');
    }

    await this.sendControlCommand('long_press', { x, y });
  }

  async sendSwipe(startX: number, startY: number, endX: number, endY: number, duration: number): Promise<void> {
    if (!this.sessionToken || !this.currentTV) {
      throw new Error('Not authenticated');
    }

    await this.sendControlCommand('swipe', { startX, startY, endX, endY, duration });
  }

  async sendText(text: string): Promise<void> {
    if (!this.sessionToken || !this.currentTV) {
      throw new Error('Not authenticated');
    }

    await this.sendControlCommand('text', { text });
  }

  async sendGlobalAction(action: number): Promise<void> {
    if (!this.sessionToken || !this.currentTV) {
      throw new Error('Not authenticated');
    }

    await this.sendControlCommand('global_action', { action });
  }

  async sendActionString(actionString: string): Promise<void> {
    if (!this.sessionToken || !this.currentTV) {
      throw new Error('Not authenticated');
    }

    await this.sendControlCommand(actionString, {});
  }

  private initControlSocket() {
    if (!this.currentTV) return;
    const wsUrl = `ws://${this.currentTV.ipAddress}:8082`;
    this.controlSocket = new WebSocket(wsUrl);
    
    this.controlSocket.onopen = () => {
      this.isControlSocketReady = true;
      while (this.pendingCommands.length > 0) {
        const cmd = this.pendingCommands.shift();
        if (cmd) this.controlSocket?.send(cmd);
      }
    };
    
    this.controlSocket.onclose = () => {
      this.isControlSocketReady = false;
      // Reconnect if we still have a session
      if (this.sessionToken) {
        setTimeout(() => this.initControlSocket(), 1000);
      }
    };
    
    this.controlSocket.onerror = (error) => {
      console.warn("Control socket error:", error);
    };
  }

  private async sendControlCommand(action: string, params: any): Promise<void> {
    try {
      const message = JSON.stringify({ type: action, ...params });
      
      if (this.isControlSocketReady && this.controlSocket) {
        this.controlSocket.send(message);
      } else {
        this.pendingCommands.push(message);
        if (!this.controlSocket) {
          this.initControlSocket();
        }
      }
      return Promise.resolve();
    } catch (error: any) {
      this.emit('error', error.message || 'Command failed');
      throw error;
    }
  }

  private async getLocalIP(): Promise<string | null> {
    try {
      // Try multiple common subnets for discovery
      // In production, use a proper network interface detection library
      const commonSubnets = ['192.168.1', '192.168.0', '192.168.2', '10.0.0', '172.16.0'];
      
      // Return first subnet to try (will scan all in startDiscovery)
      return commonSubnets[0];
    } catch {
      // Fallback to common subnet
      return '192.168.1';
    }
  }

  // Event listeners
  onServiceDiscovered(callback: (tv: DiscoveredSignageTV) => void) {
    this.addListener('serviceDiscovered', callback);
  }

  onServiceLost(callback: (name: string) => void) {
    this.addListener('serviceLost', callback);
  }

  onDiscoveryFailed(callback: (error: string) => void) {
    this.addListener('discoveryFailed', callback);
  }

  onConnected(callback: (tv: DiscoveredSignageTV) => void) {
    this.addListener('connected', callback);
  }

  onDisconnected(callback: () => void) {
    this.addListener('disconnected', callback);
  }

  onError(callback: (error: string) => void) {
    this.addListener('error', callback);
  }

  onVideoFrame(callback: (frame: string) => void) {
    this.addListener('videoFrame', callback);
  }

  onAuthResult(callback: (success: boolean) => void) {
    this.addListener('authResult', callback);
  }

  onPairingCodeGenerated(callback: (code: string) => void) {
    this.addListener('pairingCodeGenerated', callback);
  }

  getVideoStreamUrl(): string | null {
    if (!this.currentTV || !this.videoStreamPort) {
      return null;
    }
    return `ws://${this.currentTV.ipAddress}:${this.videoStreamPort}`;
  }

  removeAllListeners() {
    this.subscriptions.forEach((subscription) => {
      subscription.remove();
    });
    this.subscriptions.clear();
  }

  private addListener(event: string, callback: (data: any) => void) {
    if (this.subscriptions.has(event)) {
      this.subscriptions.get(event)!.remove();
    }
    const subscription = DeviceEventEmitter.addListener(event, callback);
    this.subscriptions.set(event, subscription);
  }

  private emit(event: string, data: any) {
    DeviceEventEmitter.emit(event, data);
  }
}

export default new SignageService();
