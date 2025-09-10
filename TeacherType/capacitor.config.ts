import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.AbleNest',
  appName: 'Globalytix',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;
