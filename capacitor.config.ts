import { CapacitorConfig } from '@capacitor/cli'

const server = {
  url: 'http://192.168.1.107:5757/',
  cleartext: true,
}

const config: CapacitorConfig = {
  appId: 'com.fruitkingdom.app',
  appName: 'Fruit Orders',
  webDir: 'dist',
  ios: {
    // iOS için ayarlar
    backgroundColor: '#000000',
    webContentsDebuggingEnabled: true,
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },
  android: {
    // Android için ayarlar
    backgroundColor: '#000000',
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: null,
    },
    CapacitorWebView: {
      acceleratedRendering: true,
      scrollingEnabled: true,
    },
    NativeAudio: {
      fade: true,
      focus: false, // Arkaplana geçtiğinde müziğin durmaması için false
    },
  },
  // server,
}

export default config
