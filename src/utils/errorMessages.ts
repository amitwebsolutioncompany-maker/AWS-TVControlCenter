export const getUserFriendlyError = (error: string | undefined): string => {
  if (!error) return 'Something went wrong. Please try again.';

  const lowerError = error.toLowerCase();

  // Connection errors
  if (lowerError.includes('connection refused') || lowerError.includes('connection reset')) {
    return 'TV is not responding. Make sure the TV is on and connected to the same Wi-Fi network.';
  }
  if (lowerError.includes('timeout') || lowerError.includes('timed out')) {
    return 'Connection timed out. The TV might be busy or offline. Try again.';
  }
  if (lowerError.includes('host unreachable') || lowerError.includes('no route to host')) {
    return 'Cannot reach the TV. Check if the TV IP address is correct and both devices are on the same network.';
  }
  if (lowerError.includes('device not connected')) {
    return 'TV is not connected. Please connect the TV first.';
  }

  // ADB errors
  if (lowerError.includes('adb') || lowerError.includes('adbd')) {
    return 'ADB connection issue. Make sure Developer Options and USB Debugging are enabled on the TV.';
  }
  if (lowerError.includes('authorization')) {
    return 'Authorization required. Check the TV screen and tap "Allow USB debugging" to authorize this device.';
  }

  // Install errors
  if (lowerError.includes('install') || lowerError.includes('apk')) {
    return 'Installation failed. Make sure the APK file is valid and the TV has enough storage space.';
  }
  if (lowerError.includes('permission denied')) {
    return 'Permission denied. The TV may require additional permissions for this operation.';
  }

  // Package errors
  if (lowerError.includes('package') && lowerError.includes('not found')) {
    return 'App not found on the TV. It may have been uninstalled or the package name is incorrect.';
  }
  if (lowerError.includes('disable') || lowerError.includes('enable')) {
    return 'Could not change app status. The app might be a system app that cannot be disabled.';
  }

  // Network errors
  if (lowerError.includes('network') || lowerError.includes('wifi')) {
    return 'Network error. Check your Wi-Fi connection and try again.';
  }

  // Default fallback
  return error;
};
