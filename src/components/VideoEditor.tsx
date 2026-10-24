import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Scissors, Download, Volume2, Video, Type } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { FileDropZone } from '@/components/FileDropZone';

interface VideoEditorProps {
  onNotify?: (msg: string) => void;
}

export function VideoEditor({ onNotify }: VideoEditorProps) {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState('');
  const [videoSize, setVideoSize] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('original');
  const [overlayText, setOverlayText] = useState('');
  const [showText, setShowText] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 50, y: 85 });
  const [textSize, setTextSize] = useState(48);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [exporting, setExporting] = useState(false);
  const [, setSupportedFormats] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof MediaRecorder !== 'undefined') {
      setSupportedFormats(['video/webm']);
    }
  }, []);

  const handleFile = (dataUrl: string, file: File) => {
    setVideoSrc(dataUrl);
    setVideoName(file.name);
    setVideoSize(file.size);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setIsPlaying(false);
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setTrimEnd(v.duration);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      if (v.currentTime < trimStart) v.currentTime = trimStart;
      v.play();
      setIsPlaying(true);
    }
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.currentTime >= trimEnd && trimEnd > 0) {
      v.pause();
      v.currentTime = trimStart;
      setIsPlaying(false);
    }
  };

  const seek = (time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = time;
    setCurrentTime(time);
  };

  const changeVolume = (vol: number) => {
    setVolume(vol);
    if (videoRef.current) videoRef.current.volume = vol;
  };

  const getAspectRatioStyle = () => {
    switch (aspectRatio) {
      case '9:16': return { aspectRatio: '9/16', maxHeight: '70vh' };
      case '1:1': return { aspectRatio: '1/1', maxHeight: '70vh' };
      case '16:9': return { aspectRatio: '16/9', maxHeight: '70vh' };
      default: return { maxHeight: '70vh' };
    }
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const exportVideo = async () => {
    if (!videoRef.current || !videoSrc) return;
    setExporting(true);

    try {
      const v = videoRef.current;
      const canvas = document.createElement('canvas');
      const stream = (v as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.();

      if (!stream || typeof MediaRecorder === 'undefined') {
        onNotify?.('Экспорт видео не поддерживается в этом браузере. Используйте Chrome или Edge.');
        setExporting(false);
        return;
      }

      const canvasW = v.videoWidth || 1280;
      const canvasH = v.videoHeight || 720;
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext('2d')!;

      const canvasStream = canvas.captureStream(30);
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((t: MediaStreamTrack) => canvasStream.addTrack(t));

      const recorder = new MediaRecorder(canvasStream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fotobust-video-${Date.now()}.webm`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setExporting(false);
        onNotify?.('Видео экспортировано в формате WebM');
      };

      v.currentTime = trimStart;
      await new Promise((r) => { v.onseeked = () => r(null); });

      recorder.start();
      v.play();

      const drawFrame = () => {
        if (v.currentTime >= trimEnd || v.ended) {
          v.pause();
          recorder.stop();
          return;
        }
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
        if (aspectRatio === '9:16') {
          sw = v.videoHeight * 9 / 16;
          sx = (v.videoWidth - sw) / 2;
        } else if (aspectRatio === '1:1') {
          sw = Math.min(v.videoWidth, v.videoHeight);
          sh = sw;
          sx = (v.videoWidth - sw) / 2;
          sy = (v.videoHeight - sh) / 2;
        }

        ctx.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

        if (showText && overlayText) {
          ctx.font = `600 ${textSize}px Inter, sans-serif`;
          ctx.fillStyle = textColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const x = canvas.width * (textPosition.x / 100);
          const y = canvas.height * (textPosition.y / 100);
          ctx.fillText(overlayText, x, y);
        }

        requestAnimationFrame(drawFrame);
      };
      drawFrame();
    } catch (e) {
      console.error('Video export failed:', e);
      onNotify?.('Не удалось экспортировать видео. Возможно, формат не поддерживается.');
      setExporting(false);
    }
  };

  if (!videoSrc) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-24 md:pb-12">
        <div className="text-center mb-6">
          <h2 className="font-display text-2xl font-semibold text-ink mb-2">Видеоредактор</h2>
          <p className="text-sm text-ink-secondary">Загрузите видео для начала работы</p>
        </div>
        <FileDropZone onFile={handleFile} accept="video" label="Перетащите видео сюда" />
        <div className="mt-6 card p-4 bg-brand-light/30 border-0">
          <p className="text-xs text-ink-secondary leading-relaxed">
            <strong className="text-ink">Поддержка браузера:</strong> Экспорт работает в Chrome и Edge через MediaRecorder API.
            Результат сохраняется в формате WebM. Поддержка зависит от возможностей вашего браузера.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-16 md:pb-0">
      <div className="flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-gold/15 bg-brand-dark">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-white truncate max-w-[150px] md:max-w-xs">{videoName}</span>
          <span className="text-xs text-white/50 hidden md:inline">{formatBytes(videoSize)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setVideoSrc(null)} className="btn-ghost btn-sm">Новое</button>
          <button onClick={exportVideo} disabled={exporting} className="btn-primary btn-sm">
            <Download className="w-4 h-4" />
            {exporting ? 'Экспорт...' : 'Экспорт'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Video preview */}
        <div className="flex-1 bg-ink/5 flex items-center justify-center p-4 overflow-hidden min-h-[250px]">
          <div className="relative bg-black overflow-hidden" style={getAspectRatioStyle()}>
            <video
              ref={videoRef}
              src={videoSrc}
              onLoadedMetadata={onLoadedMetadata}
              onTimeUpdate={onTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              className="w-full h-full object-contain"
              playsInline
            />
            {showText && overlayText && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${textPosition.x}%`,
                  top: `${textPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: `${textSize}px`,
                  color: textColor,
                  fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                }}
              >
                {overlayText}
              </div>
            )}
          </div>
        </div>

        {/* Controls panel */}
        <div className="w-full md:w-72 bg-bg-cream border-t md:border-t-0 md:border-l border-border flex flex-col max-h-[50vh] md:max-h-none overflow-y-auto">
          {/* Playback */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-center mb-3">
              <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shadow-soft hover:bg-brand-dark transition-colors">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-secondary mb-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range" min={0} max={duration || 100} step={0.1}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="slider"
            />
          </div>

          {/* Trim */}
          <div className="p-4 border-b border-border">
            <h4 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5" /> Обрезка
            </h4>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs text-ink mb-1">
                  <span>Начало</span>
                  <span className="text-ink-secondary tabular-nums">{formatTime(trimStart)}</span>
                </div>
                <input type="range" min={0} max={duration || 100} step={0.1} value={trimStart}
                  onChange={(e) => { const v = Math.min(Number(e.target.value), trimEnd); setTrimStart(v); seek(v); }}
                  className="slider" />
              </div>
              <div>
                <div className="flex justify-between text-xs text-ink mb-1">
                  <span>Конец</span>
                  <span className="text-ink-secondary tabular-nums">{formatTime(trimEnd)}</span>
                </div>
                <input type="range" min={0} max={duration || 100} step={0.1} value={trimEnd}
                  onChange={(e) => { const v = Math.max(Number(e.target.value), trimStart); setTrimEnd(v); }}
                  className="slider" />
              </div>
            </div>
          </div>

          {/* Aspect ratio */}
          <div className="p-4 border-b border-border">
            <h4 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2.5">Формат кадра</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'original', label: 'Оригинал' },
                { id: '16:9', label: '16:9 Горизонт.' },
                { id: '1:1', label: '1:1 Квадрат' },
                { id: '9:16', label: '9:16 Вертик.' },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setAspectRatio(r.id)}
                  className={cn('btn btn-sm', aspectRatio === r.id ? 'bg-brand text-white' : 'btn-secondary')}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text overlay */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5" /> Текст
              </h4>
              <button onClick={() => setShowText(!showText)} className={cn('chip', showText ? 'bg-brand text-white' : 'bg-bg text-ink-secondary')}>
                {showText ? 'Вкл' : 'Выкл'}
              </button>
            </div>
            {showText && (
              <div className="space-y-2">
                <input type="text" placeholder="Текст поверх видео" value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)} className="input" />
                <div>
                  <label className="text-xs text-ink-secondary">Размер: {textSize}px</label>
                  <input type="range" min={16} max={120} value={textSize}
                    onChange={(e) => setTextSize(Number(e.target.value))} className="slider" />
                </div>
                <div>
                  <label className="text-xs text-ink-secondary">Позиция X: {textPosition.x}%</label>
                  <input type="range" min={0} max={100} value={textPosition.x}
                    onChange={(e) => setTextPosition({ ...textPosition, x: Number(e.target.value) })} className="slider" />
                </div>
                <div>
                  <label className="text-xs text-ink-secondary">Позиция Y: {textPosition.y}%</label>
                  <input type="range" min={0} max={100} value={textPosition.y}
                    onChange={(e) => setTextPosition({ ...textPosition, y: Number(e.target.value) })} className="slider" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-border cursor-pointer" />
                  <span className="text-xs text-ink-secondary">{textColor}</span>
                </div>
              </div>
            )}
          </div>

          {/* Volume */}
          <div className="p-4">
            <h4 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Громкость
            </h4>
            <input type="range" min={0} max={1} step={0.05} value={volume}
              onChange={(e) => changeVolume(Number(e.target.value))} className="slider" />
          </div>
        </div>
      </div>

      {exporting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-bg-cream rounded-2xl p-6 text-center">
            <div className="w-12 h-12 border-[3px] border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-ink">Экспорт видео... Не закрывайте страницу.</p>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
