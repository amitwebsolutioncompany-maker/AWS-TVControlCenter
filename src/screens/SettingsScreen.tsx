import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../store/themeStore';
import { useTheme } from '../hooks/useTheme';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, toggleTheme } = useThemeStore();
  const Colors = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors.background }]}>
      <View style={[styles.header, { borderBottomColor: Colors.border }]}>
        <Text style={[styles.title, { color: Colors.text }]}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>Appearance</Text>
      </View>

      <TouchableOpacity style={[styles.settingCard, { backgroundColor: Colors.surface }]} onPress={toggleTheme}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>Theme</Text>
        <Text style={[styles.settingValue, { color: Colors.textSecondary }]}>{theme === 'dark' ? 'Dark' : 'Light'}</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>Connection</Text>
      </View>

      <View style={[styles.settingCard, { backgroundColor: Colors.surface }]}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>ADB Port</Text>
        <Text style={[styles.settingValue, { color: Colors.textSecondary }]}>5555</Text>
      </View>

      <View style={[styles.settingCard, { backgroundColor: Colors.surface }]}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>Scan Concurrency</Text>
        <Text style={[styles.settingValue, { color: Colors.textSecondary }]}>10</Text>
      </View>

      <View style={[styles.settingCard, { backgroundColor: Colors.surface }]}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>Deployment Concurrency</Text>
        <Text style={[styles.settingValue, { color: Colors.textSecondary }]}>3</Text>
      </View>

      <View style={[styles.settingCard, { backgroundColor: Colors.surface }]}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>Auto Reconnect</Text>
        <Text style={[styles.settingValue, { color: Colors.textSecondary }]}>Enabled</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>Quick Access</Text>
      </View>

      <TouchableOpacity style={[styles.settingCard, { backgroundColor: Colors.surface }]} onPress={() => navigation.navigate('InstalledApps')}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>Installed Apps</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.settingCard, { backgroundColor: Colors.surface }]} onPress={() => navigation.navigate('Console')}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>Console</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.settingCard, { backgroundColor: Colors.surface }]} onPress={() => navigation.navigate('Logs')}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>Logs</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.settingCard, { backgroundColor: Colors.surface }]} onPress={() => navigation.navigate('Presets')}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>Presets</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: Colors.textSecondary }]}>About</Text>
      </View>

      <TouchableOpacity style={[styles.settingCard, { backgroundColor: Colors.surface }]} onPress={() => navigation.navigate('About')}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>About</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.settingCard, { backgroundColor: Colors.surface }]}>
        <Text style={[styles.settingTitle, { color: Colors.text }]}>Version</Text>
        <Text style={[styles.settingValue, { color: Colors.textSecondary }]}>1.0.0</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  settingCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTitle: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 16,
  },
});

export default SettingsScreen;
