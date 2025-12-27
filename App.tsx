
import React, { useState, useCallback } from 'react';
import useGeminiLive from './hooks/useGeminiLive';
import type { SessionState, TranscriptEntry } from './types';
import { Conversation } from './components/Conversation';
import { ControlPanel } from './components/ControlPanel';
import { Logo } from './components/Logo';

const App: React.FC = () => {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onTranscriptUpdate = useCallback((newEntry: TranscriptEntry) => {
    setTranscript(prev => {
      const lastEntry = prev[prev.length - 1];
      if (lastEntry && lastEntry.speaker === newEntry.speaker && !lastEntry.isFinal) {
        // Update the last entry if it's not final
        const updatedTranscript = [...prev];
        updatedTranscript[prev.length - 1] = newEntry;
        return updatedTranscript;
      } else {
        // Add a new entry
        return [...prev, newEntry];
      }
    });
  }, []);

  const onStateUpdate = useCallback((newState: SessionState) => {
    setSessionState(newState);
    if(newState === 'ERROR') {
      setErrorMessage("Connection failed. Please check your microphone permissions and try again.");
    } else {
      setErrorMessage(null);
    }
  }, []);

  const { startSession, endSession } = useGeminiLive({ onTranscriptUpdate, onStateUpdate });

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
        />
      </footer>
    </div>
  );
};

export default App;
