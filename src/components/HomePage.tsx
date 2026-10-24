import { Image, Package, Layers, Share2, Video, FolderOpen, Sparkles, ArrowRight } from 'lucide-react';
import type { ViewKey } from '@/types';
import { getAllProjects } from '@/lib/storage';
import { useEffect, useState } from 'react';
import type { CardProject } from '@/types';
import { formatDate } from '@/lib/utils';

interface HomePageProps {
  onNavigate: (key: ViewKey) => void;
  onOpenProject: (project: CardProject) => void;
}

const QUICK_ACTIONS: { key: ViewKey; label: string; desc: string; icon: typeof Image; color: string }[] = [
  { key: 'photo-editor', label: 'Обработать фото', desc: 'Редактор с фильтрами и пресетами', icon: Image, color: 'bg-brand' },
  { key: 'product-cards', label: 'Создать карточку товара', desc: 'Конструктор для маркетплейсов', icon: Package, color: 'bg-brand-dark' },
  { key: 'product-cards', label: 'Создать серию карточек', desc: 'Серия из 8 карточек товара', icon: Layers, color: 'bg-brand-dark' },
  { key: 'social', label: 'Контент для соцсетей', desc: 'Посты, сторис, обложки', icon: Share2, color: 'bg-brand-deep' },
  { key: 'video-editor', label: 'Редактировать видео', desc: 'Обрезка, текст, обложка', icon: Video, color: 'bg-brand-deep' },
  { key: 'projects', label: 'Открыть проект', desc: 'Продолжить работу', icon: FolderOpen, color: 'bg-brand-deep' },
  { key: 'ai-assistant', label: 'ИИ-помощник', desc: 'Поможет с любой задачей', icon: Sparkles, color: 'bg-brand' },
];

export function HomePage({ onNavigate, onOpenProject }: HomePageProps) {
  const [recent, setRecent] = useState<CardProject[]>([]);

  useEffect(() => {
    getAllProjects().then(setRecent);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-24 md:pb-10">
      <div className="card-burgundy p-8 md:p-12 text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 text-gold text-xs font-semibold mb-5">
          <Sparkles className="w-3.5 h-3.5" />
          Новое поколение фотоинструментов
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-semibold text-white leading-tight">
          Твои фотографии.<br />
          Твои идеи.<br />
          <span className="text-gold">Твой стиль.</span>
        </h1>
        <p className="text-white/60 text-sm md:text-base mt-4 max-w-xl mx-auto">
          Обработка фото, карточки товаров, контент для соцсетей и видео — в одном приложении.
        </p>
        <div className="gold-line mt-6 max-w-xs mx-auto" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {QUICK_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              onClick={() => onNavigate(action.key)}
              className="card p-5 text-left hover:shadow-medium hover:border-brand/30 transition-all duration-200 group animate-slide-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center mb-3 shadow-soft`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-ink text-sm mb-1">{action.label}</h3>
              <p className="text-xs text-ink-secondary">{action.desc}</p>
              <ArrowRight className="w-4 h-4 text-gold mt-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          );
        })}
      </div>

      {recent.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Недавние проекты</h2>
            <button onClick={() => onNavigate('projects')} className="text-sm text-brand hover:underline">Все проекты</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {recent.slice(0, 4).map((proj) => (
              <button key={proj.id} onClick={() => onOpenProject(proj)} className="card overflow-hidden text-left hover:shadow-medium transition-all group">
                <div className="aspect-square bg-brand-light/30 flex items-center justify-center">
                  {proj.thumbnail ? <img src={proj.thumbnail} alt={proj.name} className="w-full h-full object-cover" /> : <FolderOpen className="w-8 h-8 text-brand/40" />}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-ink truncate">{proj.name}</p>
                  <p className="text-xs text-ink-secondary mt-0.5">{formatDate(proj.updatedAt)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center mb-2"><Image className="w-4 h-4 text-brand" /></div>
          <h3 className="font-semibold text-sm text-ink mb-1">100 пресетов</h3>
          <p className="text-xs text-ink-secondary">10 категорий с реальными параметрами обработки</p>
        </div>
        <div className="card p-5">
          <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center mb-2"><Package className="w-4 h-4 text-brand" /></div>
          <h3 className="font-semibold text-sm text-ink mb-1">Карточки товаров</h3>
          <p className="text-xs text-ink-secondary">Конструктор с шаблонами для маркетплейсов</p>
        </div>
        <div className="card p-5">
          <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center mb-2"><Sparkles className="w-4 h-4 text-brand" /></div>
          <h3 className="font-semibold text-sm text-ink mb-1">ИИ-помощник</h3>
          <p className="text-xs text-ink-secondary">Единый чат для работы со всеми разделами</p>
        </div>
      </div>
    </div>
  );
}
