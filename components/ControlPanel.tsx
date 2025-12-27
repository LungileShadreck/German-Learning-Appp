
import React from 'react';
import type { SessionState } from '../types';
import { MicIcon, ConnectingIcon, ListeningIcon, SpeakingIcon, StopIcon } from './Icons';

interface ControlPanelProps {
  sessionState: SessionState;
  onToggleSession: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ sessionState, onToggleSession }) => {
  const getButtonContent = () => {
    switch (sessionState) {
      case 'CONNECTING':
        return {
          icon: <ConnectingIcon />,
          text: 'Connecting...',
          bgColor: 'bg-yellow-500',
          disabled: true,
        };
      case 'CONNECTED':
        return {
          icon: <ListeningIcon />,
          text: 'Listening...',
          bgColor: 'bg-red-600',
          disabled: false,
        };
      case 'DISCONNECTED':
      case 'IDLE':
      case 'ERROR':
        return {
          icon: <MicIcon />,
          text: 'Start Speaking',
          bgColor: 'bg-blue-600 hover:bg-blue-700',
          disabled: false,
        };
      default:
        return {
          icon: <MicIcon />,
          text: 'Start',
          bgColor: 'bg-gray-500',
          disabled: true,
        };
    }
  };

  const { icon, text, bgColor, disabled } = getButtonContent();

  const getStatusText = () => {
    switch (sessionState) {
        case 'IDLE': return "Ready to learn German?";
        case 'CONNECTING': return "Connecting to Klaus...";
        case 'CONNECTED': return "Your turn to speak.";
        case 'DISCONNECTED': return "Session ended.";
        case 'ERROR': return "Connection error.";
        default: return "";
    }
  }

  return (
    <div className="flex flex-col items-center space-y-3">
        <p className="text-gray-400 h-6">{getStatusText()}</p>
        <button
            onClick={onToggleSession}
            disabled={disabled}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${bgColor} ${disabled ? 'cursor-not-allowed opacity-70' : ''}
            ${sessionState === 'CONNECTED' ? 'focus:ring-red-400' : 'focus:ring-blue-400'}
            `}
            aria-label={text}
        >
            {sessionState === 'CONNECTED' ? <StopIcon /> : icon}
        </button>
    </div>
  );
};
