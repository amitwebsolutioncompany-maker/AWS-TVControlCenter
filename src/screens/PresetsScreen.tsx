import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/colors';
import { TvControlService } from '../services/TvControlService';
import { usePresetStore } from '../store/presetStore';
import { getSelectedConnectedDevices } from '../utils/selectedDevice';

const PresetsScreen: React.FC = () => {
  const { presets } = usePresetStore();
  const [runningId, setRunningId] = React.useState<string | null>(null);

  const run = async (preset: typeof presets[number]) => {
    try {
      const devices = getSelectedConnectedDevices();
      setRunningId(preset.id);
      let skipped = 0;

      for (const device of devices) {
        for (const step of preset.steps) {
          try {
            const p = String(step.params.packageName || '');
            if (step.type === 'DISABLE_PACKAGE') {
              await TvControlService.shell(device.deviceId, `pm disable-user --user 0 ${p}`);
            }
            if (step.type === 'ENABLE_PACKAGE') {
              await TvControlService.shell(device.deviceId, `pm enable --user 0 ${p}`);
            }
            if (step.type === 'SHELL_COMMAND') {
              await TvControlService.shell(device.deviceId, String(step.params.command || ''));
            }
          } catch {
            skipped++;
          }
        }
      }

      Alert.alert(
        skipped ? 'Cleanup complete with skipped items' : 'Cleanup complete',
        `${preset.name} applied to ${devices.length} selected TV(s).${skipped ? ` ${skipped} unsupported/failed item(s) skipped.` : ''}`
      );
    } catch (e: any) {
      Alert.alert('Preset failed', e?.message || 'Select connected TVs first.');
    } finally {
      setRunningId(null);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <Text style={s.title}>Cleanup Presets</Text>
        <Text style={s.hint}>Select TVs on the TVs page. Each command is applied to every selected TV.</Text>
      </View>

      {presets.map(preset => (
        <View key={preset.id} style={s.card}>
          <Text style={s.name}>{preset.name}</Text>
          <Text style={s.meta}>{preset.steps.filter(x => x.type === 'DISABLE_PACKAGE').length} app disables · {preset.steps.filter(x => x.type === 'SHELL_COMMAND').length} settings</Text>
          <Text style={s.note}>Changes updates, notifications, screen timeout and selected system apps. Unsupported packages are safely skipped.</Text>
          <TouchableOpacity
            style={[s.run, runningId && s.disabled]}
            disabled={!!runningId}
            onPress={() => Alert.alert('Run cleanup?', `Apply this cleanup to all selected TVs? This disables system apps and changes device settings.`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Run cleanup', style: 'destructive', onPress: () => run(preset) }
            ])}
          >
            <Text style={s.runText}>{runningId === preset.id ? 'RUNNING...' : 'RUN ON SELECTED TVs'}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 36 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  hint: { fontSize: 13, color: Colors.textSecondary, marginTop: 5 },
  card: { margin: 16, backgroundColor: Colors.surface, padding: 16, borderRadius: 12 },
  name: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  meta: { fontSize: 14, color: Colors.primary, marginTop: 5 },
  note: { fontSize: 13, color: Colors.textSecondary, marginTop: 12, lineHeight: 19 },
  run: { backgroundColor: Colors.warning, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  runText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  disabled: { opacity: 0.55 }
});

export default PresetsScreen;
