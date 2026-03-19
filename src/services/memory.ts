import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('cleo_memory.db');

db.execSync(`
  CREATE TABLE IF NOT EXISTS facts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

const PATTERNS = [
  /pamiętaj (?:że |sobie |to )?[,:]?\s*(.+)/i,
  /remember (?:that\s+)?(.+)/i,
  /mam na imię\s+(\S+)/i,
  /my name is\s+(\S+)/i,
  /jestem\s+(.+)/i,
  /i(?:'m| am)\s+(.+)/i,
  /lubię\s+(.+)/i,
  /i like\s+(.+)/i,
  /nie lubię\s+(.+)/i,
  /i (?:don't|dont) like\s+(.+)/i,
  /pracuję\s+(.+)/i,
  /i work\s+(.+)/i,
  /mieszkam\s+(.+)/i,
  /i live\s+(.+)/i,
];

export function extractFact(text: string): string | null {
  for (const p of PATTERNS) {
    if (p.test(text)) return text.trim();
  }
  return null;
}

export function saveFact(value: string): void {
  try {
    db.runSync(
      'INSERT INTO facts (value, created_at) VALUES (?, ?)',
      [value, Date.now()],
    );
  } catch {}
}

export function loadFacts(): string[] {
  try {
    return db
      .getAllSync<{ value: string }>('SELECT value FROM facts ORDER BY created_at DESC LIMIT 20')
      .map(r => r.value);
  } catch {
    return [];
  }
}

export function clearFacts(): void {
  try {
    db.runSync('DELETE FROM facts');
  } catch {}
}
