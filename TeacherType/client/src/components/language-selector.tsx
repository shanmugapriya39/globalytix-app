import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LANGS, type Lang } from "@shared/languageCatalog";

interface LanguageSelectorProps {
  selectedLanguages: string[];
  onChange: (languages: string[]) => void;
}

export function LanguageSelector({ selectedLanguages, onChange }: LanguageSelectorProps) {
  const handleLanguageToggle = (code: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedLanguages, code]);
    } else {
      onChange(selectedLanguages.filter(lang => lang !== code));
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {LANGS.map((language) => (
        <Label
          key={language.code}
          className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary cursor-pointer transition-colors"
          data-testid={`label-language-${language.code}`}
          dir={language.rtl ? "rtl" : "ltr"}
        >
          <Checkbox
            checked={selectedLanguages.includes(language.code)}
            onCheckedChange={(checked) => handleLanguageToggle(language.code, !!checked)}
            className={language.rtl ? "ml-2" : "mr-2"}
            data-testid={`checkbox-language-${language.code}`}
          />
          <span 
            className="text-sm font-medium" 
            style={{ fontFamily: language.rtl ? 'Noto Sans Arabic, sans-serif' : 'inherit' }}
          >
            {language.uiLabel} ({language.englishName})
          </span>
        </Label>
      ))}
    </div>
  );
}
