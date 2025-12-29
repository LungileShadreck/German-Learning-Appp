
import React, { useState, useCallback } from 'react';
import useGeminiLive from './hooks/useGeminiLive';
import type { SessionState, TranscriptEntry, Correction } from './types';
import { Conversation } from './components/Conversation';
import { ControlPanel } from './components/ControlPanel';
import { Logo } from './components/Logo';

const App: React.FC = () => {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const onTranscriptUpdate = useCallback((newEntry: TranscriptEntry) => {
    setTranscript(prev => {
      const lastEntry = prev[prev.length - 1];
      if (lastEntry && lastEntry.speaker === newEntry.speaker && !lastEntry.isFinal) {
        // Update the last entry if it's not final
        const updatedTranscript = [...prev];
        updatedTranscript[prev.length - 1] = { ...updatedTranscript[prev.length - 1], text: newEntry.text, isFinal: newEntry.isFinal };
        return updatedTranscript;
      } else {
        // Add a new entry
        return [...prev, newEntry];
      }
    });
  }, []);

   const handleCorrection = useCallback((correction: Correction) => {
    setTranscript(prev => {
      const transcriptCopy = [...prev];
      // Apply correction to the last final user entry
      // FIX: Replaced `findLastIndex` with a backward loop for broader compatibility.
      let userEntryIndex = -1;
      for (let i = transcriptCopy.length - 1; i >= 0; i--) {
        const entry = transcriptCopy[i];
        if (entry.speaker === 'user' && entry.isFinal) {
          userEntryIndex = i;
          break;
        }
      }

      if (userEntryIndex !== -1) {
        // To avoid re-applying, check if a correction already exists
        if (!transcriptCopy[userEntryIndex].correction) {
            transcriptCopy[userEntryIndex] = {
                ...transcriptCopy[userEntryIndex],
                correction,
            };
            return transcriptCopy;
        }
      }
      return prev;
    });
  }, []);

  const onStateUpdate = useCallback((newState: SessionState) => {
    setSessionState(newState);
    if(newState === 'ERROR') {
      setErrorMessage("Connection failed. Please check your microphone permissions and try again.");
    } else {
      setErrorMessage(null);
    }
     if (newState !== 'CONNECTED') {
      setAudioLevel(0);
    }
  }, []);

  const onAudioLevelChange = useCallback((level: number) => {
    setAudioLevel(level);
  }, []);

  const { startSession, endSession } = useGeminiLive({ onTranscriptUpdate, onStateUpdate, onAudioLevelChange, onCorrection: handleCorrection });

  const handleToggleSession = () => {
    if (sessionState === 'IDLE' || sessionState === 'DISCONNECTED' || sessionState === 'ERROR') {
      setTranscript([]);
      setErrorMessage(null);
      startSession();
    } else {
      endSession();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-between font-sans p-4">
      <header className="w-full max-w-3xl mx-auto flex items-center justify-center py-4">
        <Logo />
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-200 ml-4">German Language Tutor</h1>
      </header>

      <main className="flex-grow w-full max-w-3xl mx-auto flex flex-col justify-center items-center p-4">
        <div className="w-full flex-grow overflow-y-auto mb-4" style={{maxHeight: 'calc(100vh - 250px)'}}>
          <Conversation transcript={transcript} />
        </div>
      </main>

      <footer className="w-full sticky bottom-0 left-0 bg-gray-900/80 backdrop-blur-sm pb-4 pt-2">
        {errorMessage && (
            <div className="text-center text-red-400 mb-2">{errorMessage}</div>
        )}
        <ControlPanel
          sessionState={sessionState}
          onToggleSession={handleToggleSession}
          audioLevel={audioLevel}
        />
      </footer>
    </div>
  );
};

export default App;