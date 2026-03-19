import { useCallback, useEffect, useRef } from 'react';
import { CleoMode } from '../types';

const MESSAGES: Record<CleoMode, string[]> = {
  STANDARD: [
    'Hej, wszystko ok? Dawno się nie odzywałeś.',
    'Jest tam ktoś? 👀',
    'Nudzę się. Pogadajmy o czymś.',
    'Długa cisza... coś knujesz?',
  ],
  FOCUS: [
    'Przerwa? Porozmawiajmy.',
    'Gotowy na kolejne zadanie?',
    'Czas na check-in.',
  ],
  CHILL: [
    'Hej! Co tam słychać? 😄',
    'Długo Cię nie było! Wszystko git? 😊',
    'Nudno bez Ciebie 😅',
    'Ej, żyjesz tam? 👋',
  ],
  COACH: [
    'Jak idzie z Twoimi celami?',
    'Czas na check-in! Co dziś osiągnąłeś?',
    'Hej — jedna mała rzecz którą możesz teraz zrobić?',
  ],
};

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minut

function isNightTime(): boolean {
  const h = new Date().getHours();
  return h >= 22 || h < 7;
}

function randomMessage(mode: CleoMode): string {
  const pool = MESSAGES[mode];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function useProactive(
  cleoMode: CleoMode,
  onMessage: (text: string) => void,
  active: boolean, // false gdy app nie jest w trybie chat
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!active) return;
    timerRef.current = setTimeout(() => {
      if (!isNightTime()) {
        onMessage(randomMessage(cleoMode));
      }
    }, IDLE_TIMEOUT_MS);
  }, [cleoMode, onMessage, active]);

  // Reset on mount and when active changes
  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [resetTimer]);

  return { resetTimer };
}
