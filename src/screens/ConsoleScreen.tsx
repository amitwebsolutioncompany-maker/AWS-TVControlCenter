import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { TvControlService } from '../services/TvControlService';
import { getSelectedConnectedDevices } from '../utils/selectedDevice';

const ConsoleScreen: React.FC = () => {
  const [command, setCommand] = React.useState('');
  const [output, setOutput] = React.useState<string[]>([]);

  const executeCommand = async () => {
    const input = command.trim();
    if (!input) return;
    setOutput(current => [...current, `$ ${input}`, 'Executing...']);
    setCommand('');
    try {
      const devices = getSelectedConnectedDevices();
      for (const device of devices) {
        setOutput(current => [...current, `[${device.name} (${device.ipAddress}:${device.port})]`]);
        const result = await TvControlService.shell(device.deviceId, input);
        setOutput(current => [...current, result.stdout || result.stderr || `Exit code: ${result.exitCode}`]);
      }
    } catch (error: any) {
      setOutput(current => [...current, `Error: ${error?.message || 'Command failed'}`]);
    }
  };

  const useCommand = (value: string) => {
    setCommand(value);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ADB Console</Text>
      </View>

      <ScrollView style={styles.outputContainer}>
        {output.map((line, index) => (
          <Text key={index} style={styles.outputLine}>{line}</Text>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={command}
          onChangeText={setCommand}
          placeholder="Enter shell command..."
          placeholderTextColor={Colors.textSecondary}
          onSubmitEditing={executeCommand}
        />
        <TouchableOpacity style={styles.sendButton} onPress={executeCommand}>
          <Text style={styles.sendButtonText}>SEND</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal style={styles.presetsContainer}>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('getprop')}>
          <Text style={styles.presetButtonText}>getprop</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm list packages')}>
          <Text style={styles.presetButtonText}>pm list packages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('df -h')}>
          <Text style={styles.presetButtonText}>df -h</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('wm size')}>
          <Text style={styles.presetButtonText}>wm size</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 tv.cloudwalker.profile')}>
          <Text style={styles.presetButtonText}>Disable Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 tv.cloudwalker.channels')}>
          <Text style={styles.presetButtonText}>Disable Channels</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 tv.cloudwalker.updater')}>
          <Text style={styles.presetButtonText}>Disable Updater</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 tv.cloudwalker.market')}>
          <Text style={styles.presetButtonText}>Disable Market</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 tv.cloudwalker.voice')}>
          <Text style={styles.presetButtonText}>Disable Voice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 tv.cloudwalker.player')}>
          <Text style={styles.presetButtonText}>Disable Player</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 tv.cloudwalker.guide')}>
          <Text style={styles.presetButtonText}>Disable Guide</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 com.cvte.tv.systemupgrade')}>
          <Text style={styles.presetButtonText}>Disable SysUpgrade</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 tv.cloudwalker.inputserver')}>
          <Text style={styles.presetButtonText}>Disable InputServer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 com.stark.store')}>
          <Text style={styles.presetButtonText}>Disable StarkStore</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('pm disable-user --user 0 com.seraphic.openinet.cvte')}>
          <Text style={styles.presetButtonText}>Disable Openinet</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put global ota_disable_automatic_update 1')}>
          <Text style={styles.presetButtonText}>Disable OTA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put global auto_update_apps 0')}>
          <Text style={styles.presetButtonText}>Disable App Update</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put global auto_update_system 0')}>
          <Text style={styles.presetButtonText}>Disable Sys Update</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put global heads_up_notifications_enabled 0')}>
          <Text style={styles.presetButtonText}>Disable Notifs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put secure show_notification_snooze 0')}>
          <Text style={styles.presetButtonText}>Disable Snooze</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put global heads_up_off 1')}>
          <Text style={styles.presetButtonText}>Heads Up Off</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put system screen_off_timeout 2147483647')}>
          <Text style={styles.presetButtonText}>Screen Always On</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put secure screensaver_enabled 0')}>
          <Text style={styles.presetButtonText}>Disable Screensaver</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put global stay_on_while_plugged_in 3')}>
          <Text style={styles.presetButtonText}>Stay On Plugged</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put global low_power 0')}>
          <Text style={styles.presetButtonText}>Disable Low Power</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('svc power stayon true')}>
          <Text style={styles.presetButtonText}>Keep Awake</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetButton} onPress={() => useCommand('settings put secure sleep_timeout -1')}>
          <Text style={styles.presetButtonText}>Never Sleep</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  outputContainer: {
    flex: 1,
    padding: 16,
  },
  outputLine: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    color: Colors.text,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  presetsContainer: {
    padding: 16,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  presetButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  presetButtonText: {
    fontSize: 12,
    color: Colors.text,
  },
});

export default ConsoleScreen;
