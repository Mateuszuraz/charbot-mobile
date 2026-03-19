import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { saveAscii, loadAsciiHistory, deleteAscii, AsciiEntry } from '../services/asciiHistory';

type Mode = 'camera' | 'gallery' | 'history';

const ASCII_HTML = `<!DOCTYPE html><html><body style="margin:0;background:#000;">
<canvas id="c" style="display:none"></canvas>
<script>
function toAscii(b64, w, h) {
  const chars = ' .,:;i1tfLCG08@#';
  const img = new Image();
  img.onload = function() {
    const c = document.getElementById('c');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    let out = '';
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const lum = (0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2]) / 255;
        out += chars[Math.floor(lum * (chars.length - 1))];
      }
      if (y < h-1) out += '\\n';
    }
    window.ReactNativeWebView.postMessage(out);
  };
  img.src = 'data:image/jpeg;base64,' + b64;
}
window.addEventListener('message', function(e) {
  const d = JSON.parse(e.data);
  toAscii(d.b64, d.w, d.h);
});
document.addEventListener('message', function(e) {
  const d = JSON.parse(e.data);
  toAscii(d.b64, d.w, d.h);
});
</script></body></html>`;

const ASCII_W = 80;
const ASCII_H = 36;
const FONT_SIZE = 4.5;

export default function AsciiScreen() {
  const [mode, setMode] = useState<Mode>('camera');
  const [asciiText, setAsciiText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [history, setHistory] = useState<AsciiEntry[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const webviewRef = useRef<WebView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  useEffect(() => {
    if (mode === 'history') loadAsciiHistory().then(setHistory);
  }, [mode]);

  const processBase64 = useCallback((b64: string) => {
    webviewRef.current?.postMessage(JSON.stringify({ b64, w: ASCII_W, h: ASCII_H }));
  }, []);

  const startCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setCameraOn(true);
    intervalRef.current = setInterval(async () => {
      if (!cameraRef.current) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.05, skipProcessing: true,
        });
        if (photo?.base64) processBase64(photo.base64);
      } catch {}
    }, 400);
  };

  const stopCamera = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setCameraOn(false);
    setAsciiText('');
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], base64: true, quality: 0.2,
    });
    if (res.canceled || !res.assets[0]?.base64) return;
    setProcessing(true);
    processBase64(res.assets[0].base64);
  };

  const shareAscii = async () => {
    if (!asciiText) return;
    const path = `${FileSystem.cacheDirectory}ascii_art.txt`;
    await FileSystem.writeAsStringAsync(path, asciiText);
    await Sharing.shareAsync(path, { mimeType: 'text/plain' });
  };

  const saveToHistory = async () => {
    if (!asciiText) return;
    await saveAscii(asciiText);
    Alert.alert('Saved', 'ASCII art saved to history.');
  };

  const removeFromHistory = async (id: string) => {
    await deleteAscii(id);
    setHistory(prev => prev.filter(e => e.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Hidden WebView for pixel processing */}
      <WebView
        ref={webviewRef}
        style={styles.hidden}
        source={{ html: ASCII_HTML }}
        onMessage={e => {
          setAsciiText(e.nativeEvent.data);
          setProcessing(false);
        }}
        javaScriptEnabled
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ASCII</Text>
        <View style={styles.tabs}>
          {([
            { id: 'camera',  label: 'CAM' },
            { id: 'gallery', label: 'IMG' },
            { id: 'history', label: 'HIST' },
          ] as { id: Mode; label: string }[]).map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.tab, mode === m.id && styles.tabActive]}
              onPress={() => { if (cameraOn) stopCamera(); setMode(m.id); setAsciiText(''); }}
            >
              <Text style={[styles.tabText, mode === m.id && styles.tabTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Camera preview (hidden, captures frames) */}
      {mode === 'camera' && cameraOn && (
        <View style={styles.cameraHidden}>
          <CameraView ref={cameraRef} style={styles.cameraView} facing="back" />
        </View>
      )}

      {/* History mode */}
      {mode === 'history' ? (
        <FlatList
          data={history}
          keyExtractor={e => e.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          ListEmptyComponent={<Text style={styles.placeholder}>— BRAK ZAPISÓW —</Text>}
          renderItem={({ item }) => (
            <View style={styles.histCard}>
              <Text style={styles.histDate}>
                {new Date(item.createdAt).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.ascii} numberOfLines={8}>{item.text}</Text>
              <View style={styles.histActions}>
                <TouchableOpacity style={styles.btnShare} onPress={async () => {
                  const path = `${FileSystem.cacheDirectory}ascii_art.txt`;
                  await FileSystem.writeAsStringAsync(path, item.text);
                  await Sharing.shareAsync(path, { mimeType: 'text/plain' });
                }}>
                  <Text style={styles.btnText}>↑ SHARE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDanger} onPress={() => removeFromHistory(item.id)}>
                  <Text style={styles.btnText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      ) : (
        <>
          {/* ASCII output */}
          <ScrollView style={styles.asciiScroll} horizontal>
            <ScrollView>
              {asciiText ? (
                <Text style={styles.ascii} selectable>{asciiText}</Text>
              ) : (
                <Text style={styles.placeholder}>
                  {mode === 'camera' ? '— NACIŚNIJ START —' : '— WYBIERZ ZDJĘCIE —'}
                </Text>
              )}
            </ScrollView>
          </ScrollView>

          {/* Controls */}
          <View style={styles.controls}>
            {mode === 'camera' ? (
              <TouchableOpacity
                style={[styles.btn, cameraOn && styles.btnStop]}
                onPress={cameraOn ? stopCamera : startCamera}
              >
                <Text style={styles.btnText}>{cameraOn ? '■ STOP' : '▶ START'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.btn} onPress={pickImage}>
                <Text style={styles.btnText}>{processing ? 'PROCESSING...' : '+ WYBIERZ'}</Text>
              </TouchableOpacity>
            )}
            {asciiText && (
              <>
                <TouchableOpacity style={styles.btnShare} onPress={saveToHistory}>
                  <Text style={styles.btnText}>💾</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnShare} onPress={shareAscii}>
                  <Text style={styles.btnText}>↑</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0a0a0a' },
  hidden:       { width: 0, height: 0, position: 'absolute' },
  cameraHidden: { width: 1, height: 1, position: 'absolute', opacity: 0 },
  cameraView:   { width: 320, height: 240 },

  header: {
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    gap: 14,
  },
  title: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 18, letterSpacing: 8 },
  tabs:  { flexDirection: 'row', gap: 8 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  tabActive:     { borderColor: '#FF6B00', backgroundColor: 'rgba(255,107,0,0.1)' },
  tabText:       { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 3 },
  tabTextActive: { color: '#FF6B00' },

  asciiScroll: { flex: 1, padding: 8 },
  ascii: {
    fontFamily: 'SpaceMono',
    fontSize: FONT_SIZE,
    color: '#FF6B00',
    lineHeight: FONT_SIZE * 1.2,
    letterSpacing: 0,
  },
  placeholder: {
    fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.15)',
    fontSize: 10, letterSpacing: 3,
    marginTop: 80, textAlign: 'center',
  },

  controls: {
    flexDirection: 'row', gap: 8, padding: 12,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  btn: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#FF6B00',
  },
  btnStop:  { borderColor: '#FF2020', backgroundColor: 'rgba(255,32,32,0.08)' },
  btnShare: {
    paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  btnDanger: {
    paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,32,32,0.4)',
  },
  btnText: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 10, letterSpacing: 3 },

  histCard:    { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 10, gap: 8 },
  histDate:    { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 2 },
  histActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
});
