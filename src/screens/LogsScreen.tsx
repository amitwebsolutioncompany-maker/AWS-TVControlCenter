import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

const LogsScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Logs</Text>
        <TouchableOpacity>
          <Text style={styles.exportText}>EXPORT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTime}>14:30:22</Text>
        <Text style={styles.logMessage}>TV 192.168.1.20 connecting</Text>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTime}>14:30:23</Text>
        <Text style={[styles.logMessage, styles.logSuccess]}>ADB connected</Text>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTime}>14:30:24</Text>
        <Text style={styles.logMessage}>Installing signage.apk</Text>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTime}>14:30:18</Text>
        <Text style={[styles.logMessage, styles.logSuccess]}>Install successful</Text>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTime}>14:30:19</Text>
        <Text style={styles.logMessage}>Disabling tv.cloudwalker.profile</Text>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTime}>14:30:19</Text>
        <Text style={[styles.logMessage, styles.logSuccess]}>SUCCESS</Text>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTime}>14:30:21</Text>
        <Text style={styles.logMessage}>Launching signage app</Text>
      </View>

      <View style={styles.logCard}>
        <Text style={styles.logTime}>14:30:22</Text>
        <Text style={[styles.logMessage, styles.logSuccess]}>SUCCESS</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  exportText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  logCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
  },
  logTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
    color: Colors.text,
  },
  logSuccess: {
    color: Colors.success,
  },
});

export default LogsScreen;
