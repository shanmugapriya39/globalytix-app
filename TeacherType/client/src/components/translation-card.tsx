import { Card, CardContent } from "@/components/ui/card";
import { AudioPlayer } from "@/components/ui/audio-player";
import { Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLangByCode } from "@shared/languageCatalog";

interface TranslationResult {
  code: string;
  text: string;
  audioUrl?: string;
  error?: string;
}

interface TranslationCardProps {
  result: TranslationResult;
  languageName: string;
}

export function TranslationCard({ result, languageName }: TranslationCardProps) {
  const lang = getLangByCode(result.code);
  const isRtl = lang?.rtl || false;
  
  return (
    <Card data-testid={`card-translation-${result.code}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${result.error ? 'bg-red-500' : 'bg-green-500'}`} />
            <h4 className="font-medium text-gray-900" data-testid={`text-language-${result.code}`}>
              {languageName}
            </h4>
            <span className="text-xs text-gray-500 ml-2" data-testid={`text-code-${result.code}`}>
              {result.code}
            </span>
          </div>
          {result.audioUrl && !result.error && (
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const audio = new Audio(result.audioUrl);
                  audio.play();
                }}
                className="text-gray-400 hover:text-primary p-1"
                data-testid={`button-play-${result.code}`}
              >
                <Play className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = result.audioUrl!;
                  link.download = `${languageName.toLowerCase()}-translation.mp3`;
                  link.click();
                }}
                className="text-gray-400 hover:text-primary p-1"
                data-testid={`button-download-${result.code}`}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        
        {result.error ? (
          <div className="text-red-600 text-sm" data-testid={`text-error-${result.code}`}>
            Error: {result.error}
          </div>
        ) : (
          <p 
            className={`text-gray-800 dark:text-gray-200 leading-relaxed text-lg ${isRtl ? 'text-right' : ''}`}
            data-testid={`text-translation-${result.code}`}
            dir={isRtl ? "rtl" : "ltr"}
            style={{ 
              fontFamily: isRtl ? 'Noto Sans Arabic, sans-serif' : 'inherit',
              lineHeight: '1.6'
            }}
          >
            {result.text}
          </p>
        )}
        
        {result.audioUrl && !result.error && (
          <AudioPlayer 
            audioUrl={result.audioUrl} 
            filename={`${languageName.toLowerCase()}-translation.mp3`}
          />
        )}
      </CardContent>
    </Card>
  );
}
