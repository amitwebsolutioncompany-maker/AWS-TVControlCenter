import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { KeyCodes } from '../constants/keycodes';
import { TvControlService } from '../services/TvControlService';
import { getSelectedConnectedDevices } from '../utils/selectedDevice';
import { Alert } from 'react-native';

const RemoteScreen: React.FC = () => {
  const sendKey = async (keyCode: number) => {
    try {
      const devices = getSelectedConnectedDevices();
      const results = await Promise.allSettled(devices.map(device => TvControlService.sendKeyEvent(device.deviceId, keyCode)));
      const failed = results.filter(result => result.status === 'rejected').length;
      if (failed) throw new Error(`Command was sent to ${devices.length - failed}/${devices.length} selected TV(s).`);
    } catch (error: any) {
      Alert.alert('Remote command failed', error?.message || 'Unable to send key event.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Remote Control</Text>
      </View>

      <View style={styles.dpadContainer}>
        <TouchableOpacity style={styles.dpadButton} onPress={() => sendKey(KeyCodes.DPAD_UP)}>
          <Text style={styles.dpadText}>▲</Text>
        </TouchableOpacity>
        
        <View style={styles.dpadRow}>
          <TouchableOpacity style={styles.dpadButton} onPress={() => sendKey(KeyCodes.DPAD_LEFT)}>
            <Text style={styles.dpadText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dpadButton, styles.dpadCenter]} onPress={() => sendKey(KeyCodes.DPAD_CENTER)}>
            <Text style={styles.dpadText}>OK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dpadButton} onPress={() => sendKey(KeyCodes.DPAD_RIGHT)}>
            <Text style={styles.dpadText}>▶</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.dpadButton} onPress={() => sendKey(KeyCodes.DPAD_DOWN)}>
          <Text style={styles.dpadText}>▼</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={() => sendKey(KeyCodes.BACK)}>
          <Text style={styles.buttonText}>BACK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => sendKey(KeyCodes.HOME)}>
          <Text style={styles.buttonText}>HOME</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={() => sendKey(KeyCodes.APP_SWITCH)}>
          <Text style={styles.buttonText}>RECENTS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => sendKey(KeyCodes.MENU)}>
          <Text style={styles.buttonText}>MENU</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.volumeButton]} onPress={() => sendKey(KeyCodes.VOLUME_UP)}>
          <Text style={styles.buttonText}>VOL+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.volumeButton]} onPress={() => sendKey(KeyCodes.VOLUME_DOWN)}>
          <Text style={styles.buttonText}>VOL-</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.muteButton]} onPress={() => sendKey(KeyCodes.VOLUME_MUTE)}>
          <Text style={styles.buttonText}>MUTE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.powerButton]} onPress={() => sendKey(KeyCodes.POWER)}>
          <Text style={styles.buttonText}>POWER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  dpadContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dpadButton: {
    width: 60,
    height: 60,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  dpadCenter: {
    backgroundColor: Colors.primary,
  },
  dpadRow: {
    flexDirection: 'row',
  },
  dpadText: {
    fontSize: 24,
    color: Colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  volumeButton: {
    backgroundColor: Colors.surfaceLight,
  },
  muteButton: {
    backgroundColor: Colors.warning,
  },
  powerButton: {
    backgroundColor: Colors.error,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default RemoteScreen;
