
import React from 'react';
import type { TranscriptEntry } from '../types';

interface ConversationProps {
  transcript: TranscriptEntry[];
}

export const Conversation: React.FC<ConversationProps> = ({ transcript }) => {
  if (transcript.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-lg">Drücken Sie die Mikrofontaste, um mit dem Üben zu beginnen.</p>
        <p className="mt-2 text-sm">(Press the microphone button to start practicing.)</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-2">
      {transcript.map((entry, index) => (
        <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${
              entry.speaker === 'user'
                ? 'bg-blue-600 rounded-br-none'
                : 'bg-gray-700 rounded-bl-none'
            } ${entry.isFinal ? 'opacity-100' : 'opacity-60'}`}
          >
            <p className="text-white">{entry.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
