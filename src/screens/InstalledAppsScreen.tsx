import React, { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';
import { TvControlService } from '../services/TvControlService';
import { useDeviceStore } from '../store/deviceStore';

const InstalledAppsScreen: React.FC = () => {
  const { devices } = useDeviceStore();
  const connectedDevices = devices.filter(d => d.state === 'Connected');
  
  const [selectedTvId, setSelectedTvId] = React.useState<string | null>(null);
  const [packages, setPackages] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  // Auto-select first TV if none selected
  useEffect(() => {
    if (!selectedTvId && connectedDevices.length > 0) {
      setSelectedTvId(connectedDevices[0].deviceId);
    }
  }, [connectedDevices, selectedTvId]);

  // Load apps when TV selection changes
  useEffect(() => {
    if (selectedTvId) {
      loadApps(selectedTvId);
    } else {
      setPackages([]);
    }
  }, [selectedTvId]);

  const loadApps = async (deviceId: string) => {
    setBusy(true);
    try {
      const result = await TvControlService.shell(deviceId, 'pm list packages -3');
      const pkgs = (result.stdout || '').split(/\r?\n/).map(x => x.replace(/^package:/, '').trim()).filter(Boolean);
      setPackages(pkgs);
    } catch (error: any) {
      Alert.alert('Apps unavailable', error?.message || 'Failed to load apps for this TV.');
      setPackages([]);
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (pkg: string, actionType: 'launch' | 'stop' | 'enable' | 'uninstall') => {
    if (!selectedTvId) return;
    try {
      setBusy(true);
      let successMsg = '';
      
      switch (actionType) {
        case 'launch':
          await TvControlService.launchPackage(selectedTvId, pkg);
          successMsg = 'App launched successfully on TV.';
          break;
        case 'stop':
          // The user specifically requested to disable the package
          await TvControlService.disablePackage(selectedTvId, pkg);
          successMsg = 'App has been disabled (stopped) on TV.';
          break;
        case 'enable':
          await TvControlService.enablePackage(selectedTvId, pkg);
          successMsg = 'App has been enabled on TV.';
          break;
        case 'uninstall':
          await TvControlService.uninstallPackage(selectedTvId, pkg);
          successMsg = 'App uninstalled from TV.';
          await loadApps(selectedTvId); // Refresh list
          break;
      }
      
      if (actionType !== 'uninstall' && actionType !== 'launch') {
        Alert.alert('Success', successMsg);
      }
    } catch (error: any) {
      Alert.alert('Action failed', error?.message || 'Command failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Installed Apps</Text>
        <Text style={s.hint}>Select a TV below to manage its applications.</Text>
      </View>

      {/* TV Selector List */}
      <View style={s.tvSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tvSelector}>
          {connectedDevices.length === 0 && (
            <Text style={s.noTvText}>No TVs connected</Text>
          )}
          {connectedDevices.map(tv => (
            <TouchableOpacity 
              key={tv.deviceId} 
              style={[s.tvTab, selectedTvId === tv.deviceId && s.tvTabActive]}
              onPress={() => setSelectedTvId(tv.deviceId)}
              disabled={busy}
            >
              <Text style={[s.tvTabText, selectedTvId === tv.deviceId && s.tvTabTextActive]}>
                {tv.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* App List */}
      <ScrollView style={s.listContainer}>
        <View style={s.listHeader}>
          <Text style={s.source}>
            {selectedTvId 
              ? `Apps on ${connectedDevices.find(d => d.deviceId === selectedTvId)?.name || 'Unknown TV'} (${packages.length})` 
              : 'No TV selected'}
          </Text>
          <TouchableOpacity 
            style={[s.refreshBtn, busy && s.disabled]} 
            onPress={() => selectedTvId && loadApps(selectedTvId)}
            disabled={!selectedTvId || busy}
          >
            {busy ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={s.refreshText}>REFRESH</Text>}
          </TouchableOpacity>
        </View>

        {packages.map(pkg => (
          <View style={s.card} key={pkg}>
            <Text style={s.pkg}>{pkg}</Text>
            <View style={s.actions}>
              <TouchableOpacity style={s.button} disabled={busy} onPress={() => handleAction(pkg, 'launch')}>
                <Text style={s.buttonText}>LAUNCH</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.button, s.secondary]} disabled={busy} onPress={() => handleAction(pkg, 'enable')}>
                <Text style={s.buttonText}>ENABLE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.button, s.danger]} disabled={busy} onPress={() => handleAction(pkg, 'stop')}>
                <Text style={s.buttonText}>STOP</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.button, s.danger, {backgroundColor: '#b91c1c'}]} 
                disabled={busy} 
                onPress={() => Alert.alert('Uninstall?', `${pkg} will be permanently removed.`, [
                  {text: 'Cancel', style: 'cancel'},
                  {text: 'Uninstall', style: 'destructive', onPress: () => handleAction(pkg, 'uninstall')}
                ])}
              >
                <Text style={s.buttonText}>REMOVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        
        {packages.length === 0 && !busy && selectedTvId && (
           <Text style={s.noAppsText}>No third-party apps found on this TV.</Text>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  hint: { fontSize: 13, color: Colors.textSecondary, marginTop: 5 },
  tvSelectorContainer: { borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  tvSelector: { padding: 12, gap: 10, alignItems: 'center' },
  tvTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  tvTabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tvTabText: { color: Colors.textSecondary, fontWeight: '600' },
  tvTabTextActive: { color: '#fff' },
  noTvText: { color: Colors.textSecondary, padding: 10 },
  listContainer: { flex: 1 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  source: { color: Colors.textSecondary, fontWeight: 'bold' },
  refreshBtn: { padding: 8 },
  refreshText: { color: Colors.primary, fontWeight: 'bold', fontSize: 12 },
  disabled: { opacity: 0.5 },
  card: { marginHorizontal: 16, marginBottom: 10, backgroundColor: Colors.surface, padding: 14, borderRadius: 10 },
  pkg: { fontSize: 14, color: Colors.text, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 6, marginTop: 12 },
  button: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: Colors.surfaceLight },
  danger: { backgroundColor: Colors.error },
  buttonText: { fontSize: 11, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  noAppsText: { color: Colors.textSecondary, textAlign: 'center', marginTop: 40 }
});

export default InstalledAppsScreen;
