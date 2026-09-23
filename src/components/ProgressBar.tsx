import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';
import { useProgressStore } from '../store/progressStore';

export const ProgressBar: React.FC = () => {
  const { activeOperation, progress, currentStep } = useProgressStore();

  if (!activeOperation) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.operationText}>{activeOperation}</Text>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.stepText}>{currentStep}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  operationText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  barBackground: {
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  stepText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});
