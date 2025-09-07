import React, { useState, useMemo } from "react";
import { LANGS } from "@shared/languageCatalog";
import { translateMany, tts } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { AppNavigation } from "@/components/ui/navigation";
import { PageShell } from "@/components/ui/design-system";

type SelectedLang = { 
  code: string; 
  ttsLocale: string; 
  voice: string; 
  uiLabel: string; 
  englishName: string; 
  rtl?: boolean; 
};

type GeneratedItem = {
  lang: SelectedLang;
  translatedText: string;
  audioBlob: Blob;
  audioUrl: string;
};

export function StreamlinedTranslator() {
  const [selected, setSelected] = useState<SelectedLang[]>([]);
  const [englishText, setEnglishText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [results, setResults] = useState<GeneratedItem[]>([]);
  const { toast } = useToast();
  
  const maxLanguages = 12;
  const canGenerate = englishText.trim().length > 0 && selected.length > 0 && !busy;

  const languages = useMemo(() =>
    LANGS.map(l => ({ 
      code: l.code, 
      ttsLocale: l.ttsLocale, 
      voice: l.defaultVoice, 
      uiLabel: l.uiLabel, 
      englishName: l.englishName,
      rtl: l.rtl 
    })), []
  );

  function toggleLanguage(lang: SelectedLang) {
    setSelected(prev => {
      const exists = prev.some(p => p.code === lang.code);
      if (exists) {
        return prev.filter(p => p.code !== lang.code);
      }
      if (prev.length >= maxLanguages) {
        toast({
          title: "Too many languages",
          description: `You can only select up to ${maxLanguages} languages.`,
          variant: "destructive"
        });
        return prev;
      }
      return [...prev, lang];
    });
  }

  async function handleGenerateAll() {
    if (!canGenerate) return;

    try {
      setBusy(true);
      setProgress({ done: 0, total: 0 });
      setResults([]);

      // Step 1: Translate to all selected languages in one call
      const targetCodes = selected.map(s => s.code);
      const translations = await translateMany(englishText.trim(), targetCodes);

      // Step 2: Generate audio for each translation with progress tracking
      const total = translations.length;
      setProgress({ done: 0, total });

      const generatedItems: GeneratedItem[] = [];
      let done = 0;

      for (const translation of translations) {
        const lang = selected.find(s => s.code === translation.to)!;
        if (lang) {
          try {
            const audioBlob = await tts(translation.text, lang.voice, lang.ttsLocale);
            const audioUrl = URL.createObjectURL(audioBlob);
            
            generatedItems.push({
              lang,
              translatedText: translation.text,
              audioBlob,
              audioUrl
            });

            setProgress({ done: ++done, total });
          } catch (error) {
            console.error(`TTS failed for ${lang.code}:`, error);
            done++;
            setProgress({ done, total });
          }
        }
      }

      setResults(generatedItems);

      toast({
        title: "Generation complete!",
        description: `Created translations and audio for ${generatedItems.length} languages.`
      });

    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: "Generation failed",
        description: error?.message || "An error occurred during generation.",
        variant: "destructive"
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleExportZip() {
    if (results.length === 0) return;

    try {
      const zip = new JSZip();
      
      // Add all audio files to ZIP
      results.forEach((item, index) => {
        const filename = `${item.lang.englishName}-${Date.now()}-${index}.mp3`;
        zip.file(filename, item.audioBlob);
      });

      // Add a text file with all translations
      const translationsText = results.map(item => 
        `${item.lang.uiLabel} (${item.lang.englishName}):\n${item.translatedText}\n`
      ).join('\n');
      
      zip.file('translations.txt', translationsText);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `TeacherTranslations-${Date.now()}.zip`);

      toast({
        title: "ZIP exported!",
        description: `Downloaded ${results.length} audio files and translations.`
      });

    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.message || "Failed to create ZIP file.",
        variant: "destructive"
      });
    }
  }

  function playAudio(audioUrl: string) {
    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
      toast({
        title: "Playback failed",
        description: "Unable to play audio file.",
        variant: "destructive"
      });
    });
  }

  return (
    <PageShell>
      <AppNavigation />
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            English → Multiple Languages
            <Badge variant="secondary">{selected.length}/{maxLanguages}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Selection Grid */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Select Target Languages (up to {maxLanguages})
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {languages.map(lang => {
                const isSelected = selected.some(s => s.code === lang.code);
                return (
                  <Button
                    key={lang.code}
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => toggleLanguage(lang)}
                    className={`p-3 h-auto justify-start text-left ${lang.rtl ? 'text-right' : ''}`}
                    dir={lang.rtl ? "rtl" : "ltr"}
                    data-testid={`button-language-${lang.code}`}
                  >
                    <span style={{ fontFamily: lang.rtl ? 'Noto Sans Arabic, sans-serif' : 'inherit' }}>
                      {lang.uiLabel} ({lang.englishName})
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* English Text Input */}
          <div>
            <label className="block text-sm font-medium mb-3">
              English Text to Translate
            </label>
            <Textarea
              value={englishText}
              onChange={(e) => setEnglishText(e.target.value)}
              placeholder="Type your English message here..."
              rows={4}
              className="text-lg"
              data-testid="textarea-english"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {selected.length} languages selected
            </span>
            <div className="flex gap-3">
              {results.length > 0 && (
                <Button
                  onClick={handleExportZip}
                  variant="outline"
                  className="gap-2"
                  data-testid="button-export-zip"
                >
                  <Download className="w-4 h-4" />
                  Export ZIP
                </Button>
              )}
              <Button
                onClick={handleGenerateAll}
                disabled={!canGenerate}
                className="gap-2"
                data-testid="button-generate-all"
              >
                {busy ? `Generating ${progress.done}/${progress.total}...` : "Generate All Audio"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Translations & Audio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {results.map((item, index) => (
                <div
                  key={`${item.lang.code}-${index}`}
                  className="flex items-start justify-between p-4 border rounded-lg"
                  data-testid={`result-item-${item.lang.code}`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-600 mb-1">
                      {item.lang.uiLabel} ({item.lang.englishName})
                    </div>
                    <p 
                      className={`text-lg leading-relaxed ${item.lang.rtl ? 'text-right' : ''}`}
                      dir={item.lang.rtl ? "rtl" : "ltr"}
                      style={{ fontFamily: item.lang.rtl ? 'Noto Sans Arabic, sans-serif' : 'inherit' }}
                      data-testid={`text-translation-${item.lang.code}`}
                    >
                      {item.translatedText}
                    </p>
                  </div>
                  <Button
                    onClick={() => playAudio(item.audioUrl)}
                    variant="ghost"
                    size="sm"
                    className="gap-2 ml-4"
                    data-testid={`button-play-${item.lang.code}`}
                  >
                    <Volume2 className="w-4 h-4" />
                    Play
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </PageShell>
  );
}