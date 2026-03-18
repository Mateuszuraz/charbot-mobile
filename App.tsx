import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { View } from 'react-native';
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import ArchiveScreen from './src/screens/ArchiveScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ModelSetupScreen from './src/screens/ModelSetupScreen';
import TabBar from './src/components/TabBar';
import { loadSettings } from './src/services/storage';
import { modelExists } from './src/services/llamaService';
import { Settings, Tab } from './src/types';

export default function App() {
  const [ready, setReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>({ aiMode: 'HYBRID', language: 'AUTO' });

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
          setSettings(s);
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

  if (showSettings) {
    return (
      <>
        <StatusBar style="light" />
        <SettingsScreen
          settings={settings}
          onUpdate={setSettings}
          onBack={() => setShowSettings(false)}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
        <View style={{ flex: 1 }}>
          {tab === 'chat' && (
            <HomeScreen onOpenSettings={() => setShowSettings(true)} />
          )}
          {tab === 'archive' && <ArchiveScreen />}
          {tab === 'profile' && <ProfileScreen />}
        </View>
        <TabBar activeTab={tab} onTabChange={setTab} />
      </View>
    </>
  );
}
