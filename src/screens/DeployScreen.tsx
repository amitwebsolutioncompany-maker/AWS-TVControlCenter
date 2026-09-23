import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { Colors } from '../constants/colors';
import { TvControlService } from '../services/TvControlService';
import { useDeviceStore } from '../store/deviceStore';
import { useProgressStore } from '../store/progressStore';
import { ProgressBar } from '../components/ProgressBar';
import { normalizePickedPath } from '../utils/selectedDevice';

const DeployScreen: React.FC = () => {
  const { devices, selectedDeviceIds, toggleDeviceSelection, selectAllConnected } = useDeviceStore();
  const { setProgress, clearProgress } = useProgressStore();
  const [apkPath, setApkPath] = React.useState<string>();
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState('');

  const choose = async () => {
    try {
      const f = await DocumentPicker.pickSingle({ type: ['application/vnd.android.package-archive'], copyTo: 'cachesDirectory' });
      setApkPath(normalizePickedPath(f.fileCopyUri || f.uri));
      setStatus(f.name || 'APK selected');
    } catch (e: any) {
      if (!DocumentPicker.isCancel(e)) Alert.alert('File selection failed', e?.message || 'Unable to select APK.');
    }
  };

  const connectedSelectedCount = devices.filter(d => selectedDeviceIds.includes(d.deviceId) && d.state === 'Connected').length;

  const deploy = async () => {
    if (!apkPath) return Alert.alert('Select an APK first.');
    const targets = devices.filter(d => selectedDeviceIds.includes(d.deviceId) && d.state === 'Connected');
    if (!targets.length) return Alert.alert('Select at least one connected TV from the TVs page.');
    setBusy(true);
    setProgress('Deploying APK', 0, 'Starting deployment...');
    try {
      const failures: string[] = [];
      for (let i = 0; i < targets.length; i++) {
        const d = targets[i];
        const progress = ((i + 1) / targets.length) * 100;
        setProgress('Deploying APK', progress, `Installing on ${d.name}...`);
        setStatus(`Installing on ${d.name}…`);
        try {
          await TvControlService.installApk(d.deviceId, apkPath);
        } catch (error: any) {
          failures.push(`${d.name}: ${error?.message || 'Install failed'}`);
        }
      }
      const message = failures.length ? `Installed on ${targets.length - failures.length}/${targets.length} TV(s).\n${failures.join('\n')}` : `Installed on ${targets.length} TV(s).`;
      setStatus(message);
      setProgress('Deploying APK', 100, 'Deployment complete');
      Alert.alert(failures.length ? 'Deployment finished with errors' : 'Deployment complete', message);
    } catch (e: any) {
      setStatus('Deployment failed');
      setProgress('Deploying APK', 0, 'Deployment failed');
      Alert.alert('Deployment failed', e?.message || 'ADB install failed.');
    } finally {
      setBusy(false);
      setTimeout(clearProgress, 2000);
    }
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Deploy APK</Text>
      </View>
      <ProgressBar />
      <TouchableOpacity style={s.button} onPress={choose}>
        <Text style={s.buttonText}>{apkPath ? 'CHANGE APK' : 'SELECT APK FILE'}</Text>
      </TouchableOpacity>
      <Text style={s.status}>{status}</Text>
      <View style={s.row}>
        <Text style={s.subtitle}>Select connected TVs</Text>
        <TouchableOpacity onPress={selectAllConnected}>
          <Text style={s.all}>SELECT ALL</Text>
        </TouchableOpacity>
      </View>
      {devices.map(d => (
        <TouchableOpacity key={d.deviceId} style={s.card} onPress={() => toggleDeviceSelection(d.deviceId)}>
          <Text style={s.check}>{selectedDeviceIds.includes(d.deviceId) ? '✓' : '○'}</Text>
          <View>
            <Text style={s.name}>{d.name}</Text>
            <Text style={s.meta}>{d.ipAddress}:{d.port} · {d.state}</Text>
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={[s.button, busy && s.disabled]} disabled={busy} onPress={deploy}>
        <Text style={s.buttonText}>{busy ? 'INSTALLING…' : `DEPLOY TO ${connectedSelectedCount} TV(S)`}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
const s=StyleSheet.create({container:{flex:1,backgroundColor:Colors.background},header:{padding:20,borderBottomWidth:1,borderBottomColor:Colors.border},title:{fontSize:24,fontWeight:'bold',color:Colors.text},button:{margin:16,backgroundColor:Colors.primary,padding:15,borderRadius:10,alignItems:'center'},buttonText:{color:Colors.text,fontSize:15,fontWeight:'bold'},status:{color:Colors.textSecondary,paddingHorizontal:16},row:{flexDirection:'row',justifyContent:'space-between',padding:16},subtitle:{fontSize:17,color:Colors.text,fontWeight:'bold'},all:{color:Colors.primary,fontWeight:'bold'},card:{marginHorizontal:16,marginBottom:8,backgroundColor:Colors.surface,padding:14,borderRadius:10,flexDirection:'row',gap:12},check:{color:Colors.primary,fontSize:20},name:{color:Colors.text,fontSize:16},meta:{color:Colors.textSecondary,fontSize:12,marginTop:3},disabled:{opacity:.55}});
export default DeployScreen;
