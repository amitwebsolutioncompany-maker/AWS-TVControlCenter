import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, Dimensions } from 'react-native';
import { Colors } from '../constants/colors';
import SignageService from '../services/SignageService';
import { DiscoveredSignageTV } from '../services/SignageService';
import VideoStreamView from '../components/VideoStreamView';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SignageControlScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { tv } = route.params as { tv: DiscoveredSignageTV };
  const [connected, setConnected] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardText, setKeyboardText] = useState('');
  const [videoStreamUrl, setVideoStreamUrl] = useState<string | null>(null);
  const [videoSize, setVideoSize] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });

  useEffect(() => {
    // Already authenticated via pairing code, no PIN needed
    setAuthenticated(true);
    setConnected(true);

    // Start video stream
    const streamUrl = SignageService.getVideoStreamUrl();
    if (streamUrl) {
      setVideoStreamUrl(streamUrl);
    }

    SignageService.onDisconnected(() => {
      setConnected(false);
      setAuthenticated(false);
      Alert.alert('Disconnected', 'Connection to TV lost');
      navigation.goBack();
    });

    SignageService.onError((error) => {
      Alert.alert('Error', error);
    });

    return () => {
      SignageService.removeAllListeners();
      SignageService.disconnectTV();
    };
  }, [navigation]);

  const handleTouch = async (event: any) => {
    if (!authenticated) return;

    const { locationX, locationY } = event.nativeEvent;
    // Calculate touch coordinates as percentage (0.0 to 1.0)
    // This makes it resolution-independent
    const percentX = locationX / videoSize.width;
    const percentY = locationY / videoSize.height;

    try {
      await SignageService.sendTap(percentX, percentY);
    } catch (error: any) {
      console.error('Touch error:', error);
    }
  };

  const sendControlAction = async (actionString: string) => {
    if (!authenticated) return;
    try {
      await SignageService.sendActionString(actionString);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send action');
    }
  };

  const sendGlobalAction = async (action: number) => {
    if (!authenticated) return;
    try {
      await SignageService.sendGlobalAction(action);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send action');
    }
  };

  const handleDisconnect = async () => {
    await SignageService.disconnectTV();
    navigation.goBack();
  };

  const handleSendText = async () => {
    if (!authenticated || !keyboardText) return;
    try {
      await SignageService.sendText(keyboardText);
      setKeyboardText('');
      setShowKeyboard(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send text');
    }
  };

  return (
    <View style={styles.container}>
      {/* Video Container */}
      <View 
        style={styles.videoContainer}
        onLayout={(e) => setVideoSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        onStartShouldSetResponder={() => true}
        onResponderRelease={handleTouch}
      >
        {videoStreamUrl && authenticated ? (
          <VideoStreamView 
            streamUrl={videoStreamUrl}
            style={styles.videoPlaceholder}
          />
        ) : (
          <View 
            style={styles.videoPlaceholder}
          >
            <Text style={styles.videoPlaceholderText}>
              {authenticated ? 'TV Screen (Touch to Control)' : 'Waiting for Authentication...'}
            </Text>
          </View>
        )}
        
        {/* Transparent overlay to guarantee touch interception */}
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={(e) => handleTouch(e)} 
        />
        
        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View style={[styles.statusDot, { backgroundColor: connected ? Colors.success : Colors.error }]} />
          <Text style={styles.statusText}>
            {connected ? (authenticated ? 'Connected' : 'Authenticating...') : 'Connecting...'}
          </Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controls}>
        {/* Top Row: Back, Home, Recents, Long Back */}
        <View style={styles.row}>
          <TouchableOpacity style={styles.controlButton} onPress={() => sendGlobalAction(1)}>
            <Text style={styles.controlButtonText}>BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => sendControlAction('long_back')}>
            <Text style={styles.controlButtonText}>LONG BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={() => sendGlobalAction(2)}>
            <Text style={styles.controlButtonText}>HOME</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, { backgroundColor: Colors.primary }]} onPress={() => sendControlAction('open_settings')}>
            <Text style={styles.controlButtonText}>SETTING</Text>
          </TouchableOpacity>
        </View>

        {/* App Shortcuts Row */}
        <View style={styles.row}>
          <TouchableOpacity style={[styles.controlButton, { backgroundColor: Colors.surfaceLight, flex: 1, marginHorizontal: 5 }]} onPress={() => sendControlAction('open_smart_tv_apps')}>
            <Text style={styles.controlButtonText}>SMART TV APPS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, { backgroundColor: Colors.surfaceLight, flex: 1, marginHorizontal: 5 }]} onPress={() => sendControlAction('open_google_tv_apps')}>
            <Text style={styles.controlButtonText}>GOOGLE TV APPS</Text>
          </TouchableOpacity>
        </View>

        {/* Volume Row */}
        <View style={styles.row}>
          <TouchableOpacity style={[styles.controlButton, styles.volumeButton]} onPress={() => sendControlAction('volume_down')}>
            <Text style={styles.controlButtonText}>VOL-</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.volumeButton]} onPress={() => sendControlAction('volume_up')}>
            <Text style={styles.controlButtonText}>VOL+</Text>
          </TouchableOpacity>
        </View>
        
        {/* D-Pad */}
        <View style={styles.dpadContainer}>
           <View style={styles.dpadRow}>
              <TouchableOpacity style={styles.dpadButton} onPress={() => sendControlAction('dpad_up')}>
                <Text style={styles.controlButtonText}>UP</Text>
              </TouchableOpacity>
           </View>
           <View style={styles.dpadRowCenter}>
              <TouchableOpacity style={styles.dpadButton} onPress={() => sendControlAction('dpad_left')}>
                <Text style={styles.controlButtonText}>LEFT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dpadButton, styles.dpadCenterButton]} onPress={() => sendControlAction('dpad_center')}>
                <Text style={styles.controlButtonText}>OK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dpadButton} onPress={() => sendControlAction('dpad_right')}>
                <Text style={styles.controlButtonText}>RIGHT</Text>
              </TouchableOpacity>
           </View>
           <View style={styles.dpadRow}>
              <TouchableOpacity style={styles.dpadButton} onPress={() => sendControlAction('dpad_down')}>
                <Text style={styles.controlButtonText}>DOWN</Text>
              </TouchableOpacity>
           </View>
        </View>

        {/* Utilities Row */}
        <View style={styles.row}>
          <TouchableOpacity style={[styles.controlButton, styles.keyboardButton]} onPress={() => setShowKeyboard(true)}>
            <Text style={styles.controlButtonText}>KEYBOARD</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, styles.disconnectButton]} onPress={handleDisconnect}>
            <Text style={styles.controlButtonText}>DISCONNECT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Keyboard Modal */}
      <Modal visible={showKeyboard} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.keyboardModal}>
            <Text style={styles.modalTitle}>Send Text</Text>
            <TextInput
              style={styles.keyboardInput}
              value={keyboardText}
              onChangeText={setKeyboardText}
              placeholder="Type here..."
              placeholderTextColor={Colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowKeyboard(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={handleSendText}>
                <Text style={styles.modalButtonText}>Send</Text>
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
  videoContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    position: 'relative',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholderText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  statusBar: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: Colors.text,
  },
  controls: {
    padding: 16,
    backgroundColor: Colors.background,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  volumeButton: {
    backgroundColor: Colors.surfaceLight,
  },
  dpadContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dpadRowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  dpadButton: {
    backgroundColor: Colors.surfaceLight,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  dpadCenterButton: {
    backgroundColor: Colors.primary,
  },
  keyboardButton: {
    backgroundColor: Colors.primary,
  },
  disconnectButton: {
    backgroundColor: Colors.error,
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
  keyboardModal: {
    backgroundColor: Colors.surface,
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
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
  pinInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: Colors.text,
    marginBottom: 20,
  },
  keyboardInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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

export default SignageControlScreen;
