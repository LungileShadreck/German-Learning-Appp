
import React from 'react';
import type { TranscriptEntry } from '../types';
import { LightbulbIcon } from './Icons';

interface ConversationProps {
  transcript: TranscriptEntry[];
}

export const Conversation: React.FC<ConversationProps> = ({ transcript }) => {
  if (transcript.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center px-4">
        <h2 className="text-2xl font-bold text-gray-200 mb-4">Welcome to Your AI German Tutor!</h2>
        <p className="max-w-md mb-6">
            This is an interactive space to practice your German speaking skills. Your tutor, Klaus, will chat with you, offer corrections, and help you become more fluent.
        </p>

        <div className="w-full max-w-md bg-gray-800 p-4 rounded-lg mb-6 text-left">
            <h3 className="text-lg font-semibold text-gray-200 mb-2 text-center">How it works</h3>
            <ol className="list-decimal list-inside space-y-1">
                <li>Press the blue microphone button below to start.</li>
                <li>When the button turns red, it's listening. Start speaking!</li>
                <li>Klaus will listen and respond to you in German.</li>
                <li>If you make a mistake, a suggestion card will appear to help you.</li>
                <li>Press the red button again anytime to end the session.</li>
            </ol>
        </div>

        <div className="w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-200 mb-3">Try saying one of these to start:</h3>
            <div className="flex flex-wrap justify-center gap-2">
                <span className="bg-gray-700 px-3 py-1 rounded-full text-sm font-mono">Hallo, wie geht's?</span>
                <span className="bg-gray-700 px-3 py-1 rounded-full text-sm font-mono">Wie heißt du?</span>
                <span className="bg-gray-700 px-3 py-1 rounded-full text-sm font-mono">Woher kommst du?</span>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {transcript.map((entry, index) => (
        <div key={index} className={`w-full flex flex-col ${entry.speaker === 'user' ? 'items-end' : 'items-start'}`}>
          <div
            className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${
              entry.speaker === 'user'
                ? 'bg-blue-600 rounded-br-none'
                : 'bg-gray-700 rounded-bl-none'
            } ${entry.isFinal ? 'opacity-100' : 'opacity-60'}`}
          >
            <p className="text-white">{entry.text}</p>
          </div>
          {entry.speaker === 'user' && entry.correction && (
            <div className="mt-2 p-3 rounded-lg bg-yellow-900/50 border border-yellow-700/50 max-w-xs md:max-w-md lg:max-w-lg w-full text-sm">
                <div className="flex items-center gap-2 text-yellow-300 mb-2">
                    <LightbulbIcon />
                    <h4 className="font-bold">Korrekturvorschlag (Suggestion)</h4>
                </div>
                <div className="space-y-2 text-yellow-100">
                    <p><strong className="font-semibold text-yellow-200">Du sagtest (You said):</strong> <em className="opacity-80">"{entry.correction.originalText}"</em></p>
                    <p><strong className="font-semibold text-yellow-200">Besser wäre (Better):</strong> <em className="font-semibold">"{entry.correction.correctedText}"</em></p>
                    <p><strong className="font-semibold text-yellow-200">Erklärung (Explanation):</strong> {entry.correction.explanation}</p>
                </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
