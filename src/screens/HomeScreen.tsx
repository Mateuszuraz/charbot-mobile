import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, FlatList, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Message, Settings, CleoStatus } from '../types';
import { askCleo, checkOnline } from '../services/ai';
import { modelLoadingState } from '../services/llamaService';
import { loadHistory, saveHistory, loadSettings, saveSettings, saveSession } from '../services/storage';
import { extractFact, saveFact } from '../services/memory';
import { getApiKey } from '../services/apiKeys';
import { useVoice } from '../hooks/useVoice';
import { useWhisper } from '../hooks/useWhisper';
import { useProactive } from '../hooks/useProactive';
import Avatar from '../components/Avatar';
import ChatBubble from '../components/ChatBubble';

type Props = { onOpenSettings: () => void };

export default function HomeScreen({ onOpenSettings }: Props) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [status, setStatus]       = useState<CleoStatus>('idle');
  const [online, setOnline]       = useState(false);
  const [settings, setSettings]   = useState<Settings>({ aiMode: 'HYBRID', language: 'AUTO', cleoMode: 'STANDARD', customPrompt: '' });
  const [cloudKeys, setCloudKeys] = useState<{ geminiKey: string; kimiKey: string; ollamaUrl: string; ollamaModel: string }>({ geminiKey: '', kimiKey: '', ollamaUrl: '', ollamaModel: '' });
  const [recording, setRecording] = useState(false);
  const listRef = useRef<FlatList>(null);
  const micPulse = useRef(new Animated.Value(1)).current;
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;
  const { isSpeaking, speak } = useVoice();
  const { isListening, isTranscribing, startListening, stopListening } = useWhisper();

  const addProactiveMessage = useCallback((text: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      role: 'cleo',
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => {
      const next = [...prev, msg];
      saveHistory(next);
      return next;
    });
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  const { resetTimer } = useProactive(settings.cleoMode, addProactiveMessage, true);

  useEffect(() => {
    (async () => {
      const [hist, sett, net, gKey, kKey, oUrl, oModel] = await Promise.all([
        loadHistory(), loadSettings(), checkOnline(),
        getApiKey('GEMINI'), getApiKey('KIMI'),
        getApiKey('OLLAMA_URL'), getApiKey('OLLAMA_MODEL'),
      ]);
      setMessages(hist);
      setSettings(sett);
      setOnline(net);
      setCloudKeys({ geminiKey: gKey || '', kimiKey: kKey || '', ollamaUrl: oUrl || '', ollamaModel: oModel || '' });
    })();
  }, []);

  useEffect(() => {
    if (!isSpeaking && status === 'speaking') setStatus('idle');
  }, [isSpeaking]);

  // Blinking cursor animation when thinking
  useEffect(() => {
    if (status === 'thinking') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(cursorOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(cursorOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      cursorOpacity.stopAnimation();
      cursorOpacity.setValue(1);
    }
  }, [status]);

  // Mic ripple animation
  useEffect(() => {
    if (recording) {
      const makeRipple = (anim: Animated.Value, delay: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ]),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        );
      Animated.parallel([
        makeRipple(ripple1, 0),
        makeRipple(ripple2, 300),
        makeRipple(ripple3, 600),
      ]).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.15, duration: 350, useNativeDriver: true }),
          Animated.timing(micPulse, { toValue: 1.0, duration: 350, useNativeDriver: true }),
        ])
      ).start();
    } else {
      ripple1.stopAnimation(); ripple1.setValue(0);
      ripple2.stopAnimation(); ripple2.setValue(0);
      ripple3.stopAnimation(); ripple3.setValue(0);
      micPulse.stopAnimation();
      Animated.timing(micPulse, { toValue: 1, duration: 100, useNativeDriver: true }).start();
    }
  }, [recording]);

  const send = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setStatus('thinking');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      // Show loading_model status if llama is initializing for the first time
      if (modelLoadingState === 'idle' || modelLoadingState === 'loading') {
        setStatus('loading_model');
      }

      // Add placeholder message for streaming
      const streamId = (Date.now() + 1).toString();
      const placeholder: Message = { id: streamId, role: 'cleo', text: '', timestamp: Date.now() };
      setMessages([...next, placeholder]);

      let streamedText = '';
      const onToken = (token: string) => {
        streamedText += token;
        setMessages(prev => prev.map(m =>
          m.id === streamId ? { ...m, text: streamedText } : m
        ));
        listRef.current?.scrollToEnd({ animated: false });
      };

      // Reset proactive timer on each message
      resetTimer();

      // Save fact if user is telling CLEO something to remember
      const fact = extractFact(text);
      if (fact) saveFact(fact);

      const { reply, usedCloud } = await askCleo(
        text, next, settings.aiMode, settings.language,
        onToken, settings.cleoMode, settings.customPrompt, cloudKeys,
      );
      setStatus('thinking');
      setOnline(usedCloud);

      // Finalize message (use reply from cloud or accumulated streamedText)
      const finalText = reply || streamedText;
      const cleoMsg: Message = { id: streamId, role: 'cleo', text: finalText, timestamp: Date.now() };
      const final = [...next, cleoMsg];
      setMessages(final);
      saveHistory(final);
      saveSession(final);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

      setStatus('speaking');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const lang = settings.language === 'PL' ? 'pl-PL'
        : settings.language === 'EN' ? 'en-US' : 'pl-PL';
      speak(finalText, lang);
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'cleo',
        text: 'Coś poszło nie tak. Spróbuj ponownie.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
      setStatus('idle');
    }
  }, [messages, settings, speak]);

  const modeColor = online ? '#4CAF50' : '#FF6B00';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>CHARBOT</Text>
          <View style={[styles.modeDot, { backgroundColor: modeColor }]} />
          <Text style={styles.modeText}>{online ? 'CLOUD' : 'LOCAL'}</Text>
        </View>
        <TouchableOpacity onPress={onOpenSettings} style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarArea}>
        <Avatar status={status} />
        <Text style={styles.cleoName}>CLEO</Text>
        {isTranscribing ? (
          <Text style={styles.listeningText}>TRANSCRIBING...</Text>
        ) : status === 'loading_model' ? (
          <Text style={styles.loadingModelText}>LOADING MODEL...</Text>
        ) : status === 'thinking' ? (
          <View style={styles.processingRow}>
            <Text style={styles.processingText}>PROCESSING QUERY</Text>
            <Animated.Text style={[styles.processingCursor, { opacity: cursorOpacity }]}>|</Animated.Text>
          </View>
        ) : status === 'listening' || recording || isListening ? (
          <Text style={styles.listeningText}>LISTENING...</Text>
        ) : status === 'speaking' ? (
          <Text style={styles.speakingText}>SPEAKING...</Text>
        ) : (
          <Text style={styles.idleText}>STANDBY</Text>
        )}
      </View>

      {/* Chat */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        style={styles.chat}
        contentContainerStyle={styles.chatContent}
        ListEmptyComponent={
          <Text style={styles.empty}>— INITIALIZING CLEO —</Text>
        }
      />

      {/* Input bar */}
      <View style={styles.inputBar}>
        {/* Mic with ripple waves */}
        <View style={styles.micWrap}>
          {[ripple1, ripple2, ripple3].map((r, i) => (
            <Animated.View key={i} style={[styles.ripple, {
              opacity: r.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.25, 0] }),
              transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
            }]} />
          ))}
          <Animated.View style={{ transform: [{ scale: micPulse }] }}>
            <TouchableOpacity
              style={[styles.micBtn, (recording || isListening) && styles.micBtnActive]}
              onPressIn={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setRecording(true);
                setStatus('listening');
                startListening(
                  (text) => { setStatus('idle'); send(text); },
                  () => { setStatus('idle'); },
                );
              }}
              onPressOut={() => { setRecording(false); stopListening(); }}
            >
              <Text style={styles.micIcon}>{isTranscribing ? '⏳' : '🎙'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="COMMAND..."
          placeholderTextColor="rgba(255,255,255,0.15)"
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
          editable={status !== 'thinking' && status !== 'speaking'}
        />

        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || status === 'thinking' || status === 'speaking') && styles.sendBtnDisabled]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            send(input);
          }}
          disabled={!input.trim() || status === 'thinking' || status === 'speaking'}
        >
          <Text style={styles.sendIcon}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo:        { fontFamily: 'SpaceMono', color: '#fff', fontSize: 13, letterSpacing: 6 },
  modeDot:     { width: 6, height: 6, borderRadius: 3 },
  modeText:    { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: 2 },
  settingsBtn: { padding: 4 },
  settingsIcon: { color: 'rgba(255,255,255,0.4)', fontSize: 18 },

  avatarArea:      { alignItems: 'center', paddingVertical: 20 },
  cleoName:        { fontFamily: 'SpaceMono', color: '#fff', fontSize: 11, letterSpacing: 8, marginTop: 10 },
  processingRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  processingText:  { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 10, letterSpacing: 2 },
  processingCursor: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 10 },
  listeningText:   { fontFamily: 'SpaceMono', color: '#FF2020', fontSize: 10, letterSpacing: 2, marginTop: 6 },
  speakingText:    { fontFamily: 'SpaceMono', color: '#fff', fontSize: 10, letterSpacing: 2, marginTop: 6 },
  idleText:        { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: 3, marginTop: 6 },
  loadingModelText: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 10, letterSpacing: 2, marginTop: 6 },

  chat:        { flex: 1 },
  chatContent: { padding: 16, paddingBottom: 8 },
  empty: {
    color: 'rgba(255,255,255,0.15)', fontFamily: 'SpaceMono',
    fontSize: 10, letterSpacing: 3, textAlign: 'center', marginTop: 32,
  },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  micWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  ripple: {
    position: 'absolute',
    width: 42, height: 42,
    borderRadius: 21,
    borderWidth: 1, borderColor: '#FF2020',
  },
  micBtn: {
    width: 42, height: 42,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: { borderColor: '#FF2020', backgroundColor: 'rgba(255,32,32,0.08)' },
  micIcon:      { fontSize: 17 },
  input: {
    flex: 1, color: '#fff', fontFamily: 'SpaceMono', fontSize: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.03)',
  },
  sendBtn: {
    width: 42, height: 42, backgroundColor: '#FF6B00',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: 'rgba(255,107,0,0.25)' },
  sendIcon: { color: '#fff', fontSize: 17, fontFamily: 'SpaceMono' },
});
