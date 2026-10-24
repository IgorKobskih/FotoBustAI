import { useState } from 'react';
import { Layout } from 'lucide-react';
import type { CanvasLayer, CanvasSize, Settings } from '@/types';
import { SOCIAL_FORMATS, SOCIAL_LAYOUTS } from '@/lib/templates';
import { CardEditor } from '@/components/CardEditor';
import { Modal } from '@/components/Modal';

interface SocialToolsProps {
  settings: Settings;
  onSave?: (data: { size: CanvasSize; layers: CanvasLayer[]; thumbnail: string }) => void;
}

export function SocialTools({ settings, onSave }: SocialToolsProps) {
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [, setSelectedLayout] = useState<string | null>(null);
  const [editorData, setEditorData] = useState<{ size: CanvasSize; layers: CanvasLayer[] } | null>(null);

  const startWithFormat = (formatId: string) => {
    const format = SOCIAL_FORMATS.find((f) => f.id === formatId);
    if (!format) return;
    setSelectedFormat(formatId);
    setEditorData({
      size: { width: format.width, height: format.height },
      layers: SOCIAL_LAYOUTS.find((l) => l.id === 'layout-blank')!.build(format.width, format.height),
    });
  };

  const applyLayout = (layoutId: string) => {
    const format = SOCIAL_FORMATS.find((f) => f.id === selectedFormat);
    if (!format) return;
    const layout = SOCIAL_LAYOUTS.find((l) => l.id === layoutId);
    if (!layout) return;
    setEditorData({
      size: { width: format.width, height: format.height },
      layers: layout.build(format.width, format.height),
    });
    setSelectedLayout(layoutId);
  };

  if (editorData && selectedFormat) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gold/15 bg-brand-dark">
          <button onClick={() => { setEditorData(null); setSelectedFormat(null); setSelectedLayout(null); }} className="btn-ghost btn-sm">
            ← Форматы
          </button>
          <span className="text-sm text-white/60">
            {SOCIAL_FORMATS.find((f) => f.id === selectedFormat)?.name}
          </span>
        </div>
        <CardEditor settings={settings} initialData={{ ...editorData, name: 'social' }} onSave={onSave} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-ink mb-1">Контент для соцсетей</h2>
        <p className="text-sm text-ink-secondary">Посты, сторис, обложки, баннеры и рекламные креативы</p>
      </div>

      <h3 className="section-title mb-3">Форматы</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {SOCIAL_FORMATS.map((format) => (
          <button
            key={format.id}
            onClick={() => startWithFormat(format.id)}
            className="card p-4 text-left hover:shadow-medium hover:border-brand/30 transition-all group"
          >
            <div
              className="bg-brand-light/40 rounded-lg mb-3 flex items-center justify-center"
              style={{
                width: '100%',
                aspectRatio: `${format.width} / ${format.height}`,
                maxHeight: '80px',
              }}
            >
              <Layout className="w-5 h-5 text-brand/50" />
            </div>
            <p className="text-sm font-medium text-ink">{format.name}</p>
            <p className="text-xs text-ink-secondary">{format.width}×{format.height}</p>
          </button>
        ))}
      </div>

      {selectedFormat && (
        <Modal open={!!selectedFormat} onClose={() => setSelectedFormat(null)} title="Выберите макет">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SOCIAL_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                onClick={() => applyLayout(layout.id)}
                className="card p-3 text-left hover:shadow-medium transition-all"
              >
                <p className="text-sm font-medium text-ink">{layout.name}</p>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
