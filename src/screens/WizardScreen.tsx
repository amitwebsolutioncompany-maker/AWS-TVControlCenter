import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WizardScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to TV Control Center',
      description: 'This app helps you manage multiple Android TVs wirelessly. Connect, control, and deploy apps to your TVs from your phone.',
      icon: '📺',
    },
    {
      title: 'Enable ADB on Your TV',
      description: '1. Go to TV Settings\n2. Enable Developer Options\n3. Turn on USB Debugging\n4. Enable Wireless Debugging\n5. Note the IP address and port',
      icon: '⚙️',
    },
    {
      title: 'Connect Your TV',
      description: '1. Make sure phone and TV are on same Wi-Fi\n2. Enter TV IP address in the app\n3. Tap CONNECT\n4. Allow USB debugging on TV screen',
      icon: '🔗',
    },
    {
      title: 'Select and Control',
      description: '• Select multiple TVs for batch operations\n• Deploy APKs to all TVs at once\n• Run cleanup presets\n• Use console for custom commands',
      icon: '🎮',
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      AsyncStorage.setItem('wizard_completed', 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    AsyncStorage.setItem('wizard_completed', 'true');
    onComplete();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.progressContainer}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              index <= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.icon}>{steps[step].icon}</Text>
        <Text style={styles.title}>{steps[step].title}</Text>
        <Text style={styles.description}>{steps[step].description}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {step === steps.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  nextButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default WizardScreen;
