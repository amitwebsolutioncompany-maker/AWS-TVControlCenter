import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { TvControlService } from '../services/TvControlService';
import { getSelectedConnectedDevice } from '../utils/selectedDevice';

const ConsoleScreen: React.FC = () => {
  const [command, setCommand] = React.useState('');
  const [output, setOutput] = React.useState<string[]>([]);

  const executeCommand = async () => {
    const input = command.trim();
    if (!input) return;
    setOutput(current => [...current, `$ ${input}`, 'Executing...']);
    setCommand('');
    try {
      const device = getSelectedConnectedDevice();
      const result = await TvControlService.shell(device.deviceId, input);
      setOutput(current => [...current, result.stdout || result.stderr || `Exit code: ${result.exitCode}`]);
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
