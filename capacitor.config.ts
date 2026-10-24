import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fotobust.ai',
  appName: 'FotoBust AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#1a1416',
  },
  android: {
    backgroundColor: '#1a1416',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Share: {
      pasteboardType: 'urlAndText',
    },
  },
};

export default config;
