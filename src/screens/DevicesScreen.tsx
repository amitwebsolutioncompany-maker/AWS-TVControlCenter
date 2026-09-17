import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDeviceStore } from '../store/deviceStore';
import { Colors } from '../constants/colors';
import { TvControlService } from '../services/TvControlService';

const DevicesScreen: React.FC = () => {
  const { devices, addDevice, setSelectedDevice, selectedDeviceIds, toggleDeviceSelection, updateDevice, removeDevice, setDevices } = useDeviceStore();
  const navigation = useNavigation<any>();
  const [ipAddress, setIpAddress] = React.useState('');
  const [port, setPort] = React.useState('5555');
  const [connecting, setConnecting] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  
  // Google TV Pairing State
  const [showPairing, setShowPairing] = React.useState(false);
  const [pairIp, setPairIp] = React.useState('');
  const [pairPort, setPairPort] = React.useState('');
  const [pairCode, setPairCode] = React.useState('');
  const [pairing, setPairing] = React.useState(false);

  const connect = React.useCallback(async (ip = ipAddress, requestedPort = Number(port)) => {
    // Allow either separate fields or a pasted IP:port endpoint. The port
    // input itself intentionally remains numeric for Android TV remotes.
    const typed = ip.trim();
    const separator = typed.lastIndexOf(':');
    const host = separator > 0 ? typed.substring(0, separator) : typed;
    const inlinePort = separator > 0 ? Number(typed.substring(separator + 1)) : requestedPort;
    const adbPort = Number.isInteger(inlinePort) && inlinePort > 0 && inlinePort < 65536 ? inlinePort : 5555;
    if (!host) {
      Alert.alert('TV IP required', 'Enter the TV IP address, then try again.');
      return;
    }
    setConnecting(true);
    try {
      const device = await TvControlService.connectWifiDevice(host, adbPort);
      addDevice(device);
      setSelectedDevice(device.deviceId);
      // Some Google TVs answer the initial connection probe before all system
      // properties are ready. Refresh info separately so Android version is not
      // unnecessarily displayed as Unknown.
      try {
        const info = await TvControlService.getDeviceInfo(device.deviceId);
        updateDevice(device.deviceId, { deviceInfo: { serial:info['ro.serialno']||'', manufacturer:info['ro.product.manufacturer']||'', model:info['ro.product.model']||'', androidVersion:info['ro.build.version.release']||'', sdkVersion:Number(info['ro.build.version.sdk'])||0, screenResolution:info.screen_size||'', density:info.density||'', storage:info.storage||'' } });
      } catch { /* Connection is valid; info can be refreshed later from Control. */ }
    } catch (error: any) {
      const existing = devices.find(device => device.deviceId === `wifi_${host}_${adbPort}`);
      if (existing) updateDevice(existing.deviceId, { state: 'Error' });
      Alert.alert('Connection failed', error?.message || 'Enable ADB TCP/Wireless Debugging on the TV and accept its authorization prompt.');
    } finally {
      setConnecting(false);
    }
  }, [addDevice, devices, ipAddress, port, setSelectedDevice, updateDevice]);

  const scanNetwork = React.useCallback(async (silent = false) => {
    if (scanning) return;
    setScanning(true);
    try {
      const endpoints = await TvControlService.scanWifiDevices();
      if (!endpoints.length) {
        if (!silent) Alert.alert('No ADB TVs found', 'Only TVs with ADB TCP enabled on port 5555 can be discovered.');
        return;
      }
      await Promise.all(endpoints.map((endpoint: { ipAddress: string; port: number }) => connect(endpoint.ipAddress, endpoint.port)));
    } catch (error: any) {
      if (!silent) Alert.alert('Scan failed', error?.message || 'Connect the phone to Wi-Fi and try again.');
    } finally {
      setScanning(false);
    }
  }, [connect, scanning]);

  const pairGoogleTv = async () => {
    if (!pairIp || !pairPort || !pairCode) {
      Alert.alert('Missing Info', 'Enter IP, Pairing Port, and 6-digit Code from the TV\'s Wireless Debugging screen.');
      return;
    }
    setPairing(true);
    try {
      await TvControlService.pairWifiDevice(pairIp.trim(), Number(pairPort), pairCode.trim());
      Alert.alert('Success', 'Paired successfully! Now you can connect to the TV using the main connection port.');
      setShowPairing(false);
    } catch (error: any) {
      Alert.alert('Pairing Failed', error?.message || 'Check the code and port and try again.');
    } finally {
      setPairing(false);
    }
  };

  React.useEffect(() => {
    TvControlService.getConnectedDevices().then(setDevices).catch(console.error);
    
    // Auto-scan silently on mount
    scanNetwork(true);
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TV Devices</Text>
      </View>

      <View style={styles.connectCard}>
        <Text style={styles.label}>TV IP ADDRESS (e.g. 192.168.1.20)</Text>
        <TextInput
          style={styles.input}
          value={ipAddress}
          onChangeText={setIpAddress}
          placeholder="192.168.1.20"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="default"
          autoCapitalize="none"
        />

        <TouchableOpacity style={[styles.button, connecting && styles.buttonDisabled]} onPress={() => connect()} disabled={connecting || scanning || pairing}>
          {connecting ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>CONNECT</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.buttonSecondary, scanning && styles.buttonDisabled]} onPress={() => scanNetwork()} disabled={connecting || scanning || pairing}>
          {scanning ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>SCAN NETWORK</Text>}
        </TouchableOpacity>
        
        <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setShowPairing(!showPairing)}>
          <Text style={{ color: Colors.primary, fontWeight: '600' }}>
            {showPairing ? 'Hide Google TV Pairing' : 'Pair Google TV (Android 11+)'}
          </Text>
        </TouchableOpacity>

        {showPairing && (
          <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 16 }}>
            <Text style={styles.label}>PAIRING IP & PORT</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[styles.input, { flex: 2 }]} value={pairIp} onChangeText={setPairIp} placeholder="192.168.1.20" placeholderTextColor={Colors.textSecondary} />
              <TextInput style={[styles.input, { flex: 1 }]} value={pairPort} onChangeText={setPairPort} placeholder="Port" placeholderTextColor={Colors.textSecondary} keyboardType="number-pad" />
            </View>
            <Text style={styles.label}>6-DIGIT PAIRING CODE</Text>
            <TextInput style={styles.input} value={pairCode} onChangeText={setPairCode} placeholder="123456" placeholderTextColor={Colors.textSecondary} keyboardType="number-pad" />
            <TouchableOpacity style={[styles.button, pairing && styles.buttonDisabled, { backgroundColor: Colors.success }]} onPress={pairGoogleTv} disabled={pairing}>
              {pairing ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>PAIR DEVICE</Text>}
            </TouchableOpacity>
          </View>
        )}

      </View>

      <View style={styles.devicesList}>
        {devices.map((device) => (
          <View key={device.deviceId} style={styles.deviceCard}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceInfo}>{device.ipAddress}:{device.port}</Text>
            <Text style={styles.deviceInfo}>Android {device.deviceInfo?.androidVersion || 'Unknown'}</Text>
            <Text style={styles.deviceInfo}>{device.connectionType} ADB</Text>
            
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot,
                { backgroundColor: device.state === 'Connected' ? Colors.success : Colors.error }
              ]} />
              <Text style={styles.statusText}>{device.state.toUpperCase()}</Text>
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.selectButton} onPress={() => toggleDeviceSelection(device.deviceId)}>
                <Text style={styles.controlButtonText}>{selectedDeviceIds.includes(device.deviceId) ? 'SELECTED' : 'SELECT'}</Text>
              </TouchableOpacity>
              {device.state !== 'Connected' && (
                <TouchableOpacity style={[styles.controlButton, { backgroundColor: Colors.success }]} onPress={() => connect(device.ipAddress, device.port)} disabled={connecting}>
                  <Text style={styles.controlButtonText}>CONNECT</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.controlButton} onPress={() => { setSelectedDevice(device.deviceId); navigation.navigate('DeviceDetails', { deviceId: device.deviceId }); }}>
                <Text style={styles.controlButtonText}>CONTROL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.disconnectButton} onPress={() => Alert.alert('Disconnect TV?', `${device.name} will be removed from this controller.`, [{text:'Cancel',style:'cancel'},{text:'Disconnect',style:'destructive',onPress:async()=>{try{await TvControlService.disconnectDevice(device.deviceId);}finally{removeDevice(device.deviceId);}}}])}>
                <Text style={styles.controlButtonText}>REMOVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  connectCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.background,
    color: Colors.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: Colors.surfaceLight,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  devicesList: {
    padding: 16,
    gap: 12,
  },
  deviceCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  deviceInfo: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  controlButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disconnectButton: { flex: 1, backgroundColor: Colors.error, padding: 12, borderRadius: 8, alignItems: 'center' },
  selectButton: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardActions: { flexDirection: 'row', gap: 8 },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default DevicesScreen;
