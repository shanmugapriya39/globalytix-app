const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Helper functions
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function langToBcp47(code) { 
  const map = { 
    'fa':'fa-IR','es':'es-ES','ar':'ar-EG','lv':'lv-LV','ru':'ru-RU','fr':'fr-FR',
    'nl':'nl-NL','pt':'pt-PT','tr':'tr-TR','zh-Hans':'zh-CN','da':'da-DK','it':'it-IT'
  }; 
  return map[code] || 'en-US'; 
}

function pickVoiceForLang(code) {
  const voices = {
    'fa': 'fa-IR-DilaraNeural',
    'es': 'es-ES-ElviraNeural',
    'ar': 'ar-EG-SalmaNeural',
    'lv': 'lv-LV-EveritaNeural',
    'ru': 'ru-RU-DmitryNeural',
    'fr': 'fr-FR-DeniseNeural',
    'nl': 'nl-NL-ColetteNeural',
    'pt': 'pt-PT-FernandaNeural',
    'tr': 'tr-TR-AhmetNeural',
    'zh-Hans': 'zh-CN-XiaoxiaoNeural',
    'da': 'da-DK-ChristelNeural',
    'it': 'it-IT-ElsaNeural',
    'en': 'en-US-JennyNeural'
  };
  return voices[code] || 'en-US-JennyNeural';
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    time: new Date().toISOString() 
  });
});

app.post('/api/mock', (req, res) => {
  const { text, targets } = req.body;
  
  const mockTranslations = {
    'es': '¡Buenos días clase! Por favor, tomen asiento y abran sus libros en la página 42.',
    'fr': 'Bonjour la classe ! Veuillez vous asseoir et ouvrir vos livres à la page 42.',
    'ar': 'صباح الخير يا صف! من فضلكم اجلسوا وافتحوا كتبكم على الصفحة 42.',
    'fa': 'صبح بخیر کلاس! لطفاً بنشینید و کتاب‌هایتان را در صفحه ۴۲ باز کنید.',
    'ru': 'Доброе утро, класс! Пожалуйста, садитесь и откройте учебники на странице 42.',
    'nl': 'Goedemorgen klas! Ga zitten en sla jullie boeken open op pagina 42.',
    'pt': 'Bom dia turma! Por favor, sentem-se e abram os livros na página 42.',
    'tr': 'Günaydın sınıf! Lütfen oturun ve kitaplarınızı 42. sayfadan açın.',
    'zh-Hans': '早上好，同学们！请坐下，翻到课本第42页。',
    'da': 'Godmorgen klasse! Sæt jer ned og åbn jeres bøger på side 42.',
    'it': 'Buongiorno classe! Per favore sedetevi e aprite i libri a pagina 42.',
    'lv': 'Labrīt, klase! Lūdzu, apsēdieties un atveriet grāmatas 42. lappusē.'
  };

  const items = targets.map(code => ({
    code,
    text: mockTranslations[code] || text,
    audioUrl: 'data:audio/mpeg;base64,'
  }));

  res.json({ items });
});

app.post('/api/translate', async (req, res) => {
  const { text, targets, from } = req.body || {};
  if (!text || !Array.isArray(targets) || targets.length === 0) return res.status(400).json({ error: 'bad input' });
  try {
    const params = new URLSearchParams({ 'api-version': '3.0', textType: 'plain' });
    (from ? params.append('from', from) : params.append('from', 'en'));
    for (const t of targets) params.append('to', t);

    const url = `https://api.cognitive.microsofttranslator.com/translate?${params.toString()}`;
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Ocp-Apim-Subscription-Key': process.env.AZURE_TRANSLATOR_KEY || ''
    };
    if ((process.env.AZURE_TRANSLATOR_REGION || '').trim()) headers['Ocp-Apim-Subscription-Region'] = process.env.AZURE_TRANSLATOR_REGION.trim();

    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify([{ text }]) });
    const ct = r.headers.get('content-type') || '';
    const bodyText = await r.text();

    if (!ct.includes('application/json')) return res.status(r.status || 502).json({ error: `Translator non-JSON (${ct})`, providerSnippet: bodyText.slice(0, 200) });

    let data; try { data = JSON.parse(bodyText); } catch { return res.status(502).json({ error: 'Translator JSON parse failed', providerSnippet: bodyText.slice(0, 200) }); }
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Translator error', raw: data });

    const items = (data?.[0]?.translations || []).map(t => ({ code: t.to, text: t.text }));
    return res.json({ items });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'translate failed', detail: String(e) }); }
});

app.post('/api/tts', async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'bad input' });
  try {
    const out = [];
    for (const it of items) {
      const voice = pickVoiceForLang(it.code);
      const ssml = `<speak version='1.0' xml:lang='${langToBcp47(it.code)}'><voice name='${voice}'>${escapeXml(it.text)}</voice></speak>`;
      const url = `https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;
      const r = await fetch(url, { method: 'POST', headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY || '',
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3'
      }, body: ssml });
      const ct = r.headers.get('content-type') || '';
      if (!r.ok) { const errText = await r.text(); return res.status(r.status).json({ error: 'TTS error', contentType: ct, providerSnippet: errText.slice(0, 200) }); }
      const buf = Buffer.from(await r.arrayBuffer());
      out.push({ code: it.code, text: it.text, audioUrl: `data:audio/mpeg;base64,${buf.toString('base64')}` });
    }
    return res.json({ items: out });
  } catch (e) { console.error(e); return res.status(500).json({ error: 'tts failed', detail: String(e) }); }
});

app.post('/api/stt_translate_to_en', (req, res) => {
  // Stub implementation for future STT functionality
  res.json({
    originalLangText: '[stub transcript]',
    translatedToEn: '[stub to EN]',
    enAudioUrl: ''
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
