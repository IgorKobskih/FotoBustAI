import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Type, Square, Image as ImageIcon, Layers, Copy, Trash2, Lock, Unlock,
  Eye, EyeOff, ChevronUp, ChevronDown, Download, Plus, MousePointer2,
  ArrowUp, ArrowDown
} from 'lucide-react';
import type { CanvasLayer, CanvasSize, Settings, CardProject } from '@/types';
import { generateId, cn, shareOrDownloadBlob } from '@/lib/utils';
import { renderCanvasAsync, exportCanvas, exportCanvasBlob } from '@/lib/canvas';
import { CANVAS_PRESETS, PRODUCT_TEMPLATES, SERIES_CARD_TYPES } from '@/lib/templates';
import type { ProductTemplate } from '@/lib/templates';
import { FileDropZone } from '@/components/FileDropZone';
import { Modal, ConfirmDialog } from '@/components/Modal';
import { useAutoSave } from '@/lib/useAutoSave';
import { SaveStatus } from '@/components/SaveStatus';

interface CardEditorProps {
  settings: Settings;
  initialData?: { size: CanvasSize; layers: CanvasLayer[]; name: string };
  onSave?: (data: { size: CanvasSize; layers: CanvasLayer[]; thumbnail: string }) => void;
}

export function CardEditor({ settings, initialData, onSave }: CardEditorProps) {
  const [size, setSize] = useState<CanvasSize>(initialData?.size || { width: 1000, height: 1000 });
  const [layers, setLayers] = useState<CanvasLayer[]>(initialData?.layers || []);
  const [projectId] = useState(() => generateId());
  const [createdAt] = useState(() => Date.now());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, lx: 0, ly: 0, lw: 0, lh: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [activePanel, setActivePanel] = useState<'layers' | 'props' | 'templates'>('layers');
  const [templateModal, setTemplateModal] = useState(false);
  const [seriesModal, setSeriesModal] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<{ layers: CanvasLayer[]; size: CanvasSize }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const xRef = useRef(0);
  const yRef = useRef(0);

  const selected = layers.find((l) => l.id === selectedId) || null;

  const pushHistory = useCallback((newLayers: CanvasLayer[], newSize: CanvasSize) => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push({ layers: JSON.parse(JSON.stringify(newLayers)), size: { ...newSize } });
      if (next.length > 30) next.shift();
      return next;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const updateLayers = (newLayers: CanvasLayer[], snapshot = false) => {
    setLayers(newLayers);
    if (snapshot) pushHistory(newLayers, size);
    scheduleSave();
  };

  const buildProject = useCallback((): CardProject => ({
    id: projectId,
    name: initialData?.name || `Карточка ${new Date(createdAt).toLocaleDateString('ru-RU')}`,
    description: '',
    type: 'product-card',
    thumbnail: undefined,
    createdAt,
    updatedAt: Date.now(),
    data: { size, layers },
  }), [projectId, createdAt, initialData, size, layers]);

  const { localStatus, cloudStatus, isOnline, scheduleSave, saveNow } = useAutoSave(buildProject, settings.autoSave);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = size.width * canvasScale;
    canvas.height = size.height * canvasScale;
    renderCanvasAsync(ctx, size, layers, canvasScale);
  }, [layers, size, canvasScale]);

  useEffect(() => {
    const fit = () => {
      const container = containerRef.current;
      if (!container) return;
      const padding = 40;
      const maxW = container.clientWidth - padding;
      const maxH = container.clientHeight - padding;
      const scaleW = maxW / size.width;
      const scaleH = maxH / size.height;
      setCanvasScale(Math.min(scaleW, scaleH, 1));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [size]);

  const addTextLayer = () => {
    const layer: CanvasLayer = {
      id: generateId(), type: 'text', name: 'Текст',
      text: 'Новый текст', x: 100, y: 100, width: 300, height: 50,
      rotation: 0, opacity: 1, visible: true, locked: false,
      fontSize: 28, fontFamily: 'Inter', fontWeight: 400,
      color: '#292326', textAlign: 'left', lineHeight: 1.4,
    };
    updateLayers([...layers, layer], true);
    setSelectedId(layer.id);
    setActivePanel('props');
  };

  const addRectLayer = () => {
    const layer: CanvasLayer = {
      id: generateId(), type: 'rect', name: 'Прямоугольник',
      x: 100, y: 100, width: 200, height: 100,
      rotation: 0, opacity: 1, visible: true, locked: false,
      fill: '#800020', radius: 0,
    };
    updateLayers([...layers, layer], true);
    setSelectedId(layer.id);
    setActivePanel('props');
  };

  const addShapeLayer = () => {
    const layer: CanvasLayer = {
      id: generateId(), type: 'shape', name: 'Фигура',
      x: 100, y: 100, width: 150, height: 150,
      rotation: 0, opacity: 1, visible: true, locked: false,
      fill: '#800020', radius: 12,
    };
    updateLayers([...layers, layer], true);
    setSelectedId(layer.id);
    setActivePanel('props');
  };

  const addImageLayer = async (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const maxW = size.width * 0.6;
      const maxH = size.height * 0.6;
      const ratio = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const layer: CanvasLayer = {
        id: generateId(), type: 'image', name: 'Изображение',
        x: (size.width - w) / 2, y: (size.height - h) / 2, width: w, height: h,
        rotation: 0, opacity: 1, visible: true, locked: false,
        src: dataUrl,
      };
      updateLayers([...layers, layer], true);
      setSelectedId(layer.id);
    };
    img.src = dataUrl;
  };

  const deleteLayer = (id: string) => {
    updateLayers(layers.filter((l) => l.id !== id), true);
    if (selectedId === id) setSelectedId(null);
  };

  const duplicateLayer = (id: string) => {
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const copy = { ...layer, id: generateId(), x: layer.x + 20, y: layer.y + 20, name: `${layer.name} копия` };
    updateLayers([...layers, copy], true);
    setSelectedId(copy.id);
  };

  const toggleLock = (id: string) => {
    updateLayers(layers.map((l) => l.id === id ? { ...l, locked: !l.locked } : l), true);
  };

  const toggleVisible = (id: string) => {
    updateLayers(layers.map((l) => l.id === id ? { ...l, visible: !l.visible } : l), true);
  };

  const moveLayer = (id: string, dir: 'up' | 'down') => {
    const idx = layers.findIndex((l) => l.id === id);
    if (idx === -1) return;
    const newLayers = [...layers];
    if (dir === 'up' && idx < newLayers.length - 1) {
      [newLayers[idx], newLayers[idx + 1]] = [newLayers[idx + 1], newLayers[idx]];
    } else if (dir === 'down' && idx > 0) {
      [newLayers[idx], newLayers[idx - 1]] = [newLayers[idx - 1], newLayers[idx]];
    }
    updateLayers(newLayers, true);
  };

  const updateLayer = (id: string, props: Partial<CanvasLayer>) => {
    updateLayers(layers.map((l) => l.id === id ? { ...l, ...props } : l));
  };

  const applyTemplate = (template: ProductTemplate) => {
    setSize(template.size);
    const newLayers = template.layers();
    setLayers(newLayers);
    setSelectedId(null);
    pushHistory(newLayers, template.size);
    setTemplateModal(false);
    scheduleSave();
  };

  const selectLayerAt = (x: number, y: number, clientX: number, clientY: number) => {
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (!l.visible) continue;
      if (x >= l.x && x <= l.x + l.width && y >= l.y && y <= l.y + l.height) {
        setSelectedId(l.id);
        if (!l.locked) {
          setDragging(true);
          setDragStart({ x: clientX, y: clientY, lx: l.x, ly: l.y, lw: l.width, lh: l.height });
        }
        return;
      }
    }
    setSelectedId(null);
  };

  useEffect(() => {
    if (!dragging && !resizing) return;
    const handleMove = (e: MouseEvent) => {
      if (!selected) return;
      const dx = (e.clientX - dragStart.x) / canvasScale;
      const dy = (e.clientY - dragStart.y) / canvasScale;
      if (dragging) {
        updateLayer(selected.id, { x: dragStart.lx + dx, y: dragStart.ly + dy });
      } else if (resizing) {
        updateLayer(selected.id, {
          width: Math.max(20, dragStart.lw + dx),
          height: Math.max(20, dragStart.lh + dy),
        });
      }
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (!selected) return;
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      const dx = (t.clientX - dragStart.x) / canvasScale;
      const dy = (t.clientY - dragStart.y) / canvasScale;
      if (dragging) {
        updateLayer(selected.id, { x: dragStart.lx + dx, y: dragStart.ly + dy });
      } else if (resizing) {
        updateLayer(selected.id, {
          width: Math.max(20, dragStart.lw + dx),
          height: Math.max(20, dragStart.lh + dy),
        });
      }
    };
    const handleUp = () => {
      if (dragging || resizing) {
        pushHistory(layers, size);
      }
      setDragging(false);
      setResizing(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, resizing, dragStart, selected, canvasScale, layers, size]);

  const undo = () => {
    if (historyIndex > 0) {
      const entry = history[historyIndex - 1];
      setLayers(JSON.parse(JSON.stringify(entry.layers)));
      setSize(entry.size);
      setHistoryIndex(historyIndex - 1);
      scheduleSave();
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const entry = history[historyIndex + 1];
      setLayers(JSON.parse(JSON.stringify(entry.layers)));
      setSize(entry.size);
      setHistoryIndex(historyIndex + 1);
      scheduleSave();
    }
  };

  const doExport = async (format: 'png' | 'jpeg', quality: number) => {
    setExporting(true);
    try {
      const blob = await exportCanvasBlob(size, layers, format, quality);
      const filename = `card-${Date.now()}.${format}`;
      await shareOrDownloadBlob(blob, filename, `image/${format}`);
      setExportOpen(false);
    } catch {
      alert('Не удалось экспортировать карточку.');
    } finally {
      setExporting(false);
    }
  };

  const doSave = async () => {
    await saveNow();
    if (onSave) {
      const result = await exportCanvas(size, layers, 'jpeg', 0.7);
      onSave({ size, layers, thumbnail: result });
    }
  };

  const changeCanvasSize = (preset: typeof CANVAS_PRESETS[0]) => {
    setSize({ width: preset.width, height: preset.height });
    pushHistory(layers, { width: preset.width, height: preset.height });
    scheduleSave();
  };

  return (
    <div className="flex flex-col h-full pb-16 md:pb-0">
      <div className="flex items-center justify-between px-3 md:px-5 py-2.5 border-b border-gold/15 bg-brand-dark flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button onClick={addTextLayer} className="btn-ghost btn-sm" title="Текст">
            <Type className="w-4 h-4" />
          </button>
          <button onClick={addRectLayer} className="btn-ghost btn-sm" title="Прямоугольник">
            <Square className="w-4 h-4" />
          </button>
          <button onClick={addShapeLayer} className="btn-ghost btn-sm" title="Фигура">
            <Plus className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button onClick={undo} disabled={historyIndex <= 0} className="btn-ghost btn-sm" title="Отменить">
            <ArrowUp className="w-4 h-4 rotate-90" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="btn-ghost btn-sm" title="Повторить">
            <ArrowDown className="w-4 h-4 rotate-90" />
          </button>
          <div className="w-px h-5 bg-border mx-1" />
          <button onClick={() => setTemplateModal(true)} className="btn-ghost btn-sm">
            <Layers className="w-4 h-4" />
            <span className="hidden md:inline">Шаблоны</span>
          </button>
          <button onClick={() => setSeriesModal(true)} className="btn-ghost btn-sm">
            <Copy className="w-4 h-4" />
            <span className="hidden md:inline">Серия</span>
          </button>
        </div>

        <div className="hidden md:flex items-center mx-2">
          <SaveStatus localStatus={localStatus} cloudStatus={cloudStatus} isOnline={isOnline} />
        </div>

        <div className="flex items-center gap-1">
          <select
            value={CANVAS_PRESETS.find((p) => p.width === size.width && p.height === size.height)?.id || ''}
            onChange={(e) => {
              const preset = CANVAS_PRESETS.find((p) => p.id === e.target.value);
              if (preset) changeCanvasSize(preset);
            }}
            className="text-xs border border-border rounded-lg px-2 py-1.5 bg-bg-cream text-ink"
          >
            <option value="">Размер...</option>
            {CANVAS_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {onSave && (
            <button onClick={doSave} className="btn-secondary btn-sm">
              Сохранить
            </button>
          )}
          <button onClick={() => setExportOpen(true)} className="btn-primary btn-sm">
            <Download className="w-4 h-4" />
            Экспорт
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <div
          ref={containerRef}
          className="flex-1 bg-ink/5 flex items-center justify-center overflow-hidden relative min-h-[300px]"
          onClick={(e) => {
            if (e.target === containerRef.current || e.target === canvasRef.current?.parentElement) {
              setSelectedId(null);
            }
          }}
        >
          <div
            className="relative bg-bg-cream shadow-medium touch-none"
            style={{
              width: size.width * canvasScale,
              height: size.height * canvasScale,
            }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 touch-none"
              onMouseDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                xRef.current = (e.clientX - rect.left) / canvasScale;
                yRef.current = (e.clientY - rect.top) / canvasScale;
                selectLayerAt(xRef.current, yRef.current, e.clientX, e.clientY);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                const t = e.touches[0];
                if (!t) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = (t.clientX - rect.left) / canvasScale;
                const y = (t.clientY - rect.top) / canvasScale;
                selectLayerAt(x, y, t.clientX, t.clientY);
              }}
            />
            {selected && selected.visible && (
              <div
                className="absolute border-2 border-brand pointer-events-none"
                style={{
                  left: selected.x * canvasScale,
                  top: selected.y * canvasScale,
                  width: selected.width * canvasScale,
                  height: selected.height * canvasScale,
                }}
              >
                <div
                  className="absolute -bottom-2 -right-2 w-5 h-5 bg-brand rounded-sm pointer-events-auto cursor-se-resize touch-none flex items-center justify-center md:w-3 md:h-3"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setResizing(true);
                    setDragStart({ x: e.clientX, y: e.clientY, lx: selected.x, ly: selected.y, lw: selected.width, lh: selected.height });
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setResizing(true);
                    const t = e.touches[0];
                    if (!t) return;
                    setDragStart({ x: t.clientX, y: t.clientY, lx: selected.x, ly: selected.y, lw: selected.width, lh: selected.height });
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-72 bg-bg-cream border-t md:border-t-0 md:border-l border-border flex flex-col max-h-[45vh] md:max-h-none">
          <div className="flex border-b border-border">
            {([
              { key: 'layers' as const, label: 'Слои', icon: Layers },
              { key: 'props' as const, label: 'Свойства', icon: MousePointer2 },
              { key: 'templates' as const, label: 'Шаблоны', icon: ImageIcon },
            ]).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActivePanel(tab.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                    activePanel === tab.key ? 'text-brand border-b-2 border-brand' : 'text-ink-secondary hover:text-ink'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {activePanel === 'layers' && (
              <div>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <button onClick={addTextLayer} className="btn-secondary btn-sm flex-col gap-1 py-2">
                    <Type className="w-4 h-4" />
                    <span className="text-[10px]">Текст</span>
                  </button>
                  <button onClick={addRectLayer} className="btn-secondary btn-sm flex-col gap-1 py-2">
                    <Square className="w-4 h-4" />
                    <span className="text-[10px]">Прямо</span>
                  </button>
                  <button onClick={addShapeLayer} className="btn-secondary btn-sm flex-col gap-1 py-2">
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px]">Фигура</span>
                  </button>
                </div>
                <FileDropZone onFile={addImageLayer} compact className="mb-3" />
                <div className="space-y-1">
                  {[...layers].reverse().map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedId(layer.id)}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors',
                        selectedId === layer.id ? 'bg-brand-light/50' : 'hover:bg-bg'
                      )}
                    >
                      <span className="text-xs font-medium text-ink flex-1 truncate">{layer.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); }} className="text-ink-secondary hover:text-ink">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); }} className="text-ink-secondary hover:text-ink">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleVisible(layer.id); }} className="text-ink-secondary hover:text-ink">
                        {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); toggleLock(layer.id); }} className="text-ink-secondary hover:text-ink">
                        {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }} className="text-ink-secondary hover:text-ink">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(layer.id); }} className="text-error hover:text-error/80">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {layers.length === 0 && (
                    <p className="text-center text-sm text-ink-secondary py-8">
                      Нет слоёв. Добавьте текст или фигуру.
                    </p>
                  )}
                </div>
              </div>
            )}

            {activePanel === 'props' && (
              <LayerProps layer={selected} onUpdate={(props) => selectedId && updateLayer(selectedId, props)} onSnapshot={() => pushHistory(layers, size)} />
            )}

            {activePanel === 'templates' && (
              <div className="space-y-2">
                <p className="text-xs text-ink-secondary mb-2">Выберите шаблон для быстрого старта</p>
                {PRODUCT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => applyTemplate(tpl)}
                    className="w-full card p-3 text-left hover:shadow-medium transition-all"
                  >
                    <p className="text-sm font-medium text-ink">{tpl.name}</p>
                    <p className="text-xs text-ink-secondary">{tpl.description}</p>
                    <p className="text-[10px] text-brand mt-1">{tpl.size.width}x{tpl.size.height}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={templateModal} onClose={() => setTemplateModal(false)} title="Шаблоны карточек" size="lg">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PRODUCT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => applyTemplate(tpl)}
              className="card p-4 text-left hover:shadow-medium transition-all"
            >
              <p className="text-sm font-medium text-ink mb-1">{tpl.name}</p>
              <p className="text-xs text-ink-secondary">{tpl.description}</p>
              <div className="mt-2 text-[10px] text-brand">{tpl.size.width}x{tpl.size.height}</div>
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={seriesModal} onClose={() => setSeriesModal(false)} title="Серия карточек товара" size="lg">
        <p className="text-sm text-ink-secondary mb-4">
          Создайте серию из связанных карточек для одного товара. Общий стиль и цвета сохранятся между карточками.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SERIES_CARD_TYPES.map((cardType) => (
            <button
              key={cardType.id}
              onClick={() => {
                const tpl = cardType.templateId ? PRODUCT_TEMPLATES.find((t) => t.id === cardType.templateId) : null;
                if (tpl) applyTemplate(tpl);
                setSeriesModal(false);
              }}
              className="card p-3 text-left hover:shadow-medium transition-all"
            >
              <p className="text-sm font-medium text-ink">{cardType.name}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-secondary mt-4">
          Каждая карточка открывается в редакторе. Сохраните проект для каждой карточки отдельно.
        </p>
      </Modal>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Экспорт карточки" size="sm">
        <div className="space-y-3">
          <button onClick={() => doExport('png', 1)} disabled={exporting} className="btn-secondary w-full justify-center">
            PNG (без потерь)
          </button>
          <button onClick={() => doExport('jpeg', settings.exportQuality)} disabled={exporting} className="btn-secondary w-full justify-center">
            JPEG ({Math.round(settings.exportQuality * 100)}%)
          </button>
          {exporting && <p className="text-sm text-ink-secondary text-center">Экспорт...</p>}
          <p className="text-xs text-ink-secondary text-center">Размер: {size.width}x{size.height}px</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Удалить слой?"
        message="Слой будет удалён без возможности восстановления через отмену."
        confirmLabel="Удалить"
        danger
        onConfirm={() => { if (confirmDelete) deleteLayer(confirmDelete); setConfirmDelete(null); }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function LayerProps({ layer, onUpdate, onSnapshot }: {
  layer: CanvasLayer | null;
  onUpdate: (props: Partial<CanvasLayer>) => void;
  onSnapshot: () => void;
}) {
  if (!layer) {
    return <p className="text-center text-sm text-ink-secondary py-8">Выберите слой для редактирования</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Название</label>
        <input
          type="text"
          value={layer.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          onBlur={onSnapshot}
          className="input"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">X</label>
          <input type="number" value={Math.round(layer.x)} onChange={(e) => onUpdate({ x: Number(e.target.value) })} onBlur={onSnapshot} className="input" />
        </div>
        <div>
          <label className="label">Y</label>
          <input type="number" value={Math.round(layer.y)} onChange={(e) => onUpdate({ y: Number(e.target.value) })} onBlur={onSnapshot} className="input" />
        </div>
        <div>
          <label className="label">Ширина</label>
          <input type="number" value={Math.round(layer.width)} onChange={(e) => onUpdate({ width: Number(e.target.value) })} onBlur={onSnapshot} className="input" />
        </div>
        <div>
          <label className="label">Высота</label>
          <input type="number" value={Math.round(layer.height)} onChange={(e) => onUpdate({ height: Number(e.target.value) })} onBlur={onSnapshot} className="input" />
        </div>
      </div>

      <div>
        <label className="label">Поворот: {layer.rotation}°</label>
        <input type="range" min={-180} max={180} value={layer.rotation} onChange={(e) => onUpdate({ rotation: Number(e.target.value) })} onMouseUp={onSnapshot} onTouchEnd={onSnapshot} className="slider" />
      </div>

      <div>
        <label className="label">Прозрачность: {Math.round(layer.opacity * 100)}%</label>
        <input type="range" min={0} max={100} value={layer.opacity * 100} onChange={(e) => onUpdate({ opacity: Number(e.target.value) / 100 })} onMouseUp={onSnapshot} onTouchEnd={onSnapshot} className="slider" />
      </div>

      {layer.type === 'text' && (
        <>
          <div>
            <label className="label">Текст</label>
            <textarea
              value={layer.text || ''}
              onChange={(e) => onUpdate({ text: e.target.value })}
              onBlur={onSnapshot}
              className="input min-h-[60px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Размер шрифта</label>
              <input type="number" value={layer.fontSize || 24} onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })} onBlur={onSnapshot} className="input" />
            </div>
            <div>
              <label className="label">Вес</label>
              <select value={layer.fontWeight || 400} onChange={(e) => onUpdate({ fontWeight: Number(e.target.value) })} onBlur={onSnapshot} className="input">
                <option value={300}>Лёгкий</option>
                <option value={400}>Обычный</option>
                <option value={500}>Средний</option>
                <option value={600}>Полужирный</option>
                <option value={700}>Жирный</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Шрифт</label>
            <select value={layer.fontFamily || 'Inter'} onChange={(e) => onUpdate({ fontFamily: e.target.value })} onBlur={onSnapshot} className="input">
              <option value="Inter">Inter</option>
              <option value="Playfair Display">Playfair Display</option>
              <option value="Georgia">Georgia</option>
              <option value="system-ui">System</option>
            </select>
          </div>
          <div>
            <label className="label">Цвет</label>
            <div className="flex items-center gap-2">
              <input type="color" value={layer.color || '#292326'} onChange={(e) => onUpdate({ color: e.target.value })} onBlur={onSnapshot} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
              <input type="text" value={layer.color || '#292326'} onChange={(e) => onUpdate({ color: e.target.value })} onBlur={onSnapshot} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Выравнивание</label>
            <div className="grid grid-cols-3 gap-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  onClick={() => { onUpdate({ textAlign: align }); onSnapshot(); }}
                  className={cn('btn btn-sm', layer.textAlign === align ? 'bg-brand text-white' : 'btn-secondary')}
                >
                  {align === 'left' ? 'Лево' : align === 'center' ? 'Центр' : 'Право'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Межстрочный: {layer.lineHeight || 1.4}</label>
            <input type="range" min={1} max={3} step={0.1} value={layer.lineHeight || 1.4} onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) })} onMouseUp={onSnapshot} onTouchEnd={onSnapshot} className="slider" />
          </div>
        </>
      )}

      {(layer.type === 'rect' || layer.type === 'shape') && (
        <>
          <div>
            <label className="label">Цвет заливки</label>
            <div className="flex items-center gap-2">
              <input type="color" value={layer.fill || '#800020'} onChange={(e) => onUpdate({ fill: e.target.value })} onBlur={onSnapshot} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
              <input type="text" value={layer.fill || '#800020'} onChange={(e) => onUpdate({ fill: e.target.value })} onBlur={onSnapshot} className="input" />
            </div>
          </div>
          {layer.type === 'shape' && (
            <div>
              <label className="label">Скругление: {layer.radius || 0}px</label>
              <input type="range" min={0} max={100} value={layer.radius || 0} onChange={(e) => onUpdate({ radius: Number(e.target.value) })} onMouseUp={onSnapshot} onTouchEnd={onSnapshot} className="slider" />
            </div>
          )}
        </>
      )}

      {layer.type === 'image' && (
        <p className="text-xs text-ink-secondary">Изображение {Math.round(layer.width)}x{Math.round(layer.height)}</p>
      )}
    </div>
  );
}
