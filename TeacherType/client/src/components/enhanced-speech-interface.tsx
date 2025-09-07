import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Mic, MicOff, RotateCcw, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { postJsonStrict } from "@/lib/api";
import { tts } from "@/lib/api";
import { LANGS } from "@shared/languageCatalog";
import { AppNavigation } from "@/components/ui/navigation";
import { PageShell } from "@/components/ui/design-system";

type RecordingState = 'idle' | 'listening' | 'translating' | 'done' | 'error';
type PlaybackSpeed = 'slow' | 'normal';

interface MessageBubble {
  type: 'student' | 'english';
  text: string;
  language?: string;
  timestamp: number;
}

// Country flag emoji mapping
const FLAG_MAP: Record<string, string> = {
  'es': '🇪🇸', 'fr': '🇫🇷', 'ar': '🇸🇦', 'fa': '🇮🇷', 'ru': '🇷🇺',
  'zh': '🇨🇳', 'it': '🇮🇹', 'pt': '🇵🇹', 'nl': '🇳🇱', 'tr': '🇹🇷',
  'da': '🇩🇰', 'lv': '🇱🇻', 'en': '🇺🇸', 'de': '🇩🇪', 'ja': '🇯🇵'
};

// Native language names for authentic display
const NATIVE_LANG_NAMES: Record<string, string> = {
  'es-ES': 'Español', 'fr-FR': 'Français', 'ar-SA': 'العربية', 'fa-IR': 'فارسی',
  'ru-RU': 'Русский', 'zh-CN': '中文', 'it-IT': 'Italiano', 'pt-PT': 'Português',
  'nl-NL': 'Nederlands', 'tr-TR': 'Türkçe', 'da-DK': 'Dansk', 'lv-LV': 'Latviešu',
  'en-US': 'English', 'de-DE': 'Deutsch', 'ja-JP': '日本語'
};

export function EnhancedSpeechInterface() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [currentMessage, setCurrentMessage] = useState<MessageBubble | null>(null);
  const [previousMessage, setPreviousMessage] = useState<MessageBubble | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>('normal');
  const [englishAudioBlob, setEnglishAudioBlob] = useState<Blob | null>(null);
  const [isPlayingEnglish, setIsPlayingEnglish] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  // Auto-retry failed recordings
  const scheduleRetry = () => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = setTimeout(() => {
      setRecordingState('idle');
      toast({
        title: "Ready to try again",
        description: "Tap the mic button when you're ready to record."
      });
    }, 2000);
  };

  // Replace current message with fade animation
  const replaceMessage = (newMessage: MessageBubble) => {
    if (currentMessage) {
      setPreviousMessage(currentMessage);
      setFadeOut(true);
      setTimeout(() => {
        setFadeOut(false);
        setPreviousMessage(null);
      }, 300); // Fade out animation duration
    }
    setCurrentMessage(newMessage);
  };

  // Get state indicator
  const getStateIndicator = () => {
    switch (recordingState) {
      case 'listening':
        return { icon: '🎙️', text: 'Listening…', color: 'text-red-600' };
      case 'translating':
        return { icon: '⏳', text: 'Translating…', color: 'text-yellow-600' };
      case 'done':
        return { icon: '✅', text: 'Done', color: 'text-green-600' };
      case 'error':
        return { icon: '❌', text: 'Try Again', color: 'text-red-600' };
      default:
        return { icon: '👂', text: 'Ready to Listen', color: 'text-gray-600' };
    }
  };

  // Format detected language display
  const formatLanguageDisplay = (langCode: string): string => {
    const shortCode = langCode.split('-')[0];
    const flag = FLAG_MAP[shortCode] || '🌍';
    const name = NATIVE_LANG_NAMES[langCode] || langCode;
    return `🌍 ${name} ${flag}`;
  };

  // Audio processing utilities
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const targetSampleRate = 16000;
    const ratio = buffer.sampleRate / targetSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    
    const arrayBuffer = new ArrayBuffer(44 + newLength * 2);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + newLength * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, targetSampleRate, true);
    view.setUint32(28, targetSampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, newLength * 2, true);

    // Downsample and trim silence
    const channelData = buffer.getChannelData(0);
    const threshold = 0.01; // Silence threshold
    
    // Find start and end of actual audio (trim silence)
    let start = 0, end = newLength - 1;
    for (let i = 0; i < newLength; i++) {
      const sourceIndex = Math.round(i * ratio);
      if (Math.abs(channelData[sourceIndex] || 0) > threshold) {
        start = i;
        break;
      }
    }
    for (let i = newLength - 1; i >= 0; i--) {
      const sourceIndex = Math.round(i * ratio);
      if (Math.abs(channelData[sourceIndex] || 0) > threshold) {
        end = i;
        break;
      }
    }

    let offset = 44;
    for (let i = start; i <= end; i++) {
      const sourceIndex = Math.round(i * ratio);
      const sample = Math.max(-1, Math.min(1, channelData[sourceIndex] || 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return arrayBuffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Process recorded audio
  const processRecordedAudio = async (audioBlob: Blob) => {
    try {
      setRecordingState('translating');
      
      // Convert to WAV with silence trimming
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const wavBuffer = audioBufferToWav(audioBuffer);
      const base64Audio = arrayBufferToBase64(wavBuffer);

      // Send to STT with auto-detection
      const sttResponse = await postJsonStrict('/stt', {
        audioData: `data:audio/wav;base64,${base64Audio}`,
        language: 'auto'
      });

      if (sttResponse.text && sttResponse.text.trim()) {
        // Replace message with student speech (blue bubble)
        replaceMessage({
          type: 'student',
          text: sttResponse.text,
          language: sttResponse.detectedLanguage,
          timestamp: Date.now()
        });

        // Translate to English using the new API format
        const requestBody = {
          text: sttResponse.text,
          targetLangs: ['en'],
          from: sttResponse.detectedLanguage?.split('-')[0] // Use the detected language code
        };
        console.log('Enhanced Speech: Sending translation request:', requestBody);
        
        const translateResponse = await postJsonStrict('/translate', requestBody);
        console.log('Enhanced Speech: Translation response:', translateResponse);

        const englishText = translateResponse.translations[0]?.text || "Translation failed";
        
        // Generate English audio
        const englishVoice = 'en-US-JennyNeural';
        const englishBlob = await tts(englishText, englishVoice, 'en-US');
        setEnglishAudioBlob(englishBlob);

        // Replace with English translation (green bubble)
        setTimeout(() => {
          replaceMessage({
            type: 'english',
            text: englishText,
            language: sttResponse.detectedLanguage,
            timestamp: Date.now()
          });
          setRecordingState('done');
        }, 800);

      } else {
        setRecordingState('error');
        toast({
          title: "Couldn't detect speech",
          description: "Try speaking louder or closer to the microphone.",
          variant: "destructive"
        });
        scheduleRetry();
      }

    } catch (error) {
      console.error('Processing error:', error);
      setRecordingState('error');
      toast({
        title: "Something went wrong",
        description: "Please try recording again.",
        variant: "destructive"
      });
      scheduleRetry();
    }
  };

  // Start recording
  const startRecording = async () => {
    if (recordingState !== 'idle') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = recorder;
      setRecordingState('listening');
      recorder.start();

      // Auto-stop after 4 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 4000);

    } catch (error) {
      console.error('Recording failed:', error);
      setRecordingState('error');
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access and try again.",
        variant: "destructive"
      });
      scheduleRetry();
    }
  };

  // Stop recording manually
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // Play English audio with speed control
  const playEnglishAudio = async () => {
    if (!englishAudioBlob) return;

    try {
      setIsPlayingEnglish(true);
      const audioUrl = URL.createObjectURL(englishAudioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.playbackRate = playbackSpeed === 'slow' ? 0.75 : 1.0;
        await audioRef.current.play();
      }
    } catch (error) {
      toast({
        title: "Playback failed",
        description: "Unable to play audio.",
        variant: "destructive"
      });
    } finally {
      setIsPlayingEnglish(false);
    }
  };

  // Reset to idle state
  const resetToIdle = () => {
    setRecordingState('idle');
    setCurrentMessage(null);
    setPreviousMessage(null);
    setEnglishAudioBlob(null);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  };

  const stateIndicator = getStateIndicator();

  return (
    <PageShell>
      <AppNavigation />
      <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* State Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-4xl mb-2">{stateIndicator.icon}</div>
            <div className={`text-xl font-semibold ${stateIndicator.color}`}>
              {stateIndicator.text}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Display Area */}
      <div className="min-h-32 relative">
        {/* Previous message (fading out) */}
        {previousMessage && (
          <div className={`absolute inset-0 transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
            <MessageBubble message={previousMessage} />
          </div>
        )}
        
        {/* Current message */}
        {currentMessage && !previousMessage && (
          <div className="transition-all duration-300 ease-in-out">
            <MessageBubble message={currentMessage} />
          </div>
        )}
        
        {/* Empty state */}
        {!currentMessage && !previousMessage && (
          <div className="text-center text-gray-500 py-8">
            <p>Tap the microphone to start listening</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {/* Record Button */}
        <div className="flex justify-center">
          <Button
            onClick={recordingState === 'listening' ? stopRecording : startRecording}
            disabled={recordingState === 'translating'}
            className={`w-20 h-20 rounded-full p-0 text-white text-xl transition-all duration-200 ${
              recordingState === 'listening' 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : recordingState === 'translating'
                ? 'bg-yellow-500 cursor-not-allowed'
                : recordingState === 'error'
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
            data-testid="button-record-main"
          >
            {recordingState === 'listening' ? <MicOff /> : <Mic />}
          </Button>
        </div>

        {/* English Audio Controls */}
        {currentMessage?.type === 'english' && englishAudioBlob && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={playEnglishAudio}
                    disabled={isPlayingEnglish}
                    size="sm"
                    className="gap-2"
                    data-testid="button-play-english"
                  >
                    <Volume2 className="w-4 h-4" />
                    {isPlayingEnglish ? 'Playing...' : 'Play English'}
                  </Button>
                  
                  <Select value={playbackSpeed} onValueChange={(value: PlaybackSpeed) => setPlaybackSpeed(value)}>
                    <SelectTrigger className="w-24" data-testid="select-speed">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Slow</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={resetToIdle}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  data-testid="button-reset"
                >
                  <RotateCcw className="w-4 h-4" />
                  New Recording
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <audio ref={audioRef} onEnded={() => setIsPlayingEnglish(false)} />
      </div>
    </PageShell>
  );
}

// Message Bubble Component
function MessageBubble({ message }: { message: MessageBubble }) {
  const isStudent = message.type === 'student';
  
  return (
    <div className={`flex ${isStudent ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className={`max-w-sm rounded-2xl px-4 py-3 ${
        isStudent 
          ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-500' 
          : 'bg-green-100 text-green-900 border-l-4 border-green-500'
      }`}>
        <div className="text-lg font-medium" data-testid={`text-message-${message.type}`}>
          {message.text}
        </div>
        {message.language && (
          <div className="text-sm mt-1 opacity-75" data-testid="text-detected-language">
            {isStudent 
              ? formatLanguageDisplay(message.language)
              : `Translated from: ${NATIVE_LANG_NAMES[message.language] || message.language}`
            }
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function for language display
function formatLanguageDisplay(langCode: string): string {
  const shortCode = langCode.split('-')[0];
  const flag = FLAG_MAP[shortCode] || '🌍';
  const name = NATIVE_LANG_NAMES[langCode] || langCode;
  return `🌍 ${name} ${flag}`;
}