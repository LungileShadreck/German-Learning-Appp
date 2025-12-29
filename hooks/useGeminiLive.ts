
import { useRef, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type } from '@google/genai';
import { decode, encode, decodeAudioData } from '../utils/audio';
import type { SessionState, TranscriptEntry, Correction } from '../types';

interface UseGeminiLiveProps {
  onTranscriptUpdate: (newEntry: TranscriptEntry) => void;
  onStateUpdate: (newState: SessionState) => void;
  onAudioLevelChange: (level: number) => void;
  onCorrection: (correction: Correction) => void;
}

const SYSTEM_INSTRUCTION = `You are Klaus, a friendly and patient German language tutor. Your goal is to help the user practice conversational German. Always speak in German. Start the conversation by introducing yourself and asking the user how they are. Keep your responses concise and encouraging. If the user makes a grammatical mistake or could phrase something better, you MUST call the 'provideCorrection' function with the original text, the corrected text, and a brief explanation in simple German. In your spoken response, you can then say something like 'Das war fast richtig! Hier ist ein kleiner Tipp für dich.' to draw their attention to the correction. Do not include the correction details in your spoken response; use the function call for that. If the user speaks English, gently guide them back to German.`;

const provideCorrectionFunctionDeclaration: FunctionDeclaration = {
    name: 'provideCorrection',
    description: "Provides a correction for the user's German sentence.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            originalText: {
                type: Type.STRING,
                description: "The original, incorrect text spoken by the user.",
            },
            correctedText: {
                type: Type.STRING,
                description: "The corrected version of the text.",
            },
            explanation: {
                type: Type.STRING,
                description: "A brief explanation in German about why the correction is needed.",
            },
        },
        required: ['originalText', 'correctedText', 'explanation'],
    },
};


const useGeminiLive = ({ onTranscriptUpdate, onStateUpdate, onAudioLevelChange, onCorrection }: UseGeminiLiveProps) => {
  const sessionRef = useRef<LiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const startSession = useCallback(async () => {
    onStateUpdate('CONNECTING');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [provideCorrectionFunctionDeclaration] }],
        },
        callbacks: {
          onopen: () => {
            onStateUpdate('CONNECTED');
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                  if (fc.name === 'provideCorrection') {
                      onCorrection(fc.args as Correction);
                      sessionPromise.then(session => {
                        session.sendToolResponse({
                          functionResponses: {
                              id: fc.id,
                              name: fc.name,
                              response: { result: 'Correction displayed.' },
                          }
                        });
                      });
                  }
              }
            }

            if (message.serverContent?.inputTranscription) {
              const { text, isFinal } = message.serverContent.inputTranscription;
              currentInputTranscriptionRef.current += text;
              onTranscriptUpdate({ speaker: 'user', text: currentInputTranscriptionRef.current, isFinal });
            }

            if (message.serverContent?.outputTranscription) {
              const { text, isFinal } = message.serverContent.outputTranscription;
              currentOutputTranscriptionRef.current += text;
              onTranscriptUpdate({ speaker: 'model', text: currentOutputTranscriptionRef.current, isFinal });
            }

            if (message.serverContent?.turnComplete) {
              // Finalize user turn
              if (currentInputTranscriptionRef.current) {
                 onTranscriptUpdate({ speaker: 'user', text: currentInputTranscriptionRef.current, isFinal: true });
              }
               // Finalize model turn
              if(currentOutputTranscriptionRef.current) {
                 onTranscriptUpdate({ speaker: 'model', text: currentOutputTranscriptionRef.current, isFinal: true });
              }
              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const outputAudioContext = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);

              const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              
              source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(source => source.stop());
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
             onStateUpdate('DISCONNECTED');
          },
          onerror: (e: Error) => {
            console.error('Session error:', e);
            onStateUpdate('ERROR');
            endSession();
          },
        },
      });

      sessionRef.current = await sessionPromise;
      
      // Setup audio input
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
      scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
      
      scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

        // Calculate audio level (RMS) and pass it up
        let sumSquares = 0.0;
        for (const sample of inputData) {
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        onAudioLevelChange(rms);
        
        const l = inputData.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
          int16[i] = inputData[i] * 32768;
        }
        const pcmBlob: Blob = {
          data: encode(new Uint8Array(int16.buffer)),
          mimeType: 'audio/pcm;rate=16000',
        };
        sessionPromise.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      };
      mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);

    } catch (err) {
      console.error('Failed to start session:', err);
      onStateUpdate('ERROR');
    }
  }, [onStateUpdate, onTranscriptUpdate, onAudioLevelChange, onCorrection]);

  const endSession = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;

    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    
    scriptProcessorRef.current?.disconnect();
    scriptProcessorRef.current = null;
    
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamSourceRef.current = null;

    inputAudioContextRef.current?.close();
    inputAudioContextRef.current = null;
    
    outputAudioContextRef.current?.close();
    outputAudioContextRef.current = null;

    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();

    nextStartTimeRef.current = 0;
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

    onStateUpdate('DISCONNECTED');
  }, [onStateUpdate]);

  return { startSession, endSession };
};

export default useGeminiLive;
