import { type ReactNode } from 'react';
import { Home, Image, Package, Share2, Video, FolderOpen, LayoutTemplate, Sparkles, Settings, CreditCard, Camera, User, LogOut } from 'lucide-react';
import type { ViewKey, EditorMode } from '@/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

interface NavItem { key: ViewKey; label: string; icon: typeof Home; }

const NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Главная', icon: Home },
  { key: 'photo-editor', label: 'Фоторедактор', icon: Image },
  { key: 'product-cards', label: 'Карточки товаров', icon: Package },
  { key: 'social', label: 'Социальные сети', icon: Share2 },
  { key: 'video-editor', label: 'Видеоредактор', icon: Video },
  { key: 'projects', label: 'Мои проекты', icon: FolderOpen },
  { key: 'templates', label: 'Шаблоны', icon: LayoutTemplate },
  { key: 'ai-assistant', label: 'ИИ-помощник', icon: Sparkles },
  { key: 'settings', label: 'Настройки', icon: Settings },
  { key: 'pricing', label: 'Тарифы', icon: CreditCard },
];

interface SidebarProps { current: ViewKey; onNavigate: (key: ViewKey) => void; mode: EditorMode; }

export function Sidebar({ current, onNavigate }: SidebarProps) {
  const { user, signOut } = useAuth();
  return (
    <aside className="w-64 bg-brand-dark border-r border-white/10 flex flex-col h-dvh sticky top-0 no-select scroll-dark">
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-burgundy ring-1 ring-gold/30"><Camera className="w-5 h-5 text-white" /></div>
          <div><h1 className="font-display text-lg font-semibold text-white leading-none">FotoBust AI</h1><p className="text-[11px] text-gold/70 mt-0.5">Фото · Карточки · Видео</p></div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5 scroll-dark">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200', active ? 'bg-brand text-white shadow-burgundy ring-1 ring-gold/20' : 'text-white/60 hover:bg-white/10 hover:text-white')}>
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />{item.label}
            </button>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10">
        {user ? (
          <div className="space-y-2">
            <div className="rounded-xl bg-white/5 p-3 border border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-gold" /></div>
                <div className="min-w-0 flex-1"><p className="text-xs text-white truncate font-medium">{user.email}</p><p className="text-[10px] text-gold mt-0.5">Облако подключено</p></div>
              </div>
            </div>
            <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"><LogOut className="w-3.5 h-3.5" />Выйти</button>
          </div>
        ) : (
          <div className="rounded-xl bg-white/5 p-3 border border-white/10"><p className="text-xs text-white/50">Версия 1.0</p><p className="text-xs text-gold mt-0.5 font-medium">Локальный режим</p></div>
        )}
      </div>
    </aside>
  );
}

const MOBILE_NAV_ITEMS: NavItem[] = [
  { key: 'home', label: 'Главная', icon: Home },
  { key: 'photo-editor', label: 'Фото', icon: Image },
  { key: 'product-cards', label: 'Карточки', icon: Package },
  { key: 'social', label: 'Соцсети', icon: Share2 },
  { key: 'projects', label: 'Проекты', icon: FolderOpen },
];

export function MobileNav({ current, onNavigate }: MobileNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-dark border-t border-gold/20 z-50 no-select">
      <div className="flex items-center justify-around px-2 py-1.5 safe-area">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return <button key={item.key} onClick={() => onNavigate(item.key)} className={cn('flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-[56px]', active ? 'text-gold' : 'text-white/50')}><Icon className="w-[20px] h-[20px]" /><span className="text-[10px] font-medium">{item.label}</span></button>;
        })}
      </div>
    </nav>
  );
}

interface MobileMoreMenuProps { onNavigate: (key: ViewKey) => void; onClose: () => void; open?: boolean; }

export function MobileMoreMenu({ onNavigate, onClose, open }: MobileMoreMenuProps) {
  const moreItems = NAV_ITEMS.filter((item) => !MOBILE_NAV_ITEMS.some((m) => m.key === item.key));
  if (!open) return null;
  return (
    <div className="md:hidden fixed inset-0 z-50 bg-black/40 flex items-end" onClick={onClose}>
      <div className="w-full bg-brand-dark rounded-t-3xl p-5 animate-slide-up max-h-[70vh] overflow-y-auto scroll-dark border-t border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <h3 className="section-title-light mb-3">Все разделы</h3>
        <div className="grid grid-cols-2 gap-2">
          {moreItems.map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => { onNavigate(item.key); onClose(); }} className="flex items-center gap-2.5 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"><Icon className="w-5 h-5 text-white/80 flex-shrink-0" /><span className="text-sm font-medium text-white/90">{item.label}</span></button>; })}
        </div>
      </div>
    </div>
  );
}

interface TopBarProps { title: string; actions?: ReactNode; onMore?: () => void; }

export function TopBar({ title, actions, onMore }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-brand-dark/90 backdrop-blur-md border-b border-gold/15">
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onMore} className="md:hidden w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center"><LayoutTemplate className="w-4 h-4 text-white/80" /></button>
          <h2 className="text-base md:text-lg font-semibold text-white">{title}</h2>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
