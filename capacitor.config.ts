import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.preview',
  appName: 'preview_scanner',
  webDir: 'www',
  plugins: {
    BarcodeScanner: {
      android: {
        showBackground: false, // ✅ Ensures the WebView is transparent
      },
    },
  },
};

export default config;
