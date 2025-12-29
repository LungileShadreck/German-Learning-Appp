
export type SessionState = 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface Correction {
  originalText: string;
  correctedText: string;
  explanation: string;
}

export interface TranscriptEntry {
  speaker: 'user' | 'model';
  text: string;
  isFinal: boolean;
  correction?: Correction;
}
