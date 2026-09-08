// Laravel API base — override with EXPO_PUBLIC_API_URL for device/emulator
// Android emulator: 10.0.2.2, real device: your LAN IP (e.g. 192.168.1.5)
// Web: http://localhost:8000 works
export const API_URL =
  (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) ||
  'http://localhost:8000/api';

// For Expo web we need to allow localhost; for production replace with your VPS/railway URL
