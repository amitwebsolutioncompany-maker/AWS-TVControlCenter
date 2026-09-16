import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/colors';
import { TvControlService } from '../services/TvControlService';
import { getSelectedConnectedDevices } from '../utils/selectedDevice';

const InstalledAppsScreen: React.FC = () => {
  const [packages, setPackages] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [sourceName, setSourceName] = React.useState('');
  const load = async () => {
    setBusy(true);
    try {
      const devices = getSelectedConnectedDevices();
      const result = await TvControlService.shell(devices[0].deviceId, 'pm list packages -3');
      setPackages((result.stdout || '').split(/\r?\n/).map(x => x.replace(/^package:/, '').trim()).filter(Boolean));
      setSourceName(devices[0].name);
      if (devices.length > 1) Alert.alert('Apps loaded', `Showing installed apps from ${devices[0].name}. Actions apply to all ${devices.length} selected TVs.`);
    } catch (error: any) { Alert.alert('Apps unavailable', error?.message || 'Select a connected TV and try again.'); }
    finally { setBusy(false); }
  };
  const action = async (pkg: string, type: 'launch' | 'stop' | 'uninstall') => {
    try {
      setBusy(true);
      const devices = getSelectedConnectedDevices();
      const results = await Promise.allSettled(devices.map(device => type === 'launch' ? TvControlService.launchPackage(device.deviceId, pkg) : type === 'stop' ? TvControlService.forceStopPackage(device.deviceId, pkg) : TvControlService.uninstallPackage(device.deviceId, pkg)));
      const failed = results.filter(item => item.status === 'rejected').length;
      Alert.alert(failed ? 'Action finished with errors' : 'Action complete', `${type.toUpperCase()} applied on ${devices.length - failed}/${devices.length} selected TV(s).`);
      if (type === 'uninstall') await load();
    } catch (error: any) { Alert.alert('App action failed', error?.message || 'Command failed.'); }
    finally { setBusy(false); }
  };
  return <ScrollView style={s.container}><View style={s.header}><Text style={s.title}>Installed Apps</Text><Text style={s.hint}>Select TVs first. Apps are listed from one TV; actions apply to all selected TVs.</Text></View><TouchableOpacity style={[s.refresh, busy && s.disabled]} onPress={load} disabled={busy}><Text style={s.buttonText}>{busy ? 'LOADING…' : 'LOAD TV APPS'}</Text></TouchableOpacity>{sourceName ? <Text style={s.source}>Showing: {sourceName}</Text> : null}{packages.map(pkg => <View style={s.card} key={pkg}><Text style={s.pkg}>{pkg}</Text><View style={s.actions}><TouchableOpacity style={s.button} disabled={busy} onPress={() => action(pkg,'launch')}><Text style={s.buttonText}>LAUNCH</Text></TouchableOpacity><TouchableOpacity style={[s.button,s.secondary]} disabled={busy} onPress={() => action(pkg,'stop')}><Text style={s.buttonText}>STOP</Text></TouchableOpacity><TouchableOpacity style={[s.button,s.danger]} disabled={busy} onPress={() => Alert.alert('Uninstall?', `${pkg} will be removed from all selected TVs.`, [{text:'Cancel',style:'cancel'},{text:'Uninstall',style:'destructive',onPress:() => action(pkg,'uninstall')}])}><Text style={s.buttonText}>REMOVE</Text></TouchableOpacity></View></View>)}</ScrollView>;
};
const s=StyleSheet.create({container:{flex:1,backgroundColor:Colors.background},header:{padding:20,borderBottomWidth:1,borderBottomColor:Colors.border},title:{fontSize:24,fontWeight:'bold',color:Colors.text},hint:{fontSize:13,color:Colors.textSecondary,marginTop:5},source:{color:Colors.textSecondary,marginHorizontal:16,marginBottom:10},refresh:{margin:16,backgroundColor:Colors.primary,padding:14,borderRadius:8,alignItems:'center'},disabled:{opacity:.55},card:{marginHorizontal:16,marginBottom:10,backgroundColor:Colors.surface,padding:14,borderRadius:10},pkg:{fontSize:14,color:Colors.text},actions:{flexDirection:'row',gap:6,marginTop:12},button:{flex:1,backgroundColor:Colors.primary,padding:10,borderRadius:7,alignItems:'center'},secondary:{backgroundColor:Colors.surfaceLight},danger:{backgroundColor:Colors.error},buttonText:{fontSize:12,fontWeight:'600',color:Colors.text}});
export default InstalledAppsScreen;
