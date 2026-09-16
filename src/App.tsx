import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from './constants/colors';
import { TvControlService } from './services/TvControlService';
import { subscribeToDeviceConnected, subscribeToDeviceDisconnected } from './services/TvControlService';
import { useDeviceStore } from './store/deviceStore';

import DashboardScreen from './screens/DashboardScreen';
import DevicesScreen from './screens/DevicesScreen';
import DeviceDetailsScreen from './screens/DeviceDetailsScreen';
import DeployScreen from './screens/DeployScreen';
import FilesScreen from './screens/FilesScreen';
import RemoteScreen from './screens/RemoteScreen';
import SettingsScreen from './screens/SettingsScreen';
import InstalledAppsScreen from './screens/InstalledAppsScreen';
import ConsoleScreen from './screens/ConsoleScreen';
import LogsScreen from './screens/LogsScreen';
import PresetsScreen from './screens/PresetsScreen';
import AboutScreen from './screens/AboutScreen';
import MenuScreen from './screens/MenuScreen';
import { GlobalHeader } from './components/GlobalHeader';

type RootStackParamList = {
  MainTabs: undefined;
  DeviceDetails: { deviceId: string };
  InstalledApps: undefined;
  Console: undefined;
  Logs: undefined;
  Presets: undefined;
  About: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        header: props => <GlobalHeader navigation={props.navigation} />,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarIcon: ({color}) => { const icons:Record<string,string>={Dashboard:'⌂',TVs:'▣',Deploy:'⇧',Files:'▤',Remote:'◉',Menu:'☰',Settings:'⚙'}; return <Text style={{color,fontSize:18}}>{icons[route.name]||'•'}</Text>; },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="TVs" component={DevicesScreen} />
      <Tab.Screen name="Deploy" component={DeployScreen} />
      <Tab.Screen name="Files" component={FilesScreen} />
      <Tab.Screen name="Remote" component={RemoteScreen} />
      <Tab.Screen name="Menu" component={MenuScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  React.useEffect(() => {
    const connected = subscribeToDeviceConnected((device) => useDeviceStore.getState().addDevice(device));
    const disconnected = subscribeToDeviceDisconnected((deviceId) => useDeviceStore.getState().updateDevice(deviceId, { state: 'Disconnected' }));
    // Reconnect TVs that expose classic ADB TCP.  adbd will still show its
    // authorization dialog the first time; Android does not permit bypassing it.
    const discoverAndConnect = async () => {
      try {
        const endpoints = await TvControlService.scanWifiDevices();
        await Promise.all(endpoints.map(async (endpoint: { ipAddress: string; port: number }) => {
          try {
            const device = await TvControlService.connectWifiDevice(endpoint.ipAddress, endpoint.port);
            const store = useDeviceStore.getState();
            store.addDevice(device);
            if (!store.selectedDeviceId) store.setSelectedDevice(device.deviceId);
          } catch {
            // A TV can have port 5555 open but await authorization or not run adbd.
          }
        }));
      } catch {
        // The manual scan screen shows actionable errors; startup discovery is best-effort.
      }
    };
    discoverAndConnect();
    const interval = setInterval(discoverAndConnect, 60_000);
    return () => { connected.remove(); disconnected.remove(); clearInterval(interval); };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: Colors.surface,
            },
            headerTintColor: Colors.text,
            headerTitleStyle: {
              color: Colors.text,
            },
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="DeviceDetails" component={DeviceDetailsScreen} />
          <Stack.Screen name="InstalledApps" component={InstalledAppsScreen} />
          <Stack.Screen name="Console" component={ConsoleScreen} />
          <Stack.Screen name="Logs" component={LogsScreen} />
          <Stack.Screen name="Presets" component={PresetsScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
