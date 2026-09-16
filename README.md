# AWS-TVControlCenter

A professional TV control and deployment application for Android/Android TV devices. Supports Wi-Fi ADB and USB OTG connections for remote control, APK deployment, file management, and system operations.

## Project Overview

**Application Name:** AWS-TVControlCenter  
**Package:** com.aws.tvcontrolcenter  
**Version:** 1.0.0

This mobile application allows you to control Android/Android TV devices directly from an Android phone, replacing the functionality of Windows-based ADB tools. No PC is required.

## Architecture

```
AWS-TVControlCenter
         |
     +-----------+-----------+
     |                       |
 Wi-Fi ADB               USB OTG ADB
     |                       |
     v                       v
Android TV              Android TV
```

## Technology Stack

- **React Native CLI** 0.76.8
- **TypeScript** 5.6.3
- **Native Android Kotlin** (JDK 17 compatible)
- **Gradle** 8.7
- **Android SDK** 35 (min SDK 26)
- **React Navigation** 6.x
- **Zustand** for state management
- **Material 3** compatible UI

## Requirements

### Windows Setup

1. **Node.js** (v18 or higher recommended)
   ```bash
   node --version
   ```

2. **JDK 17** (or compatible with Android Gradle Plugin 8.7)
   ```bash
   java -version
   ```

3. **Android Studio**
   - Install Android Studio
   - Install Android SDK, Android SDK Platform, Android SDK Build Tools, Android SDK Platform Tools
   - Configure `ANDROID_HOME` environment variable

4. **Environment Variables**
   ```bash
   ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk
   ```

## Installation

1. Navigate to the project directory:
   ```bash
   cd d:\am\code\reactnative\AWS-TVControlCenter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run React Native doctor to check setup:
   ```bash
   npx react-native doctor
   ```

## Development

### Run on Android Device/Emulator

```bash
npm run android
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

## Building APKs

### Debug APK

```bash
cd android
gradlew.bat assembleDebug
```

**Output:** `android\app\build\outputs\apk\debug\app-debug.apk`

### Release APK

First, create `keystore.properties` in the `android/` directory:

```properties
storeFile=path/to/your/keystore.jks
storePassword=your_store_password
keyAlias=your_key_alias
keyPassword=your_key_password
```

Then build:

```bash
cd android
gradlew.bat assembleRelease
```

**Output:** `android\app\build\outputs\apk\release\app-release.apk`

## Features

### Wi-Fi ADB Connection

- **Classic ADB TCP:** Connect via IP:port (e.g., 192.168.1.20:5555)
- **Android Wireless Debugging:** Pair with pairing IP, port, and code
- **Network Discovery:** Scan local network for ADB devices
- **Configurable Port:** Default 5555, customizable

### USB OTG ADB

- **USB Host Mode:** Phone acts as USB host
- **USB Permission Handling:** Proper permission requests
- **ADB Interface Detection:** Identifies ADB interfaces on USB devices
- **Bulk Transfer:** Uses bulk IN/OUT endpoints for communication

### Device Management

- **Device List:** View all connected TVs with status
- **Device Details:** Serial, manufacturer, model, Android version, screen resolution, storage
- **Connection Status:** Online, Offline, Connecting, Unauthorized, Error states
- **Multi-Device Support:** Manage multiple TVs simultaneously

### APK Deployment

- **Single TV Deployment:** Install APK to one device
- **Multi-TV Deployment:** Deploy to multiple TVs simultaneously
- **Configurable Concurrency:** Default 3 simultaneous deployments
- **Real-time Progress:** Track installation progress per device
- **Deployment Presets:** Create reusable deployment workflows

### CloudWalker Signage Preset

Default preset includes:
1. Install APK
2. Disable `tv.cloudwalker.profile`
3. Disable `tv.cloudwalker.channels`
4. Launch installed application

### Package Management

- **Installed Apps:** View all installed applications
- **Launch:** Start applications
- **Force Stop:** Stop running applications
- **Disable/Enable:** Enable or disable packages
- **Uninstall:** Remove applications (where permitted)
- **Clear Data:** Clear application data (where permitted)

### File Manager

- **Browse:** Navigate TV file system
- **Upload:** Push files from phone to TV
- **Download:** Pull files from TV to phone
- **Delete:** Remove files from TV
- **Create Folders:** Organize TV storage
- **Streaming:** Large file transfers without loading into RAM

### Remote Control

- **D-Pad:** Up, Down, Left, Right, OK
- **Navigation:** Back, Home, Recent Apps, Menu
- **Volume:** Volume Up, Volume Down, Mute
- **Power:** Power button
- **System:** Notifications, Settings

### ADB Console

- **Shell Commands:** Execute any ADB shell command
- **Predefined Commands:** Quick access to common commands
- **Command History:** Reuse previous commands
- **Output Display:** View stdout, stderr, exit codes

### Bulk Operations

- **Multi-Device Actions:** Execute operations on multiple TVs
- **Select All/Clear All:** Quick device selection
- **Confirmation:** Destructive operations require confirmation

### Deployment Presets

Create custom deployment workflows with steps:
- INSTALL_APK
- DISABLE_PACKAGE
- ENABLE_PACKAGE
- UNINSTALL_PACKAGE
- FORCE_STOP
- LAUNCH_PACKAGE
- PUSH_FILE
- REBOOT
- SEND_KEY
- SHELL_COMMAND

### Logging

- **Structured Logs:** Timestamped, per-device logging
- **Deployment Logs:** Track deployment progress
- **Error Logs:** Capture and display errors
- **Export:** Export logs as TXT or JSON

## Wi-Fi ADB Setup

### Classic ADB TCP

1. Enable USB debugging on the TV
2. Connect TV to computer via USB
3. Run: `adb tcpip 5555`
4. Disconnect USB
5. Connect phone and TV to same Wi-Fi network
6. In the app, enter TV's IP address and port 5555

### Android Wireless Debugging

1. Enable Developer Options on TV
2. Enable Wireless Debugging
3. Note the pairing IP, pairing port, and pairing code
4. In the app, enter these details to pair
5. After pairing, connect using the ADB connection port

## USB OTG Setup

1. Enable USB debugging on the TV
2. Connect TV to phone via USB OTG cable
3. Phone will detect USB device
4. Grant USB permission in the app
5. App will identify ADB interface and connect

## Android TV Setup

### Enable Developer Options

1. Go to Settings > About
2. Tap "Build Number" 7 times
3. Developer Options will appear in Settings

### Enable USB Debugging

1. Go to Settings > Developer Options
2. Enable "USB Debugging"
3. Accept authorization dialog when prompted

### Enable Wireless Debugging (Android 11+)

1. Go to Settings > Developer Options
2. Enable "Wireless Debugging"
3. Note pairing details for connection

## ADB Authorization

When connecting to a new device:
1. TV will show authorization dialog
2. Accept the debugging authorization
3. If rejected, enable USB debugging and try again

## Troubleshooting

### Connection Failed

- Ensure phone and TV are on same network (Wi-Fi ADB)
- Check firewall settings
- Verify ADB is enabled on TV
- Try different USB cable (USB OTG)
- Check USB OTG compatibility

### Installation Failed

- Verify APK is valid
- Check available storage on TV
- Ensure TV has installation permissions
- Check TV Android version compatibility

### USB Not Detected

- Verify USB OTG cable is working
- Check phone USB host capability
- Ensure TV supports USB ADB
- Try different USB port

### Build Errors

- Ensure JDK 17 is installed
- Verify ANDROID_HOME is set correctly
- Run `npx react-native doctor`
- Update Android SDK if needed

## Security

- **No Cloud Backend:** All operations are local
- **No External Server:** Phone is ADB client only
- **Local Network Only:** No public IP scanning
- **ADB Key Protection:** Keys stored securely using Android Keystore
- **Confirmation Required:** Destructive operations need user approval
- **No Analytics:** No data collection by default
- **Offline-First:** Works without internet connection

## Known Limitations

- **USB ADB:** Full USB ADB transport requires complete ADB protocol implementation. Current implementation provides framework but may need additional work for specific device combinations.
- **Wireless Debugging:** Not all Android TVs support Android Wireless Debugging. App detects and reports unsupported devices.
- **Package Management:** Some TV firmware may restrict package disable/enable operations. App reports actual errors from ADB.
- **Screen Control:** Screen on/off may not work on all devices due to privilege restrictions.
- **File Transfer:** Large file streaming implementation requires full ADB sync protocol. Current implementation provides framework.

## Project Structure

```
AWS-TVControlCenter/
├── android/
│   ├── app/src/main/java/com/aws/tvcontrolcenter/
│   │   ├── adb/              # ADB abstraction and implementations
│   │   ├── usb/              # USB device management
│   │   ├── deployment/       # APK deployment logic
│   │   ├── remote/           # Remote control
│   │   ├── system/           # System information
│   │   ├── bridge/           # React Native bridge
│   │   └── utils/            # Utilities
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/             # Screen components
│   ├── navigation/          # Navigation configuration
│   ├── store/               # Zustand state management
│   ├── services/            # Native module services
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   └── constants/           # App constants
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── app.json
```

## Third-Party Notices

This project uses the following third-party dependencies:

### React Native Ecosystem
- react-native: MIT License
- @react-navigation/*: MIT License
- zustand: MIT License
- react-native-document-picker: MIT License
- react-native-fs: MIT License
- react-native-permissions: MIT License

### Android Native
- Android Gradle Plugin: Apache License 2.0
- Kotlin: Apache License 2.0

**Note:** For libadb-android (if integrated), verify the exact license from the repository before release.

## License

Proprietary - All rights reserved

## Support

For issues and questions, please refer to the troubleshooting section or check the logs within the application.
