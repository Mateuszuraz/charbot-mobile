import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import ArchiveScreen from './src/screens/ArchiveScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AsciiScreen from './src/screens/AsciiScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ModelSetupScreen from './src/screens/ModelSetupScreen';
import ModelManagerScreen from './src/screens/ModelManagerScreen';
import TabBar from './src/components/TabBar';
import { loadSettings } from './src/services/storage';
import { modelExists } from './src/services/llamaService';
import { Settings, Tab } from './src/types';

type Overlay = 'settings' | 'model-manager' | null;

export default function App() {
  const [ready, setReady]           = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [tab, setTab]               = useState<Tab>('chat');
  const [overlay, setOverlay]       = useState<Overlay>(null);
  const [settings, setSettings]     = useState<Settings>({
    aiMode: 'HYBRID', language: 'AUTO', cleoMode: 'STANDARD', customPrompt: '',
  });

  const [fontsLoaded] = useFonts({
    SpaceMono: require('./assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#0a0a0a' }} />;

  if (!ready) {
    return (
      <>
        <StatusBar style="light" />
        <SplashScreen onDone={async () => {
          const [s, hasModel] = await Promise.all([loadSettings(), modelExists()]);
          setSettings({ aiMode: 'HYBRID', language: 'AUTO', cleoMode: 'STANDARD', customPrompt: '', ...s });
          setNeedsSetup(!hasModel);
          setReady(true);
        }} />
      </>
    );
  }

  if (needsSetup) {
    return (
      <>
        <StatusBar style="light" />
        <ModelSetupScreen onDone={() => setNeedsSetup(false)} />
      </>
    );
  }

  if (overlay === 'model-manager') {
    return (
      <>
        <StatusBar style="light" />
        <ModelManagerScreen onBack={() => setOverlay('settings')} />
      </>
    );
  }

  if (overlay === 'settings') {
    return (
      <>
        <StatusBar style="light" />
        <SettingsScreen
          settings={settings}
          onUpdate={setSettings}
          onBack={() => setOverlay(null)}
          onOpenModelManager={() => setOverlay('model-manager')}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
        <View style={{ flex: 1 }}>
          {tab === 'chat'    && <HomeScreen onOpenSettings={() => setOverlay('settings')} />}
          {tab === 'archive' && <ArchiveScreen />}
          {tab === 'ascii'   && <AsciiScreen />}
          {tab === 'profile' && <ProfileScreen />}
        </View>
        <TabBar activeTab={tab} onTabChange={setTab} />
      </View>
    </>
  );
}
