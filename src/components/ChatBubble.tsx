import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Message } from '../types';

export default function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.wrap, isUser ? styles.wrapUser : styles.wrapCleo]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleCleo]}>
        <Text style={[styles.text, isUser ? styles.textUser : styles.textCleo]}>
          {message.text}
        </Text>
      </View>
      <Text style={styles.meta}>
        {isUser ? 'YOU' : 'CLEO'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:       { marginVertical: 6, maxWidth: '80%' },
  wrapUser:   { alignSelf: 'flex-end', alignItems: 'flex-end' },
  wrapCleo:   { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:     { padding: 12 },
  bubbleUser: { backgroundColor: '#fff' },
  bubbleCleo: { backgroundColor: 'rgba(255,107,0,0.04)', borderWidth: 1, borderColor: 'rgba(255,107,0,0.4)' },
  text:       { fontSize: 13, lineHeight: 20 },
  textUser:   { color: '#0a0a0a', fontFamily: 'SpaceMono' },
  textCleo:   { color: 'rgba(255,255,255,0.85)', fontFamily: 'SpaceMono' },
  meta:       { fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: 'SpaceMono' },
});
