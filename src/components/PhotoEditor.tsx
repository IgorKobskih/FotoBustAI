import { useState, useRef, useCallback } from 'react';
import {
  RotateCw, FlipHorizontal, FlipVertical, Undo, Redo, Download, Eye, EyeOff,
  Sun, Contrast, Droplets, Thermometer, Palette, Circle, Aperture, Focus,
  Image as ImageIcon, Sliders, RotateCcw, Crop, Save, AlertCircle, Loader2, Check
} from 'lucide-react';
import type { Adjustments, Settings, CardProject } from '@/types';
import { DEFAULT_ADJUSTMENTS } from '@/types';
import {
  buildFilterString, buildTemperatureOverlay, buildFadeOverlay, buildVignetteOpacity,
  shareOrDownloadBlob, generateId, cn
} from '@/lib/utils';
import { FileDropZone } from '@/components/FileDropZone';
import { exportPhotoBlob } from '@/lib/canvas';
import { PRESETS, PRESET_CATEGORIES } from '@/lib/presets';
import type { Preset } from '@/types';
import { Modal } from '@/components/Modal';
import { useAutoSave } from '@/lib/useAutoSave';
import { SaveStatus } from '@/components/SaveStatus';

interface PhotoEditorProps {
  settings: Settings;
  initialData?: { src: string; adjustments: Adjustments; presetId?: string; projectId?: string; createdAt?: number; intensity?: number };
}

interface HistoryEntry {
  adjustments: Adjustments;
  presetId: string | null;
  intensity: number;
}

const ADJUSTMENT_GROUPS: { label: string; items: { key: keyof Adjustments; label: string; icon: typeof Sun; min: number; max: number }[] }[] = [
  {
    label: 'Свет',
    items: [
      { key: 'brightness', label: 'Яркость', icon: Sun, min: -100, max: 100 },
      { key: 'contrast', label: 'Контраст', icon: Contrast, min: -100, max: 100 },
      { key: 'exposure', label: 'Экспозиция', icon: Aperture, min: -100, max: 100 },
      { key: 'highlights', label: 'Светлые участки', icon: Sun, min: -100, max: 100 },
      { key: 'shadows', label: 'Тени', icon: Circle, min: -100, max: 100 },
    ],
  },
  {
    label: 'Цвет',
    items: [
      { key: 'saturation', label: 'Насыщенность', icon: Droplets, min: -100, max: 100 },
      { key: 'temperature', label: 'Температура', icon: Thermometer, min: -100, max: 100 },
      { key: 'hue', label: 'Оттенок', icon: Palette, min: -180, max: 180 },
    ],
  },
  {
    label: 'Эффекты',
    items: [
      { key: 'sharpness', label: 'Резкость', icon: Focus, min: 0, max: 100 },
      { key: 'blur', label: 'Размытие', icon: Circle, min: 0, max: 100 },
      { key: 'vignette', label: 'Виньетка', icon: Aperture, min: 0, max: 100 },
      { key: 'grain', label: 'Зернистость', icon: Focus, min: 0, max: 100 },
      { key: 'fade', label: 'Выцветание', icon: Droplets, min: 0, max: 100 },
      { key: 'sepia', label: 'Сепия', icon: Palette, min: 0, max: 100 },
      { key: 'grayscale', label: 'Чёрно-белый', icon: Circle, min: 0, max: 100 },
    ],
  },
];

export function PhotoEditor({ settings, initialData }: PhotoEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(initialData?.src || null);
  const [adjustments, setAdjustments] = useState<Adjustments>(initialData?.adjustments || DEFAULT_ADJUSTMENTS);
  const [presetId, setPresetId] = useState<string | null>(initialData?.presetId || null);
  const [intensity, setIntensity] = useState(initialData?.intensity ?? 100);
  const [projectId] = useState(() => initialData?.projectId || generateId());
  const [createdAt] = useState(() => initialData?.createdAt || Date.now());
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (initialData?.src) {
      return [{ adjustments: initialData.adjustments || DEFAULT_ADJUSTMENTS, presetId: initialData.presetId || null, intensity: initialData.intensity ?? 100 }];
    }
    return [];
  });
  const [historyIndex, setHistoryIndex] = useState(() => initialData?.src ? 0 : -1);
  const [showBefore, setShowBefore] = useState(false);
  const [activeTab, setActiveTab] = useState<'adjust' | 'presets' | 'crop'>('adjust');
  const [presetSearch, setPresetSearch] = useState('');
  const [presetCategory, setPresetCategory] = useState<string>('all');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [cropAspect, setCropAspect] = useState<string>('free');
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const pushHistory = useCallback((adj: Adjustments, pid: string | null, intens: number) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ adjustments: { ...adj }, presetId: pid, intensity: intens });
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const snapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSnapshot = useCallback((adj: Adjustments, pid: string | null, intens: number) => {
    if (snapshotTimer.current) clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(() => pushHistory(adj, pid, intens), 600);
  }, [pushHistory]);

  const buildProject = useCallback((): CardProject => ({
    id: projectId,
    name: `Фото ${new Date(createdAt).toLocaleDateString('ru-RU')}`,
    description: '',
    type: 'photo',
    thumbnail: imageSrc ? imageSrc.slice(0, 50000) : undefined,
    createdAt,
    updatedAt: Date.now(),
    data: { src: imageSrc, adjustments, presetId, intensity },
  }), [projectId, createdAt, imageSrc, adjustments, presetId, intensity]);

  const { localStatus, cloudStatus, isOnline, scheduleSave } = useAutoSave(buildProject, settings.autoSave);

  const updateAdjustment = (key: keyof Adjustments, value: number) => {
    const next = { ...adjustments, [key]: value };
    setAdjustments(next);
    scheduleSnapshot(next, presetId, intensity);
    scheduleSave();
  };

  const resetAdjustment = (key: keyof Adjustments) => {
    const next = { ...adjustments, [key]: DEFAULT_ADJUSTMENTS[key] };
    setAdjustments(next);
    scheduleSnapshot(next, presetId, intensity);
  };

  const applyPreset = (preset: Preset) => {
    const newAdj = { ...DEFAULT_ADJUSTMENTS, ...preset.adjustments };
    setAdjustments(newAdj);
    setPresetId(preset.id);
    setIntensity(100);
    scheduleSnapshot(newAdj, preset.id, 100);
    scheduleSave();
  };

  const applyPresetOnTop = (preset: Preset) => {
    const next = { ...adjustments, ...preset.adjustments };
    setAdjustments(next);
    setPresetId(preset.id);
    scheduleSnapshot(next, preset.id, intensity);
    scheduleSave();
  };

  const undo = () => {
    if (historyIndex > 0) {
      const entry = history[historyIndex - 1];
      setAdjustments(entry.adjustments);
      setPresetId(entry.presetId);
      setIntensity(entry.intensity);
      setHistoryIndex(historyIndex - 1);
      scheduleSave();
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const entry = history[historyIndex + 1];
      setAdjustments(entry.adjustments);
      setPresetId(entry.presetId);
      setIntensity(entry.intensity);
      setHistoryIndex(historyIndex + 1);
      scheduleSave();
    }
  };

  const resetAll = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setPresetId(null);
    setIntensity(100);
    pushHistory(DEFAULT_ADJUSTMENTS, null, 100);
    scheduleSave();
  };

  const handleFile = (dataUrl: string) => {
    setImageSrc(dataUrl);
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setPresetId(null);
    setIntensity(100);
    setHistory([{ adjustments: DEFAULT_ADJUSTMENTS, presetId: null, intensity: 100 }]);
    setHistoryIndex(0);
    setTimeout(() => scheduleSave(), 100);
  };

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const doExport = async (format: 'png' | 'jpeg', quality: number) => {
    if (!imageSrc) return;
    setExporting(true);
    try {
      const blob = await exportPhotoBlob(imageSrc, adjustments, intensity / 100, format, quality);
      const filename = `fotobust-${Date.now()}.${format}`;
      const result = await shareOrDownloadBlob(blob, filename, `image/${format}`);
      if (result === 'cancelled') {
      } else if (result === 'shared' || result === 'downloaded') {
        const { sendLocalNotification } = await import('@/lib/nativeBridge');
        sendLocalNotification('FotoBust AI', 'Your photo is ready!').catch(() => {});
        setSaveStatus('saved');
        setSaveMessage(result === 'shared' ? 'Фото сохранено через системное меню' : 'Файл загружен. На iPhone: откройте Файлы → нажмите на файл → «Сохранить изображение»');
        setTimeout(() => { setSaveStatus('idle'); setSaveMessage(null); }, result === 'shared' ? 3000 : 5000);
      }
      setExportOpen(false);
    } catch (e) {
      console.error('Export failed:', e);
      setSaveStatus('error');
      setSaveMessage('Не удалось сохранить изображение. Возможно, оно слишком большое.');
      setTimeout(() => { setSaveStatus('idle'); setSaveMessage(null); }, 5000);
    } finally {
      setExporting(false);
    }
  };

  const doQuickSave = async () => {
    if (!imageSrc) return;
    setSaveStatus('saving');
    setSaveMessage(null);
    try {
      const blob = await exportPhotoBlob(imageSrc, adjustments, intensity / 100, 'jpeg', settings.exportQuality);
      const filename = `fotobust-${Date.now()}.jpg`;
      const result = await shareOrDownloadBlob(blob, filename, 'image/jpeg');
      if (result === 'cancelled') {
        setSaveStatus('idle');
      } else if (result === 'shared' || result === 'downloaded') {
        const { sendLocalNotification } = await import('@/lib/nativeBridge');
        sendLocalNotification('FotoBust AI', 'Your photo is ready!').catch(() => {});
        setSaveStatus('saved');
        setSaveMessage(result === 'shared' ? 'Фото сохранено через системное меню' : 'Файл загружен. На iPhone: откройте Файлы → нажмите на файл → «Сохранить изображение»');
        setTimeout(() => { setSaveStatus('idle'); setSaveMessage(null); }, result === 'shared' ? 3000 : 5000);
      }
    } catch (e) {
      console.error('Quick save failed:', e);
      setSaveStatus('error');
      setSaveMessage('Не удалось сохранить фото. Попробуйте экспорт в PNG.');
      setTimeout(() => { setSaveStatus('idle'); setSaveMessage(null); }, 5000);
    }
  };

  const filterString = buildFilterString(adjustments, intensity / 100);
  const tempOverlay = buildTemperatureOverlay(adjustments);
  const fadeOverlay = buildFadeOverlay(adjustments);
  const vignetteOpacity = buildVignetteOpacity(adjustments) * (intensity / 100);

  const filteredPresets = PRESETS.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(presetSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(presetSearch.toLowerCase());
    const matchesCategory = presetCategory === 'all' || p.category === presetCategory;
    return matchesSearch && matchesCategory;
  });

  const activePreset = presetId ? PRESETS.find((p) => p.id === presetId) : null;

  if (!imageSrc) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-24 md:pb-12">
        <div className="text-center mb-6">
          <h2 className="font-display text-2xl font-semibold text-ink mb-2">Фоторедактор</h2>
          <p className="text-sm text-ink-secondary">Загрузите фотографию для начала работы</p>
        </div>
        <FileDropZone onFile={handleFile} label="Перетащите фотографию сюда" />
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRESETS.slice(0, 4).map((p) => (
            <div key={p.id} className="card p-3">
              <p className="text-xs font-medium text-ink truncate">{p.name}</p>
              <p className="text-[10px] text-ink-secondary truncate">{p.category}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-ink-secondary mt-4">
          100 пресетов в 10 категориях доступны после загрузки фото
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-16 md:pb-0">
      <div className="flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-gold/15 bg-brand-dark flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={historyIndex <= 0} className="btn-ghost btn-sm" title="Отменить">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="btn-ghost btn-sm" title="Повторить">
            <Redo className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button onClick={resetAll} className="btn-ghost btn-sm" title="Сбросить все">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden md:inline">Сброс</span>
          </button>
          <button
            onMouseDown={() => setShowBefore(true)}
            onMouseUp={() => setShowBefore(false)}
            onMouseLeave={() => setShowBefore(false)}
            onTouchStart={() => setShowBefore(true)}
            onTouchEnd={() => setShowBefore(false)}
            className="btn-ghost btn-sm"
            title="Сравнить До/После"
          >
            {showBefore ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden md:inline">{showBefore ? 'До' : 'Сравнить'}</span>
          </button>
        </div>

        <div className="hidden md:flex items-center mx-2">
          <SaveStatus localStatus={localStatus} cloudStatus={cloudStatus} isOnline={isOnline} />
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setImageSrc(null)} className="btn-ghost btn-sm">
            <ImageIcon className="w-4 h-4" />
            <span className="hidden md:inline">Новое</span>
          </button>
          <button
            onClick={doQuickSave}
            disabled={saveStatus === 'saving'}
            className="btn-secondary btn-sm"
            title="Сохранить фото"
          >
            {saveStatus === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden md:inline">Сохранить</span>
          </button>
          <button onClick={() => setExportOpen(true)} className="btn-primary btn-sm">
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Экспорт</span>
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className={cn(
          'px-4 py-2 text-xs font-medium flex items-center gap-2 border-b',
          saveStatus === 'error' ? 'bg-error/10 text-error border-error/20' : 'bg-success/10 text-success border-success/20'
        )}>
          {saveStatus === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <Check className="w-4 h-4 flex-shrink-0" />}
          {saveMessage}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div
          ref={containerRef}
          className="flex-1 bg-ink/5 flex items-center justify-center overflow-auto relative min-h-[300px]"
        >
          <div
            className="relative inline-block"
            style={{ transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)` }}
          >
            {showBefore ? (
              <img
                src={imageSrc}
                alt="Оригинал"
                className="max-w-full max-h-[calc(100vh-220px)] object-contain"
                style={{ transform: `rotate(${adjustments.rotate}deg) scaleX(${adjustments.flipH ? -1 : 1}) scaleY(${adjustments.flipV ? -1 : 1})` }}
              />
            ) : (
              <div className="relative inline-block">
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Редактируемое фото"
                  className="max-w-full max-h-[calc(100vh-220px)] object-contain"
                  style={{
                    filter: filterString,
                    transform: `rotate(${adjustments.rotate}deg) scaleX(${adjustments.flipH ? -1 : 1}) scaleY(${adjustments.flipV ? -1 : 1})`,
                  }}
                />
                {tempOverlay && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: tempOverlay.color,
                      opacity: tempOverlay.opacity * (intensity / 100),
                      mixBlendMode: 'overlay',
                      transform: `rotate(${adjustments.rotate}deg) scaleX(${adjustments.flipH ? -1 : 1}) scaleY(${adjustments.flipV ? -1 : 1})`,
                    }}
                  />
                )}
                {fadeOverlay && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: fadeOverlay.color,
                      opacity: fadeOverlay.opacity * (intensity / 100),
                      mixBlendMode: 'overlay',
                    }}
                  />
                )}
                {vignetteOpacity > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-bg-cream rounded-xl shadow-soft p-1">
            <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))} className="w-7 h-7 rounded-lg hover:bg-bg flex items-center justify-center text-sm font-bold text-ink">-</button>
            <span className="text-xs text-ink-secondary w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="w-7 h-7 rounded-lg hover:bg-bg flex items-center justify-center text-sm font-bold text-ink">+</button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="w-7 h-7 rounded-lg hover:bg-bg flex items-center justify-center text-ink">
              <Crop className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="w-full md:w-80 bg-bg-cream border-t md:border-t-0 md:border-l border-border flex flex-col max-h-[50vh] md:max-h-none">
          <div className="flex border-b border-border">
            {([
              { key: 'adjust' as const, label: 'Настройки', icon: Sliders },
              { key: 'presets' as const, label: 'Пресеты', icon: ImageIcon },
              { key: 'crop' as const, label: 'Кадр', icon: Crop },
            ]).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                    activeTab === tab.key
                      ? 'text-brand border-b-2 border-brand'
                      : 'text-ink-secondary hover:text-ink'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'adjust' && (
              <div className="space-y-5">
                {ADJUSTMENT_GROUPS.map((group) => (
                  <div key={group.label}>
                    <h4 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2.5">{group.label}</h4>
                    <div className="space-y-3">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const value = adjustments[item.key] as number;
                        return (
                          <div key={item.key}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <Icon className="w-3.5 h-3.5 text-ink-secondary" />
                                <span className="text-xs font-medium text-ink">{item.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-ink-secondary tabular-nums">{value}</span>
                                {value !== DEFAULT_ADJUSTMENTS[item.key] && (
                                  <button
                                    onClick={() => resetAdjustment(item.key)}
                                    className="text-[10px] text-brand hover:underline"
                                  >
                                    сброс
                                  </button>
                                )}
                              </div>
                            </div>
                            <input
                              type="range"
                              min={item.min}
                              max={item.max}
                              value={value}
                              onChange={(e) => updateAdjustment(item.key, Number(e.target.value))}
                              className="slider"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div>
                  <h4 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2.5">Трансформация</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateAdjustment('rotate', (adjustments.rotate + 90) % 360)}
                      className="btn-secondary btn-sm"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Поворот
                    </button>
                    <button
                      onClick={() => { const n = { ...adjustments, flipH: !adjustments.flipH }; setAdjustments(n); scheduleSnapshot(n, presetId, intensity); }}
                      className="btn-secondary btn-sm"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      Отразить
                    </button>
                    <button
                      onClick={() => { const n = { ...adjustments, flipV: !adjustments.flipV }; setAdjustments(n); scheduleSnapshot(n, presetId, intensity); }}
                      className="btn-secondary btn-sm"
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                      Перевернуть
                    </button>
                    <button
                      onClick={() => updateAdjustment('rotate', 0)}
                      className="btn-secondary btn-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Сброс
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'presets' && (
              <div>
                <label htmlFor="preset-search" className="sr-only">Поиск пресетов</label>
                <input
                  id="preset-search"
                  type="text"
                  placeholder="Поиск пресетов..."
                  value={presetSearch}
                  onChange={(e) => setPresetSearch(e.target.value)}
                  className="input mb-3 text-sm"
                />
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <button
                    onClick={() => setPresetCategory('all')}
                    className={cn('chip', presetCategory === 'all' ? 'bg-brand text-white' : 'bg-bg text-ink-secondary')}
                  >
                    Все
                  </button>
                  {PRESET_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setPresetCategory(cat)}
                      className={cn('chip', presetCategory === cat ? 'bg-brand text-white' : 'bg-bg text-ink-secondary')}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {activePreset && (
                  <div className="card p-3 mb-3 bg-brand-light/30 border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-ink">{activePreset.name}</span>
                      <span className="text-xs text-ink-secondary tabular-nums">{intensity}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={intensity}
                      onChange={(e) => setIntensity(Number(e.target.value))}
                      className="slider"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {filteredPresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset)}
                      onContextMenu={(e) => { e.preventDefault(); applyPresetOnTop(preset); }}
                      className={cn(
                        'card p-2.5 text-left transition-all hover:shadow-medium',
                        presetId === preset.id ? 'ring-2 ring-brand border-0' : ''
                      )}
                    >
                      <div className="w-full aspect-square rounded-lg bg-brand-light/30 mb-2 overflow-hidden">
                        <img
                          src={imageSrc}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                          style={{ filter: buildFilterString({ ...DEFAULT_ADJUSTMENTS, ...preset.adjustments }, 1) }}
                        />
                      </div>
                      <p className="text-[11px] font-medium text-ink truncate">{preset.name}</p>
                      <p className="text-[9px] text-ink-secondary truncate">{preset.description}</p>
                    </button>
                  ))}
                </div>
                {filteredPresets.length === 0 && (
                  <p className="text-center text-sm text-ink-secondary py-8">Ничего не найдено</p>
                )}
                <p className="text-[10px] text-ink-secondary mt-3 text-center">
                  ПКМ — применить поверх текущих настроек
                </p>
              </div>
            )}

            {activeTab === 'crop' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-semibold text-ink-secondary uppercase tracking-wide mb-2.5">Пропорции</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'free', label: 'Свободные' },
                      { id: '1:1', label: '1:1 Квадрат' },
                      { id: '4:3', label: '4:3' },
                      { id: '3:2', label: '3:2' },
                      { id: '16:9', label: '16:9' },
                      { id: '9:16', label: '9:16 Story' },
                    ].map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => setCropAspect(ratio.id)}
                        className={cn(
                          'btn btn-sm',
                          cropAspect === ratio.id ? 'bg-brand text-white' : 'btn-secondary'
                        )}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="card p-3 bg-brand-light/30 border-0">
                  <p className="text-xs text-ink-secondary">
                    Обрезка будет доступна в следующем обновлении. Сейчас вы можете изменить пропорции при экспорте.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Экспорт изображения" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Формат</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => doExport('png', 1)}
                disabled={exporting}
                className="btn-secondary"
              >
                PNG (без потерь)
              </button>
              <button
                onClick={() => doExport('jpeg', settings.exportQuality)}
                disabled={exporting}
                className="btn-secondary"
              >
                JPEG ({Math.round(settings.exportQuality * 100)}%)
              </button>
            </div>
          </div>
          {exporting && (
            <p className="text-sm text-ink-secondary text-center">Обработка изображения...</p>
          )}
          <p className="text-xs text-ink-secondary text-center">
            Экспорт сохраняет исходное разрешение. На iPhone откроется системное меню «Поделиться» — выберите «Сохранить изображение».
          </p>
        </div>
      </Modal>
    </div>
  );
}
