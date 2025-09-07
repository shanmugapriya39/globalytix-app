import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  filename?: string;
}

export function AudioPlayer({ audioUrl, filename = "audio.mp3" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration;
    setProgress((current / total) * 100);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    link.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            size="sm"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full p-0"
            data-testid="button-toggle-audio"
          >
            {isPlaying ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </Button>
          <div className="flex-1">
            <div className="w-32 h-1 bg-gray-300 rounded-full">
              <div 
                className="h-1 bg-primary rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-gray-500" data-testid="text-audio-duration">
            {formatTime(duration)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="text-xs text-primary hover:text-blue-600"
          data-testid="button-download-audio"
        >
          <Download className="w-3 h-3 mr-1" />
          Download
        </Button>
      </div>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}
