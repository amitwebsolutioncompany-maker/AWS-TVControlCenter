import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { Colors } from '../constants/colors';
import SignageService, { DiscoveredSignageTV } from '../services/SignageService';

const SignageDiscoveryScreen: React.FC = ({ navigation }: any) => {
  const [discovering, setDiscovering] = useState(false);
  const [tvs, setTvs] = useState<DiscoveredSignageTV[]>([]);
  const [selectedTv, setSelectedTv] = useState<DiscoveredSignageTV | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('');
  const [showPairingInput, setShowPairingInput] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [requestingPairing, setRequestingPairing] = useState(false);

  useEffect(() => {
    // Don't auto-start discovery to avoid slow network scanning
    // User can manually start it or enter IP directly
    
    SignageService.onServiceDiscovered((tv) => {
      setTvs((prev) => {
        if (!prev.find((t) => t.name === tv.name)) {
          return [...prev, tv];
        }
        return prev;
      });
    });

    SignageService.onServiceLost((name) => {
      setTvs((prev) => prev.filter((t) => t.name !== name));
    });

    SignageService.onDiscoveryFailed((error) => {
      Alert.alert('Discovery Failed', error);
      setDiscovering(false);
    });

    SignageService.onConnected((tv) => {
      setConnecting(false);
      setSelectedTv(tv);
      setShowPairingInput(true);
      // Request pairing code to display on TV
      requestPairingCodeForTV(tv);
    });

    SignageService.onError((error) => {
      Alert.alert('Connection Error', error);
      setConnecting(false);
    });

    SignageService.onAuthResult((success) => {
      setConnecting(false);
      if (success) {
        setShowPairingInput(false);
        navigation.navigate('SignageControl', { tv: selectedTv });
      }
    });

    return () => {
      SignageService.removeAllListeners();
      SignageService.stopDiscovery();
    };
  }, [navigation, selectedTv]);

  const startDiscovery = async () => {
    setDiscovering(true);
    setTvs([]);
    try {
      await SignageService.startDiscovery();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start discovery');
      setDiscovering(false);
    }
  };

  const stopDiscovery = async () => {
    setDiscovering(false);
    await SignageService.stopDiscovery();
  };

  const connectToTV = async (tv: DiscoveredSignageTV) => {
    setSelectedTv(tv);
    setConnecting(true);
    try {
      await SignageService.connectTV(tv.ipAddress, tv.port);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect');
      setConnecting(false);
    }
  };

  const requestPairingCodeForTV = async (tv: DiscoveredSignageTV) => {
    setRequestingPairing(true);
    try {
      await SignageService.requestPairingCode();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to request pairing code');
      setShowPairingInput(false);
    } finally {
      setRequestingPairing(false);
    }
  };

  const verifyPairingCode = async () => {
    if (!pairingCode.trim()) {
      Alert.alert('Error', 'Please enter the pairing code');
      return;
    }

    setConnecting(true);
    try {
      await SignageService.authenticate(pairingCode);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Authentication failed');
      setConnecting(false);
    }
  };

  const connectManually = async () => {
    if (!manualIp.trim()) {
      Alert.alert('Error', 'Please enter an IP address');
      return;
    }
    
    const port = parseInt(manualPort) || 8080;
    const manualTv: DiscoveredSignageTV = {
      deviceId: `manual-${manualIp}`,
      name: `Manual: ${manualIp}`,
      host: manualIp,
      port: port,
      ipAddress: manualIp,
    };
    
    setSelectedTv(manualTv);
    setConnecting(true);
    setShowManualInput(false);
    
    try {
      await SignageService.connectTV(manualIp, port);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to connect. Make sure the TV is on the same network.');
      setConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AWS-Signage TVs</Text>
        <Text style={styles.subtitle}>Discover TVs on your network</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, discovering && styles.buttonDisabled]}
          onPress={discovering ? stopDiscovery : startDiscovery}
          disabled={connecting}
        >
          {discovering ? (
            <>
              <ActivityIndicator color={Colors.text} />
              <Text style={styles.buttonText}>Stop Discovery</Text>
            </>
          ) : (
            <Text style={styles.buttonText}>Start Discovery</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.manualButton]}
          onPress={() => setShowManualInput(true)}
          disabled={connecting}
        >
          <Text style={styles.buttonText}>Add Manually</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tvList}>
        {tvs.length === 0 && !discovering && (
          <Text style={styles.emptyText}>
            No TVs discovered. Start discovery or add TV manually by IP address.
          </Text>
        )}
        
        {tvs.map((tv) => (
          <View key={tv.deviceId} style={styles.tvCard}>
            <View style={styles.tvInfo}>
              <Text style={styles.tvName}>{tv.name}</Text>
              <Text style={styles.tvIp}>{tv.ipAddress}:{tv.port}</Text>
            </View>
            <TouchableOpacity
              style={[styles.connectButton, connecting && styles.buttonDisabled]}
              onPress={() => connectToTV(tv)}
              disabled={connecting}
            >
              {connecting && selectedTv?.deviceId === tv.deviceId ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.connectButtonText}>Connect</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <Modal visible={showManualInput} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add TV Manually</Text>
            <Text style={styles.modalSubtitle}>Enter the TV's IP address</Text>
            
            <TextInput
              style={styles.input}
              value={manualIp}
              onChangeText={setManualIp}
              placeholder="192.168.1.100"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="number-pad"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.input}
              value={manualPort}
              onChangeText={setManualPort}
              placeholder="Port (default: 8080)"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="number-pad"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowManualInput(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={connectManually}
              >
                <Text style={styles.modalButtonText}>Connect</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPairingInput} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Pairing Code</Text>
            <Text style={styles.modalSubtitle}>
              A 4-digit code is now displayed on the TV screen. Enter it below to pair.
            </Text>

            {requestingPairing ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <TextInput
                style={styles.input}
                value={pairingCode}
                onChangeText={setPairingCode}
                placeholder="Enter 4-digit code"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPairingInput(false);
                  setPairingCode('');
                  setConnecting(false);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={verifyPairingCode}
                disabled={requestingPairing || connecting}
              >
                {connecting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  controls: {
    padding: 16,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  tvList: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  tvCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  tvInfo: {
    flex: 1,
  },
  tvName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  tvIp: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  connectButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  connectButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  manualButton: {
    backgroundColor: Colors.surfaceLight,
    marginTop: 8,
  },
  pairingCode: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 16,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: Colors.surfaceLight,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default SignageDiscoveryScreen;
