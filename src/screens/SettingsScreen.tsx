import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>ADB Port</Text>
        <Text style={styles.settingValue}>5555</Text>
      </View>

      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Scan Concurrency</Text>
        <Text style={styles.settingValue}>10</Text>
      </View>

      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Deployment Concurrency</Text>
        <Text style={styles.settingValue}>3</Text>
      </View>

      <View style={styles.settingCard}>
        <Text style={styles.settingTitle}>Auto Reconnect</Text>
        <Text style={styles.settingValue}>Enabled</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
      </View>

      <TouchableOpacity style={styles.settingCard} onPress={() => navigation.navigate('InstalledApps')}>
        <Text style={styles.settingTitle}>Installed Apps</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingCard} onPress={() => navigation.navigate('Console')}>
        <Text style={styles.settingTitle}>Console</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingCard} onPress={() => navigation.navigate('Logs')}>
        <Text style={styles.settingTitle}>Logs</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingCard} onPress={() => navigation.navigate('Presets')}>
        <Text style={styles.settingTitle}>Presets</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
      </View>

      <TouchableOpacity style={styles.settingCard} onPress={() => navigation.navigate('About')}>
        <Text style={styles.settingTitle}>About</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingCard}>
        <Text style={styles.settingTitle}>Version</Text>
        <Text style={styles.settingValue}>1.0.0</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  section: {
    padding: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  settingCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
    color: Colors.text,
  },
  settingValue: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});

export default SettingsScreen;
