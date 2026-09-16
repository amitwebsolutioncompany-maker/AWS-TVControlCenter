import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDeviceStore } from '../store/deviceStore';
import { Colors } from '../constants/colors';
import { TvControlService } from '../services/TvControlService';

const DashboardScreen: React.FC = () => {
  const { devices, addDevice, updateDevice } = useDeviceStore();
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  
  const connectedCount = devices.filter(d => d.state === 'Connected').length;
  const onlineCount = connectedCount;
  const offlineCount = devices.filter(d => d.state !== 'Connected').length;
  const refreshTvStatus = async () => {
    setRefreshing(true);
    try {
      const connected = await TvControlService.getConnectedDevices();
      connected.forEach((device: any) => addDevice({ ...device, state: 'Connected' }));
      // Do not mark a TV offline from a single snapshot: a wireless ADB socket
      // can be busy during an upload while the TV itself remains online.
      Alert.alert('Controller refreshed', `${connected.length} TV connection(s) refreshed.`);
    } catch (error: any) {
      Alert.alert('Refresh failed', error?.message || 'Unable to refresh TV status.');
    } finally { setRefreshing(false); }
  };
  const scanTvs = async () => {
    setScanning(true);
    try {
      const endpoints = await TvControlService.scanWifiDevices();
      if (!endpoints.length) {
        Alert.alert('No ADB TVs found', 'Enable Wireless debugging / ADB TCP on the TV, then use the TVs page to connect manually.');
        return;
      }
      const results = await Promise.allSettled(endpoints.map((endpoint: any) =>
        TvControlService.connectWifiDevice(endpoint.ipAddress, endpoint.port),
      ));
      const connected = results.filter(result => result.status === 'fulfilled').map(result => (result as PromiseFulfilledResult<any>).value);
      connected.forEach(device => addDevice(device));
      Alert.alert('TV scan complete', `${connected.length}/${endpoints.length} discovered TV(s) connected. TVs are now globally selected.`);
      navigation.navigate('TVs');
    } catch (error: any) {
      Alert.alert('Scan failed', error?.message || 'Connect the controller and TVs to the same Wi-Fi network.');
    } finally { setScanning(false); }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AWS-TVControlCenter</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Connected TVs</Text>
          <Text style={styles.statValue}>{connectedCount}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Online</Text>
          <Text style={[styles.statValue, { color: Colors.success }]}>{onlineCount}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Offline</Text>
          <Text style={[styles.statValue, { color: Colors.error }]}>{offlineCount}</Text>
        </View>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Last Deployment</Text>
        <Text style={[styles.statusValue, { color: Colors.success }]}>SUCCESS</Text>
      </View>

      <TouchableOpacity style={[styles.button, scanning && styles.buttonDisabled]} onPress={scanTvs} disabled={scanning}>
        {scanning ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>SCAN / CONNECT TVs</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.buttonPrimary]} onPress={() => navigation.navigate('Deploy')}>
        <Text style={styles.buttonText}>DEPLOY APK</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.cleanupButton]} onPress={() => navigation.navigate('Presets')}>
        <Text style={styles.buttonText}>CLEANUP SELECTED TVs</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, refreshing && styles.buttonDisabled]} onPress={refreshTvStatus} disabled={refreshing}>
        {refreshing ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>REFRESH CONTROLLER</Text>}
      </TouchableOpacity>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statusCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  button: {
    margin: 16,
    marginTop: 0,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
    borderWidth: 0,
  },
  cleanupButton: { backgroundColor: Colors.warning, borderWidth: 0 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default DashboardScreen;
