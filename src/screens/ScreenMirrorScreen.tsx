import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { Colors } from '../constants/colors';
import { useDeviceStore } from '../store/deviceStore';
import { TvControlService } from '../services/TvControlService';

const ScreenMirrorScreen: React.FC = () => {
  const devices = useDeviceStore(state => state.devices).filter(device => device.state === 'Connected' && device.connectionType === 'WIFI');
  const [deviceId, setDeviceId] = React.useState<string | null>(null);
  const selected = devices.find(device => device.deviceId === deviceId) || devices[0];

  const handleStartMirror = async () => {
    if (!selected) return;
    try {
      await TvControlService.startMirrorActivity(selected.deviceId);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to start mirroring");
    }
  };

  return <View style={s.container}>
    <Text style={s.title}>Screen Mirror</Text><Text style={s.hint}>Live scrcpy H.264 stream from an authorized Wi-Fi ADB TV.</Text>
    <View style={s.choices}>{devices.map(device => <TouchableOpacity key={device.deviceId} style={[s.choice, selected?.deviceId === device.deviceId && s.active]} onPress={() => setDeviceId(device.deviceId)}><Text style={s.choiceText}>{device.name}</Text></TouchableOpacity>)}</View>
    {selected ? (
      <View style={s.empty}>
        <TouchableOpacity style={s.startButton} onPress={handleStartMirror}>
          <Text style={s.startButtonText}>Start Full-Screen Mirror</Text>
        </TouchableOpacity>
        <Text style={s.hint}>Mirroring will open in a separate native Android page for optimal performance and touch control.</Text>
      </View>
    ) : <View style={s.empty}><Text style={s.hint}>Connect a Wi-Fi ADB TV first.</Text></View>}
  </View>;
};
const s = StyleSheet.create({ container:{flex:1,backgroundColor:Colors.background,padding:16},title:{color:Colors.text,fontSize:24,fontWeight:'bold'},hint:{color:Colors.textSecondary,fontSize:13,marginTop:5,textAlign:'center'},choices:{gap:8,marginVertical:14},choice:{padding:10,borderWidth:1,borderColor:Colors.border,borderRadius:8},active:{borderColor:Colors.primary,backgroundColor:Colors.surfaceLight},choiceText:{color:Colors.text},empty:{flex:1,alignItems:'center',justifyContent:'center'},startButton:{backgroundColor:Colors.primary,paddingVertical:12,paddingHorizontal:24,borderRadius:8,marginBottom:16},startButtonText:{color:'#fff',fontWeight:'bold',fontSize:16} });
export default ScreenMirrorScreen;
