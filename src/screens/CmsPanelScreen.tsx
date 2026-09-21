import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';

const CMS_URL_KEY = '@cms_url_key';

export default function CmsPanelScreen() {
  const [url, setUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [key, setKey] = useState(0); // Used to force-refresh WebView

  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    loadSavedUrl();
  }, []);

  const loadSavedUrl = async () => {
    try {
      const stored = await AsyncStorage.getItem(CMS_URL_KEY);
      if (stored) {
        setUrl(stored);
        setSavedUrl(stored);
      }
    } catch (e) {
      console.error('Failed to load CMS URL', e);
    }
  };

  const saveUrl = async (newUrl: string) => {
    if (!newUrl) return;
    try {
      // Basic validation/formatting
      let finalUrl = newUrl.trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'http://' + finalUrl;
      }
      
      await AsyncStorage.setItem(CMS_URL_KEY, finalUrl);
      setUrl(finalUrl);
      setSavedUrl(finalUrl);
      setKey(prev => prev + 1); // Force WebView reload
      Alert.alert('Success', 'CMS URL saved successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save URL.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar Area */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.input}
          placeholder="Enter CMS URL (e.g. http://192.168.1.5:8080)"
          placeholderTextColor={Colors.textSecondary}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={() => saveUrl(url)}>
            <Text style={styles.buttonText}>SAVE URL</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {savedUrl ? (
          <WebView
            key={key}
            ref={webViewRef}
            source={{ uri: savedUrl }}
            style={styles.webview}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            )}
            onError={(e) => {
              console.log('WebView error:', e.nativeEvent);
            }}
          />
        ) : (
          <View style={styles.centered}>
            <Text style={styles.message}>No CMS URL configured.</Text>
            <Text style={styles.subMessage}>Please type a URL and save, or scan a QR code.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    padding: 15,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  input: {
    backgroundColor: Colors.background,
    color: Colors.text,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  scanButton: {
    backgroundColor: Colors.success,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subMessage: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
