import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.connectops.now',
  appName: 'Connect Ops Now',
  webDir: 'dist',
  server: {
    url: 'https://phone.stproperties.com',
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f0f23',
      showSpinner: false,
    },
  },
};

export default config;
