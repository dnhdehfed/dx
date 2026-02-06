import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yohi.voiceassistant',
  appName: 'Yo-Hi Assistant',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
