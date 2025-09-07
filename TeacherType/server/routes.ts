import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      ok: true, 
      time: new Date().toISOString() 
    });
  });

  // Diagnostics endpoint
  app.get('/api/diag', (req, res) => {
    const translatorKey = process.env.AZURE_TRANSLATOR_KEY;
    const translatorRegion = process.env.AZURE_TRANSLATOR_REGION;
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegionRaw = process.env.AZURE_SPEECH_REGION;
    
    // Normalize speech region (remove dashes)
    const speechRegionNormalized = speechRegionRaw?.replace(/-/g, '') || null;
    
    res.json({
      hasTranslatorKey: !!translatorKey,
      translatorRegion: translatorRegion || null,
      hasSpeechKey: !!speechKey,
      speechRegionRaw: speechRegionRaw || null,
      speechRegionNormalized: speechRegionNormalized
    });
  });

  // Test UAE North region variations
  app.get('/api/test-uae', async (req, res) => {
    const speechKey = process.env.AZURE_SPEECH_KEY;
    
    if (!speechKey) {
      return res.json({ error: 'No speech key found' });
    }

    // Test different UAE North variations
    const testRegions = ['uaenorth', 'uae-north', 'northuae', 'uae', 'eastus', 'westeurope'];
    const results = [];

    for (const region of testRegions) {
      try {
        const response = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': speechKey
          }
        });
        
        const responseText = response.ok ? 'SUCCESS' : await response.text();
        
        results.push({
          region,
          status: response.status,
          working: response.ok,
          message: responseText.substring(0, 100)
        });
      } catch (error) {
        results.push({
          region,
          status: 'error',
          working: false,
          error: error instanceof Error ? error.message : 'Network error'
        });
      }
    }

    res.json({ results });
  });

  // Mock endpoint for testing
  app.post('/api/mock', (req, res) => {
    const { text = '', targets = [] } = req.body || {};
    const items = targets.slice(0, 12).map((code: string) => ({ 
      code, 
      text: `[${code}] ${text}`,
      audioUrl: `data:audio/mpeg;base64,` 
    }));
    res.json({ items });
  });

  // Simplified translate endpoint - supports both directions
  app.post('/api/translate', async (req, res) => {
    const { text, targetLangs, from } = req.body || {};
    
    if (!text || !Array.isArray(targetLangs) || targetLangs.length === 0) {
      return res.status(400).json({ error: 'text/targetLangs required' });
    }

    try {
      const translatorKey = process.env.AZURE_TRANSLATOR_KEY;
      const translatorRegion = process.env.AZURE_TRANSLATOR_REGION;

      if (!translatorKey || !translatorRegion) {
        // Fall back to mock data
        const translations = targetLangs.map((code: string) => ({ 
          to: code, 
          text: `[MOCK ${code}] ${text}` 
        }));
        return res.json({ translations });
      }

      // Build URL with proper formatting as per Azure requirements
      const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0${from ? `&from=${from}` : ''}${targetLangs.map(t => `&to=${t}`).join('')}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': translatorKey,
          'Ocp-Apim-Subscription-Region': translatorRegion,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{ text }]) // Correct format: lowercase 'text' in array
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({}));
        return res.status(response.status).json({ 
          error: errorResult.error?.message || "Translation failed",
          detail: `Status ${response.status}`
        });
      }

      const result = await response.json();
      
      if (!Array.isArray(result) || result.length === 0) {
        throw new Error('Invalid translation response from Azure');
      }

      // Return in the format expected by clients
      res.json({ translations: result[0].translations });
      
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Translation failed' 
      });
    }
  });

  // Azure Speech-to-Text endpoint
  app.post('/api/stt', async (req, res) => {
    const { audioData, language } = req.body || {};
    
    if (!audioData) {
      return res.status(400).json({ error: 'Missing audio data' });
    }

    try {
      const speechKey = process.env.AZURE_SPEECH_KEY;
      const speechRegion = process.env.AZURE_SPEECH_REGION || 'uae-north';

      if (!speechKey || !speechRegion) {
        return res.json({ text: '[Mock] Recognized speech from audio', language: language || 'en' });
      }

      // Convert base64 audio to buffer and handle different formats
      let audioBuffer;
      if (audioData.includes('data:audio/')) {
        audioBuffer = Buffer.from(audioData.split(',')[1], 'base64');
      } else {
        audioBuffer = Buffer.from(audioData, 'base64');
      }
      
      // Azure Speech Recognition 
      let headers: Record<string, string> = {
        'Ocp-Apim-Subscription-Key': speechKey,
        'Content-Type': 'audio/wav',
        'Accept': 'application/json'
      };

      // For auto-detection, use a default language for STT but detect afterward
      let finalLanguage = language;
      if (language === 'auto') {
        finalLanguage = 'en-US'; // Use English as default for STT, then detect actual language
      }

      const finalUrl = `https://${speechRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${finalLanguage}&format=detailed`;
      
      const sttResponse = await fetch(finalUrl, {
        method: 'POST',
        headers,
        body: audioBuffer
      });

      if (!sttResponse.ok) {
        const errorText = await sttResponse.text();
        console.error('STT failed:', sttResponse.status, errorText);
        return res.status(500).json({ 
          error: `Speech recognition failed: ${sttResponse.status}`,
          details: errorText.substring(0, 100)
        });
      }

      const sttData = await sttResponse.json();
      
      // Handle both simple and detailed response formats
      const isSuccess = sttData.RecognitionStatus === 'Success' || sttData.RecognitionStatus === 'success';
      const displayText = sttData.DisplayText || sttData.NBest?.[0]?.Display || '';
      
      if (isSuccess && displayText && displayText.trim()) {
        let actualDetectedLang = finalLanguage;
        
        // If auto-detection was used, try to detect language from the text
        if (language === 'auto') {
          console.log(`Attempting language detection for text: "${sttData.DisplayText}"`);
          try {
            // Use Azure Translator to detect the language of the recognized text
            const translatorResponse = await fetch(`https://api.cognitive.microsofttranslator.com/detect?api-version=3.0`, {
              method: 'POST',
              headers: {
                'Ocp-Apim-Subscription-Key': process.env.AZURE_TRANSLATOR_KEY || '',
                'Ocp-Apim-Subscription-Region': process.env.AZURE_TRANSLATOR_REGION || '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify([{ text: displayText }])
            });
            
            console.log(`Translator response status: ${translatorResponse.status}`);
            
            if (translatorResponse.ok) {
              const translatorData = await translatorResponse.json();
              console.log('Translator detection result:', translatorData);
              
              if (translatorData[0]?.language) {
                // Map common language codes to full locale codes
                const langMap: Record<string, string> = {
                  'es': 'es-ES',
                  'fr': 'fr-FR', 
                  'ar': 'ar-SA',
                  'fa': 'fa-IR',
                  'ru': 'ru-RU',
                  'zh': 'zh-CN',
                  'it': 'it-IT',
                  'pt': 'pt-PT',
                  'nl': 'nl-NL',
                  'tr': 'tr-TR',
                  'da': 'da-DK',
                  'lv': 'lv-LV',
                  'en': 'en-US'
                };
                
                const detectedCode = translatorData[0].language;
                actualDetectedLang = langMap[detectedCode] || `${detectedCode}-${detectedCode.toUpperCase()}`;
                console.log(`Language detected: ${detectedCode} -> ${actualDetectedLang}`);
              }
            } else {
              const errorText = await translatorResponse.text();
              console.log('Translator error:', errorText);
            }
          } catch (err) {
            console.log('Language detection fallback failed:', err);
          }
        }
        
        res.json({ 
          text: displayText,
          language: language || 'auto',
          confidence: sttData.Confidence || sttData.NBest?.[0]?.Confidence || 1.0,
          detectedLanguage: actualDetectedLang
        });
      } else {
        res.json({ 
          text: '',
          language: language || 'auto',
          error: 'No speech detected'
        });
      }
      
    } catch (error) {
      console.error('STT error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Speech recognition failed' 
      });
    }
  });

  // Azure Text-to-Speech endpoint
  app.post('/api/tts', async (req, res) => {
    const { items } = req.body || {};
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Missing items array' });
    }

    try {
      const speechKey = process.env.AZURE_SPEECH_KEY;
      const speechRegionRaw = process.env.AZURE_SPEECH_REGION;
      // Normalize speech region (remove dashes for Azure endpoint)
      const speechRegion = speechRegionRaw?.replace(/-/g, '') || 'uaenorth';

      if (!speechKey || !speechRegion) {
        // Return mock audio URLs
        const results = items.map(item => ({
          ...item,
          audioUrl: `data:audio/mpeg;base64,`
        }));
        return res.json({ items: results });
      }

      // Voice mapping for different languages
      const voiceMap: Record<string, string> = {
        'en': 'en-US-JennyNeural',
        'es': 'es-ES-ElviraNeural', 
        'fr': 'fr-FR-DeniseNeural',
        'de': 'de-DE-KatjaNeural',
        'it': 'it-IT-ElsaNeural',
        'pt': 'pt-PT-RaquelNeural',
        'ru': 'ru-RU-SvetlanaNeural',
        'zh-Hans': 'zh-CN-XiaoxiaoNeural',
        'ja': 'ja-JP-NanamiNeural',
        'ko': 'ko-KR-SunHiNeural',
        'ar': 'ar-SA-ZariyahNeural',
        'tr': 'tr-TR-EmelNeural',
        'nl': 'nl-NL-ColetteNeural',
        'da': 'da-DK-ChristelNeural',
        'fa': 'fa-IR-DilaraNeural',
        'lv': 'lv-LV-EveritaNeural'
      };

      const results = await Promise.all(
        items.map(async (item) => {
          try {
            const voice = voiceMap[item.code] || voiceMap['en'];
            const ssml = `<speak version='1.0' xml:lang='${item.code === 'zh-Hans' ? 'zh-CN' : item.code}'>
              <voice name='${voice}'>${item.text}</voice>
            </speak>`;

            const ttsResponse = await fetch(`https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
              method: 'POST',
              headers: {
                'Ocp-Apim-Subscription-Key': speechKey,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
              },
              body: ssml
            });

            if (!ttsResponse.ok) {
              const errorText = await ttsResponse.text();
              console.error(`TTS failed for ${item.code}:`, ttsResponse.status, ttsResponse.statusText, errorText);
              return { 
                ...item, 
                audioUrl: null, 
                error: `TTS failed: ${ttsResponse.status}`,
                endpoint: `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
                regionRaw: speechRegionRaw,
                regionNormalized: speechRegion,
                providerSnippet: errorText.substring(0, 100)
              };
            }

            const audioBuffer = await ttsResponse.arrayBuffer();
            const audioBase64 = Buffer.from(audioBuffer).toString('base64');
            const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

            return { ...item, audioUrl };
          } catch (error) {
            console.error(`TTS error for ${item.code}:`, error);
            return { ...item, audioUrl: null, error: 'TTS generation failed' };
          }
        })
      );

      res.json({ items: results });
      
    } catch (error) {
      console.error('TTS error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'TTS failed' 
      });
    }
  });

  // Simplified TTS endpoint - one language at a time (for concurrent client requests)
  app.post('/api/tts-single', async (req, res) => {
    const { text, voice, locale } = req.body || {};
    
    if (!text || !voice || !locale) {
      return res.status(400).json({ error: 'text/voice/locale required' });
    }

    try {
      const speechKey = process.env.AZURE_SPEECH_KEY;
      const speechRegionRaw = process.env.AZURE_SPEECH_REGION;
      const speechRegion = speechRegionRaw?.replace(/-/g, '') || 'uaenorth';

      if (!speechKey || !speechRegion) {
        // Return empty MP3 for testing
        const emptyMp3 = Buffer.alloc(0);
        res.setHeader('Content-Type', 'audio/mpeg');
        return res.send(emptyMp3);
      }

      const ssml = `
<speak version='1.0' xml:lang='${locale}'>
  <voice name='${voice}'>
    <prosody rate='-10%'>${escapeXml(text)}</prosody>
  </voice>
</speak>`.trim();

      const ttsResponse = await fetch(`https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': speechKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'TeacherTranslationApp'
        },
        body: ssml
      });

      if (!ttsResponse.ok) {
        const errorText = await ttsResponse.text();
        return res.status(502).json({ error: 'tts failed', detail: errorText });
      }

      const audioBuffer = await ttsResponse.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(audioBuffer));
      
    } catch (error) {
      console.error('TTS-single error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'TTS failed' 
      });
    }
  });

  // Helper function for XML escaping
  function escapeXml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Azure Speech Token endpoint for live translation
  app.get('/api/speech/token', async (req, res) => {
    try {
      const raw = (process.env.AZURE_SPEECH_REGION || '').trim();
      const key = (process.env.AZURE_SPEECH_KEY || '').trim();
      if (!raw || !key) return res.status(500).json({ error: 'Speech key/region missing' });

      // STS host uses region with no separators (uae-north -> uaenorth)
      const hostRegion = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
      const tokenUrl = `https://${hostRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

      const r = await fetch(tokenUrl, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': key } });
      const body = await r.text();
      if (!r.ok) return res.status(r.status).json({ error: 'token failed', providerSnippet: body.slice(0,200), hostRegion });

      // Send back the exact region string the SDK should use
      res.json({ token: body, region: hostRegion });
    } catch (e) {
      res.status(500).json({ error: 'token exception', detail: String(e) });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
