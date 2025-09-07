export type Lang = {
  uiLabel: string;        // Native name
  englishName: string;    // English name
  code: string;           // Translator code
  ttsLocale: string;      // Speech TTS locale
  defaultVoice: string;   // Speech TTS neural voice (pick a sane default)
  rtl?: boolean;         // Right-to-left text direction
};

export const LANGS: Lang[] = [
  { uiLabel: "العربية", englishName: "Arabic", code: "ar", ttsLocale: "ar-EG", defaultVoice: "ar-EG-SalmaNeural", rtl: true },
  { uiLabel: "Español", englishName: "Spanish", code: "es", ttsLocale: "es-ES", defaultVoice: "es-ES-AlvaroNeural" },
  { uiLabel: "Français", englishName: "French", code: "fr", ttsLocale: "fr-FR", defaultVoice: "fr-FR-DeniseNeural" },
  { uiLabel: "Deutsch", englishName: "German", code: "de", ttsLocale: "de-DE", defaultVoice: "de-DE-KatjaNeural" },
  { uiLabel: "Afrikaans", englishName: "Afrikaans", code: "af", ttsLocale: "af-ZA", defaultVoice: "af-ZA-AdriNeural" },
  { uiLabel: "Русский", englishName: "Russian", code: "ru", ttsLocale: "ru-RU", defaultVoice: "ru-RU-DariyaNeural" },
  { uiLabel: "Português", englishName: "Portuguese", code: "pt", ttsLocale: "pt-BR", defaultVoice: "pt-BR-AntonioNeural" },
  { uiLabel: "Türkçe", englishName: "Turkish", code: "tr", ttsLocale: "tr-TR", defaultVoice: "tr-TR-EmelNeural" },
  { uiLabel: "Italiano", englishName: "Italian", code: "it", ttsLocale: "it-IT", defaultVoice: "it-IT-IsabellaNeural" },
  { uiLabel: "Nederlands", englishName: "Dutch", code: "nl", ttsLocale: "nl-NL", defaultVoice: "nl-NL-MaartenNeural" },
  { uiLabel: "Dansk", englishName: "Danish", code: "da", ttsLocale: "da-DK", defaultVoice: "da-DK-ChristelNeural" },
  { uiLabel: "中文（简体）", englishName: "Chinese", code: "zh-Hans", ttsLocale: "zh-CN", defaultVoice: "zh-CN-XiaoxiaoNeural" },
  { uiLabel: "فارسی", englishName: "Persian", code: "fa", ttsLocale: "fa-IR", defaultVoice: "fa-IR-DilaraNeural", rtl: true },
  { uiLabel: "Latviešu", englishName: "Latvian", code: "lv", ttsLocale: "lv-LV", defaultVoice: "lv-LV-EveritaNeural" },
];

// Helper to get language by code
export const getLangByCode = (code: string): Lang | undefined => {
  return LANGS.find(lang => lang.code === code);
};

// Helper to get all language codes
export const getAllCodes = (): string[] => {
  return LANGS.map(lang => lang.code);
};

// Helper to get native name by code
export const getNativeName = (code: string): string => {
  const lang = getLangByCode(code);
  return lang?.uiLabel || code;
};

// Helper to get display name (native + English in brackets)
export const getDisplayName = (code: string): string => {
  const lang = getLangByCode(code);
  if (!lang) return code;
  return `${lang.uiLabel} (${lang.englishName})`;
};

// Helper to get English name by code
export const getEnglishName = (code: string): string => {
  const lang = getLangByCode(code);
  return lang?.englishName || code;
};