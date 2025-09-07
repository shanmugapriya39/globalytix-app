import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/language-selector";
import { TranslationCard } from "@/components/translation-card";
import { ErrorPanel } from "@/components/ui/error-panel";
import { 
  PageShell, 
  SectionCard, 
  PrimaryButton, 
  SecondaryButton, 
  LangPill, 
  MicButton, 
  DetectedLanguage, 
  TranslationPane, 
  LargeTextarea, 
  LargeInput 
} from "@/components/ui/design-system";
import { AppNavigation } from "@/components/ui/navigation";
import { postJsonStrict, getJsonStrict } from "@/lib/api";
import { Languages, Mic, Volume2, Download, TestTube, RefreshCw, Star, Hand, HelpCircle, Eraser, Zap } from "lucide-react";
import logoUrl from "@assets/image_1756908725398.png";
import { useToast } from "@/hooks/use-toast";
import { LANGS, getLangByCode, getNativeName, getDisplayName, getEnglishName } from "@shared/languageCatalog";
import { Link } from "wouter";

const PRESET_PHRASES = [
  { id: 'praise', text: 'Good work!', icon: Star, color: 'text-yellow-500' },
  { id: 'instruction', text: 'Please raise your hand', icon: Hand, color: 'text-blue-500' },
  { id: 'question', text: 'Do you understand?', icon: HelpCircle, color: 'text-purple-500' }
];

// Language display with flags and emoji  
const FLAG_MAP: Record<string, string> = {
  'es': '🇪🇸', 'fr': '🇫🇷', 'ar': '🇸🇦', 'fa': '🇮🇷', 'ru': '🇷🇺',
  'zh': '🇨🇳', 'it': '🇮🇹', 'pt': '🇵🇹', 'nl': '🇳🇱', 'tr': '🇹🇷',
  'da': '🇩🇰', 'lv': '🇱🇻', 'en': '🇺🇸', 'de': '🇩🇪', 'ja': '🇯🇵'
};

const NATIVE_LANG_NAMES: Record<string, string> = {
  'es-ES': 'Español', 'fr-FR': 'Français', 'ar-SA': 'العربية', 'fa-IR': 'فارسی',
  'ru-RU': 'Русский', 'zh-CN': '中文', 'it-IT': 'Italiano', 'pt-PT': 'Português',
  'nl-NL': 'Nederlands', 'tr-TR': 'Türkçe', 'da-DK': 'Dansk', 'lv-LV': 'Latviešu',
  'en-US': 'English'
};

const getLanguageDisplayWithFlag = (langCode: string): string => {
  const shortCode = langCode.split('-')[0];
  const flag = FLAG_MAP[shortCode] || '🌍';
  const nativeName = NATIVE_LANG_NAMES[langCode] || langCode;
  return `${nativeName} ${flag}`;
};

interface TranslationResult {
  code: string;
  text: string;
  audioUrl?: string;
  error?: string;
}

export default function TranslatorPage() {
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [englishText, setEnglishText] = useState('');
  const [studentText, setStudentText] = useState('');
  const [reverseLanguage, setReverseLanguage] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [translationResults, setTranslationResults] = useState<TranslationResult[]>([]);
  const [reverseTranslation, setReverseTranslation] = useState<{ englishText: string; sourceLang: string } | null>(null);
  const [englishAudio, setEnglishAudio] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingEnglishAudio, setIsGeneratingEnglishAudio] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingEnglish, setIsRecordingEnglish] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);


  const dismissError = () => setGlobalError('');


  const handleLanguageChange = (languages: string[]) => {
    if (languages.length <= 12) {
      setSelectedLanguages(languages);
    } else {
      toast({
        title: "Too many languages",
        description: "You can select up to 12 languages maximum.",
        variant: "destructive"
      });
    }
  };

  const generateTranslations = async () => {
    if (!englishText.trim()) {
      toast({
        title: "Missing text",
        description: "Please enter some English text to translate.",
        variant: "destructive"
      });
      return;
    }

    if (selectedLanguages.length === 0) {
      toast({
        title: "No languages selected",
        description: "Please select at least one target language.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGlobalError('');

    try {
      // Use new streamlined API - translate to multiple languages at once
      const translateResponse = await postJsonStrict('/translate', {
        text: englishText,
        targetLangs: selectedLanguages
      });

      // Then generate audio using the existing TTS endpoint for backward compatibility
      const items = translateResponse.translations.map((t: any) => ({
        code: t.to,
        text: t.text
      }));

      const ttsResponse = await postJsonStrict('/tts', {
        items: items
      });

      setTranslationResults(ttsResponse.items);
      
      toast({
        title: "Success",
        description: `Generated translations and audio for ${selectedLanguages.length} languages.`
      });

    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to generate translations');
      console.error('Translation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Direct translation function that takes text as parameter (for auto-translation)
  const performTranslation = async (textToTranslate: string) => {
    if (!textToTranslate.trim()) return;

    setIsTranslating(true);
    setGlobalError('');

    try {
      console.log('Main page: Sending translation request for:', textToTranslate);
      const response = await postJsonStrict('/translate', {
        text: textToTranslate,
        targetLangs: ['en']
      });
      console.log('Main page: Translation response:', response);

      // Get detected language from the response
      let detectedLang = 'Auto-detected';
      if (response.detectedLanguage) {
        detectedLang = getDisplayName(response.detectedLanguage);
      }

      setDetectedLanguage(detectedLang);
      setReverseTranslation({
        englishText: response.translations[0]?.text || "Translation failed",
        sourceLang: detectedLang
      });

      // Show success toast for auto-translation
      toast({
        title: "Translation complete",
        description: `${detectedLang} → English`,
      });

    } catch (error) {
      console.error('Auto-translation error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      
      setGlobalError(error instanceof Error ? error.message : 'Failed to translate to English');
      setReverseTranslation({
        englishText: "Translation failed - please try again",
        sourceLang: "Error"
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // Manual translation function (for button click)
  const translateToEnglish = async () => {
    if (!studentText.trim()) {
      toast({
        title: "Missing text",
        description: "Please enter the student's response.",
        variant: "destructive"
      });
      return;
    }

    await performTranslation(studentText);
  };

  const generateEnglishAudio = async () => {
    if (!reverseTranslation) return;

    setIsGeneratingEnglishAudio(true);
    try {
      const response = await postJsonStrict('/tts', {
        items: [{ code: 'en', text: reverseTranslation.englishText }]
      });

      setEnglishAudio(response.items[0].audioUrl);
      
      toast({
        title: "Audio generated",
        description: "English audio is ready to play."
      });

    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Failed to generate English audio');
    } finally {
      setIsGeneratingEnglishAudio(false);
    }
  };

  const testConnection = async () => {
    try {
      await postJsonStrict('/health', {});
      setConnectionStatus(true);
      toast({
        title: "Connection successful",
        description: "All services are working properly."
      });
    } catch (error) {
      setConnectionStatus(false);
      toast({
        title: "Connection failed",
        description: "Unable to reach the translation service.",
        variant: "destructive"
      });
    }
  };

  const usePreset = (preset: string) => {
    const phrase = PRESET_PHRASES.find(p => p.id === preset);
    if (phrase) {
      setEnglishText(phrase.text);
    }
  };

  const startRecording = async () => {
    // Show the English translation box immediately when recording starts
    setReverseTranslation({
      englishText: "Recording and translating...",
      sourceLang: "Processing"
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

      setMediaRecorder(recorder);
      setIsRecording(true);
      recorder.start();

      // Auto-stop after 3 seconds
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          setIsRecording(false);
        }
      }, 3000);

    } catch (error) {
      console.error('Recording failed:', error);
      // Hide the box if recording fails
      setReverseTranslation(null);
      toast({
        title: "Recording failed",
        description: "Please allow microphone access and try again.",
        variant: "destructive"
      });
    }
  };

  const startEnglishRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await processEnglishRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      setIsRecordingEnglish(true);
      recorder.start();

      // Auto-stop after 3 seconds for smaller files
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
          setIsRecordingEnglish(false);
        }
      }, 3000);

    } catch (error) {
      console.error('English recording failed:', error);
      toast({
        title: "Recording failed",
        description: "Please allow microphone access and try again.",
        variant: "destructive"
      });
    }
  };

  const processRecordedAudio = async (audioBlob: Blob) => {
    try {
      // Convert to WAV format for better compatibility
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to PCM WAV format
      const wavBuffer = audioBufferToWav(audioBuffer);
      const base64Audio = arrayBufferToBase64(wavBuffer);

      try {
        // Always use auto-detection
        const useLanguage = 'auto';

        const sttResponse = await postJsonStrict('/stt', {
          audioData: `data:audio/wav;base64,${base64Audio}`,
          language: useLanguage
        });

        console.log('STT Response:', sttResponse); // Debug log
        
        if (sttResponse.text && sttResponse.text.trim()) {
          setStudentText(sttResponse.text);
          
          const detectedLang = sttResponse.detectedLanguage || 'unknown';
          
          // Convert language code to human-readable name
          const getLanguageName = (code: string): string => {
            const languageNames: Record<string, string> = {
              'es-ES': 'Spanish',
              'fr-FR': 'French',
              'ar-SA': 'Arabic', 
              'fa-IR': 'Persian',
              'ru-RU': 'Russian',
              'zh-CN': 'Chinese',
              'it-IT': 'Italian',
              'pt-PT': 'Portuguese',
              'nl-NL': 'Dutch',
              'tr-TR': 'Turkish',
              'da-DK': 'Danish',
              'lv-LV': 'Latvian',
              'en-US': 'English',
              'ca-CA': 'Catalan'
            };
            return languageNames[code] || code;
          };
          
          const langDisplay = getLanguageName(detectedLang);
          setDetectedLanguage(langDisplay);

          // Update translation box to show we're starting translation
          setReverseTranslation({
            englishText: "Starting translation...",
            sourceLang: langDisplay
          });

          toast({
            title: "Speech recognized - Auto-translating now",
            description: `"${sttResponse.text}" - Detected: ${langDisplay}`,
          });

          // Auto-translate the recognized text immediately  
          console.log('Auto-translating:', sttResponse.text);
          // Translate directly with the recognized text to avoid state timing issues
          performTranslation(sttResponse.text);
        } else {
          console.log('No text in STT response:', sttResponse);
          toast({
            title: "No speech detected",
            description: "Try speaking louder and clearer.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('STT error:', error);
        toast({
          title: "Speech recognition failed",
          description: "Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Audio processing error:', error);
      toast({
        title: "Audio processing failed",
        description: "Unable to process audio format.",
        variant: "destructive"
      });
    }
  };

  const processEnglishRecordedAudio = async (audioBlob: Blob) => {
    try {
      // Convert to WAV format for better compatibility
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to PCM WAV format
      const wavBuffer = audioBufferToWav(audioBuffer);
      const base64Audio = arrayBufferToBase64(wavBuffer);

      try {
        const sttResponse = await postJsonStrict('/stt', {
          audioData: `data:audio/wav;base64,${base64Audio}`,
          language: 'en-US'
        });

        if (sttResponse.text && sttResponse.text.trim()) {
          setEnglishText(sttResponse.text);
          
          toast({
            title: "English speech recognized",
            description: `Detected: "${sttResponse.text}"`,
          });
        } else {
          toast({
            title: "No speech detected", 
            description: "Try speaking louder and clearer.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('English STT error:', error);
        toast({
          title: "Speech recognition failed",
          description: "Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('English audio processing error:', error);
      toast({
        title: "Audio processing failed",
        description: "Unable to process audio format.",
        variant: "destructive"
      });
    }
  };

  // Helper functions for audio conversion - optimized for smaller size
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    // Downsample to 16kHz for smaller file size and better Azure compatibility
    const targetSampleRate = 16000;
    const ratio = buffer.sampleRate / targetSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    
    const arrayBuffer = new ArrayBuffer(44 + newLength * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
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

    // Downsample and convert to 16-bit PCM
    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < newLength; i++) {
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

  const clearAll = () => {
    setEnglishText('');
    setStudentText('');
    setSelectedLanguages([]);
    setReverseLanguage('');
    setTranslationResults([]);
    setReverseTranslation(null);
    setEnglishAudio('');
    setGlobalError('');
  };

  return (
    <PageShell>
      <AppNavigation />
        {/* Global Error */}
        {globalError && (
          <ErrorPanel 
            message={globalError} 
            onDismiss={dismissError}
            className="mb-6"
          />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* English to Languages */}
          <div className="space-y-6">
            <SectionCard 
              title="English → Languages" 
              icon={<Languages />}
              aside={
                <Badge variant="outline" className="text-emerald-700 border-emerald-300">
                  {selectedLanguages.length}/12 selected
                </Badge>
              }
            >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Target Languages (up to 12)
                  </label>
                  <LanguageSelector
                    selectedLanguages={selectedLanguages}
                    onChange={handleLanguageChange}
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-3">
                    English Text to Translate
                  </label>
                  <div className="relative">
                    <LargeTextarea
                      value={englishText}
                      onChange={(e) => setEnglishText(e.target.value)}
                      placeholder="Type your English message here…"
                      data-testid="input-english-text"
                      className="pr-16"
                    />
                    <Button
                      onClick={startEnglishRecording}
                      disabled={isRecordingEnglish}
                      className="absolute bottom-4 right-4 w-10 h-10 rounded-full p-0 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 focus:ring-2 focus:ring-blue-300"
                      data-testid="button-record-english"
                    >
                      <Mic className="w-5 h-5" />
                    </Button>
                  </div>
                  {isRecordingEnglish && (
                    <div className="mt-2 text-sm text-blue-600 flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                      Recording English speech...
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-base font-medium text-gray-700">
                    <span data-testid="text-selected-count">{selectedLanguages.length}</span> of 14 languages selected
                  </div>
                  <PrimaryButton
                    onClick={generateTranslations}
                    disabled={isGenerating}
                    data-testid="button-generate-audio"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Generating Audio...
                      </>
                    ) : (
                      <>
                        <Languages className="w-5 h-5 mr-2" />
                        Generate Audio
                      </>
                    )}
                  </PrimaryButton>
                </div>
            </SectionCard>

            {/* Translation Results */}
            {translationResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Translation Results</h3>
                {translationResults.map((result) => (
                  <TranslationCard
                    key={result.code}
                    result={result}
                    languageName={getDisplayName(result.code)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Kids to English */}
          <div className="space-y-6">
            <SectionCard 
              title="Kids → English" 
              icon={<Zap />}
              aside={
                <Badge variant="outline" className="text-blue-700 border-blue-300">
                  Auto-Detect
                </Badge>
              }
            >
                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-3">
                    Student's Response (Language will be auto-detected)
                  </label>
                  <LargeTextarea
                    value={studentText}
                    onChange={(e) => setStudentText(e.target.value)}
                    placeholder="Paste or type student's response here…"
                    data-testid="input-student-text"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold text-gray-800 mb-3">
                    Detected Language
                  </label>
                  <DetectedLanguage
                    code={detectedLanguage && detectedLanguage !== 'Auto-detected' ? detectedLanguage : undefined}
                    name={detectedLanguage && detectedLanguage !== 'Auto-detected' ? getLanguageDisplayWithFlag(detectedLanguage) : undefined}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={startRecording}
                    disabled={isRecording || isTranslating}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                    data-testid="button-record-translate"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    {isRecording ? 'Recording...' : isTranslating ? 'Auto-Translating...' : 'Record & Auto-Translate'}
                  </Button>
                </div>
            </SectionCard>

            {/* Reverse Translation Result */}
            {reverseTranslation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-secondary">
                    <Languages className="w-5 h-5 mr-2" />
                    English Translation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-blue-900 font-medium" data-testid="text-english-translation">
                      {reverseTranslation.englishText}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Translated from: <span className="font-medium text-gray-700">{reverseTranslation.sourceLang}</span></span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={generateEnglishAudio}
                      disabled={isGeneratingEnglishAudio}
                      className="text-primary hover:text-blue-600"
                      data-testid="button-generate-english-audio"
                    >
                      <Volume2 className="w-4 h-4 mr-1" />
                      Generate Audio
                    </Button>
                  </div>

                  {englishAudio && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Button
                            size="sm"
                            className="w-8 h-8 rounded-full p-0"
                            onClick={() => {
                              if (audioRef.current) {
                                audioRef.current.src = englishAudio;
                                audioRef.current.play();
                              }
                            }}
                            data-testid="button-play-english-audio"
                          >
                            <Volume2 className="w-3 h-3" />
                          </Button>
                          <div className="flex-1">
                            <div className="w-32 h-1 bg-gray-300 rounded-full">
                              <div className="w-0 h-1 bg-primary rounded-full"></div>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">0:04</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = englishAudio;
                            link.download = 'english-translation.mp3';
                            link.click();
                          }}
                          className="text-xs text-primary hover:text-blue-600"
                          data-testid="button-download-english-audio"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                      </div>
                      <audio ref={audioRef} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {PRESET_PHRASES.map((preset) => (
                    <Button
                      key={preset.id}
                      variant="outline"
                      onClick={() => usePreset(preset.id)}
                      className="flex items-center p-3 text-left justify-start hover:border-primary hover:bg-blue-50"
                      data-testid={`button-preset-${preset.id}`}
                    >
                      <preset.icon className={`mr-3 ${preset.color}`} />
                      <div>
                        <div className="font-medium text-gray-900">{preset.text}</div>
                        <div className="text-sm text-gray-500">
                          {preset.id === 'praise' && 'Common praise phrase'}
                          {preset.id === 'instruction' && 'Classroom instruction'}
                          {preset.id === 'question' && 'Check understanding'}
                        </div>
                      </div>
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={clearAll}
                    className="flex items-center p-3 text-left justify-start hover:border-primary hover:bg-blue-50"
                    data-testid="button-clear-all"
                  >
                    <Eraser className="mr-3 text-gray-500" />
                    <div>
                      <div className="font-medium text-gray-900">Clear All</div>
                      <div className="text-sm text-gray-500">Reset the interface</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Bar */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Azure Translator</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Azure Speech</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Speech Recognition</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={testConnection}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  data-testid="button-test-connection"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Test Connection
                </Button>
                <span className="text-xs text-gray-500">Last updated: 2 mins ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
    </PageShell>
  );
}
