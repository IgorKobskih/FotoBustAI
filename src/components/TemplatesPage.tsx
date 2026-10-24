import { useState } from 'react';
import { LayoutTemplate, Package, Share2, Image as ImageIcon } from 'lucide-react';
import type { ViewKey, Settings } from '@/types';
import { PRESETS, PRESET_CATEGORIES } from '@/lib/presets';
import { PRODUCT_TEMPLATES, SOCIAL_FORMATS } from '@/lib/templates';
import type { ProductTemplate } from '@/lib/templates';
import { buildFilterString, cn } from '@/lib/utils';
import { DEFAULT_ADJUSTMENTS } from '@/types';

interface TemplatesPageProps { onNavigate: (key: ViewKey) => void; settings: Settings; }

type Tab = 'presets' | 'product' | 'social';

export function TemplatesPage({ onNavigate }: TemplatesPageProps) {
  const [tab, setTab] = useState<Tab>('presets');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const filteredPresets = PRESETS.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || p.category === category;
    return matchSearch && matchCat;
  });
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
      <div className="mb-6"><h2 className="font-display text-2xl font-semibold text-ink mb-1">Шаблоны</h2><p className="text-sm text-ink-secondary">Пресеты, шаблоны карточек и форматы соцсетей</p></div>
      <div className="flex gap-2 mb-4">
        {([{ key: 'presets' as Tab, label: 'Пресеты', icon: ImageIcon }, { key: 'product' as Tab, label: 'Карточки товаров', icon: Package }, { key: 'social' as Tab, label: 'Соцсети', icon: Share2 }]).map((t) => { const Icon = t.icon; return <button key={t.key} onClick={() => setTab(t.key)} className={cn('btn btn-sm', tab === t.key ? 'bg-brand text-white' : 'btn-secondary')}><Icon className="w-3.5 h-3.5" />{t.label}</button>; })}
      </div>
      {tab === 'presets' && (
        <div>
          <input type="text" placeholder="Поиск пресетов..." value={search} onChange={(e) => setSearch(e.target.value)} className="input mb-3" />
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button onClick={() => setCategory('all')} className={cn('chip', category === 'all' ? 'bg-brand text-white' : 'bg-bg text-ink-secondary')}>Все ({PRESETS.length})</button>
            {PRESET_CATEGORIES.map((cat) => <button key={cat} onClick={() => setCategory(cat)} className={cn('chip', category === cat ? 'bg-brand text-white' : 'bg-bg text-ink-secondary')}>{cat}</button>)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredPresets.map((preset) => (
              <div key={preset.id} className="card p-3">
                <div className="w-full aspect-square rounded-lg bg-brand-light/30 mb-2 overflow-hidden relative">
                  <div className="w-full h-full" style={{ filter: buildFilterString({ ...DEFAULT_ADJUSTMENTS, ...preset.adjustments }, 1) }}><div className="w-full h-full bg-gradient-to-br from-brand-light via-bg-cream to-brand-light/60" /></div>
                </div>
                <p className="text-sm font-medium text-ink truncate">{preset.name}</p>
                <p className="text-[10px] text-ink-secondary truncate">{preset.description}</p>
                <p className="text-[10px] text-brand mt-0.5">{preset.category}</p>
              </div>
            ))}
          </div>
          <button onClick={() => onNavigate('photo-editor')} className="btn-primary btn-sm mt-4 mx-auto block">Открыть фоторедактор</button>
        </div>
      )}
      {tab === 'product' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PRODUCT_TEMPLATES.map((tpl: ProductTemplate) => (
            <button key={tpl.id} onClick={() => onNavigate('product-cards')} className="card p-4 text-left hover:shadow-medium transition-all">
              <p className="text-sm font-medium text-ink mb-1">{tpl.name}</p>
              <p className="text-xs text-ink-secondary">{tpl.description}</p>
              <div className="flex items-center justify-between mt-2"><span className="text-[10px] text-brand">{tpl.size.width}×{tpl.size.height}</span><span className="chip bg-brand-light/40 text-brand text-[10px]">{tpl.category}</span></div>
            </button>
          ))}
        </div>
      )}
      {tab === 'social' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {SOCIAL_FORMATS.map((format) => (
            <button key={format.id} onClick={() => onNavigate('social')} className="card p-4 text-left hover:shadow-medium transition-all">
              <div className="bg-brand-light/40 rounded-lg mb-3 flex items-center justify-center" style={{ aspectRatio: `${format.width} / ${format.height}`, maxHeight: '70px' }}><LayoutTemplate className="w-5 h-5 text-brand/50" /></div>
              <p className="text-sm font-medium text-ink">{format.name}</p>
              <p className="text-xs text-ink-secondary">{format.width}×{format.height}</p>
              <span className="chip bg-brand-light/40 text-brand text-[10px] mt-1">{format.platform}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
