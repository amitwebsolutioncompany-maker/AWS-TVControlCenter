import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../constants/colors';

const AboutScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>About</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.appName}>AWS-TVControlCenter</Text>
        <Text style={styles.appVersion}>Version 1.0.0</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.sectionText}>
          A professional TV control and deployment application for Android/Android TV devices.
          Supports Wi-Fi ADB and USB OTG connections for remote control, APK deployment,
          file management, and system operations.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Features</Text>
        <Text style={styles.sectionText}>
          • Wi-Fi ADB connection
          • USB OTG ADB connection
          • Multi-TV APK deployment
          • File manager with ADB sync
          • Remote control
          • Package management
          • Deployment presets
          • ADB shell console
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technical</Text>
        <Text style={styles.sectionText}>
          • React Native + TypeScript
          • Native Android Kotlin
          • ADB protocol implementation
          • Zustand state management
          • Material 3 design
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>License</Text>
        <Text style={styles.sectionText}>
          Proprietary - All rights reserved
        </Text>
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
  infoCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  appVersion: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  section: {
    margin: 16,
    marginTop: 0,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

export default AboutScreen;
