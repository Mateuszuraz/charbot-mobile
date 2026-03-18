import React, { useEffect, useState } from 'react';
import {
  FlatList, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Session } from '../types';
import { loadSessions } from '../services/storage';

type Props = { onOpenSession?: (session: Session) => void };

function formatDate(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  const hr = String(d.getHours()).padStart(2, '0');
  const mn = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${mon} ${hr}:${mn}`;
}

export default function ArchiveScreen({ onOpenSession }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    loadSessions().then(setSessions);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ARCHIVE</Text>
        <Text style={styles.count}>{sessions.length} SESSIONS</Text>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>— NO SESSIONS RECORDED —</Text>
          <Text style={styles.emptyHint}>Conversations appear here after you chat with CLEO.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={s => s.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => onOpenSession?.(item)}
              activeOpacity={0.7}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.sessionId}>{item.id}</Text>
                <Text style={styles.date}>{formatDate(item.date)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.preview} numberOfLines={1}>{item.preview}</Text>
                <Text style={styles.msgCount}>{item.messages.length} MSG</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  title:  { fontFamily: 'SpaceMono', color: '#fff', fontSize: 14, letterSpacing: 5 },
  count:  { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 2 },

  list:   { padding: 16 },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 2,
  },
  rowLeft:  { gap: 4 },
  rowRight: { flex: 1, alignItems: 'flex-end', gap: 4, marginLeft: 12 },

  sessionId: { fontFamily: 'SpaceMono', color: '#FF6B00', fontSize: 12, letterSpacing: 2 },
  date:      { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: 1 },
  preview:   { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.55)', fontSize: 10, letterSpacing: 1 },
  msgCount:  { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.2)', fontSize: 9, letterSpacing: 1 },

  sep: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  empty:     { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.15)', fontSize: 10, letterSpacing: 3 },
  emptyHint: { fontFamily: 'SpaceMono', color: 'rgba(255,255,255,0.1)', fontSize: 9, letterSpacing: 1, textAlign: 'center' },
});
