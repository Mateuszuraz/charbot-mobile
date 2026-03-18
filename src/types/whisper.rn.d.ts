declare module 'whisper.rn' {
  export {
    WhisperContext,
    initWhisper,
    releaseAllWhisper,
  } from 'whisper.rn/lib/typescript/index';
  export type {
    ContextOptions,
    TranscribeOptions,
    TranscribeResult,
    TranscribeRealtimeOptions,
    TranscribeRealtimeEvent,
  } from 'whisper.rn/lib/typescript/index';
}
