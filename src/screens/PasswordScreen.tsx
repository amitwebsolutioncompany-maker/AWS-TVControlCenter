import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';

const PASSWORD_KEY = '@tv_control_password';
const INITIAL_PASSWORD = 1;

const PasswordScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const [currentPassword, setCurrentPassword] = useState<number>(INITIAL_PASSWORD);
  const [oldPassword, setOldPassword] = useState<number>(0);
  const [inputPassword, setInputPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadPassword();
  }, []);

  const loadPassword = async () => {
    try {
      const storedPassword = await AsyncStorage.getItem(PASSWORD_KEY);
      if (storedPassword) {
        const passwordNum = parseInt(storedPassword, 10);
        setCurrentPassword(passwordNum);
        setOldPassword(passwordNum - 1);
      } else {
        // First time - initialize password to 1
        await AsyncStorage.setItem(PASSWORD_KEY, INITIAL_PASSWORD.toString());
        setCurrentPassword(INITIAL_PASSWORD);
        setOldPassword(0);
      }
    } catch (error) {
      console.error('Failed to load password:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    const enteredPassword = parseInt(inputPassword.trim(), 10);
    
    if (isNaN(enteredPassword)) {
      Alert.alert('Invalid Input', 'Please enter a valid number.');
      return;
    }

    setVerifying(true);
    
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 300));

    if (enteredPassword === currentPassword) {
      // Password correct - increment password for next time
      const newPassword = currentPassword + 1;
      try {
        await AsyncStorage.setItem(PASSWORD_KEY, newPassword.toString());
        onUnlock();
      } catch (error) {
        console.error('Failed to save new password:', error);
        // Still allow access even if save fails
        onUnlock();
      }
    } else {
      Alert.alert('Wrong Password', 'Incorrect password. Please try again.');
      setInputPassword('');
    }
    
    setVerifying(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>TV Control Center</Text>
        <Text style={styles.subtitle}>Enter password to continue</Text>
        
        {oldPassword > 0 && (
          <View style={styles.hintContainer}>
            <Text style={styles.hintLabel}>Last password used:</Text>
            <Text style={styles.hintValue}>00{oldPassword}</Text>
          </View>
        )}
        
        <TextInput
          style={styles.input}
          value={inputPassword}
          onChangeText={setInputPassword}
          placeholder="Enter password"
          placeholderTextColor={Colors.textSecondary}
          keyboardType="number-pad"
          autoFocus
          maxLength={6}
        />
        
        <TouchableOpacity 
          style={[styles.button, verifying && styles.buttonDisabled]} 
          onPress={handleUnlock}
          disabled={verifying || !inputPassword.trim()}
        >
          {verifying ? (
            <ActivityIndicator color={Colors.text} />
          ) : (
            <Text style={styles.buttonText}>UNLOCK</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 32,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  hintContainer: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  hintLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  hintText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  hintValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  input: {
    backgroundColor: Colors.background,
    color: Colors.text,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 20,
    textAlign: 'center',
    width: '100%',
    marginBottom: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default PasswordScreen;
