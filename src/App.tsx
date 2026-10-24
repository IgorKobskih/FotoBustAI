import { useState, useEffect, useCallback } from 'react';
import type { ViewKey, Settings, CardProject, CanvasLayer, CanvasSize, Adjustments } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { Sidebar, MobileNav, MobileMoreMenu, TopBar } from '@/components/Shell';
import { HomePage } from '@/components/HomePage';
import { PhotoEditor } from '@/components/PhotoEditor';
import { CardEditor } from '@/components/CardEditor';
import { SocialTools } from '@/components/SocialTools';
import { VideoEditor } from '@/components/VideoEditor';
import { AIAssistant } from '@/components/AIAssistant';
import { ProjectsPage } from '@/components/ProjectsPage';
import { TemplatesPage } from '@/components/TemplatesPage';
import { SettingsPage } from '@/components/SettingsPage';
import { PricingPage } from '@/components/PricingPage';
import { AuthPage } from '@/components/AuthPage';
import { loadSettings, saveSettings, saveProject, getProject } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Menu, Loader2 } from 'lucide-react';

const VIEW_TITLES: Record<ViewKey, string> = {
  'home': 'Главная',
  'photo-editor': 'Фоторедактор',
  'product-cards': 'Карточки товаров',
  'social': 'Социальные сети',
  'video-editor': 'Видеоредактор',
  'projects': 'Мои проекты',
  'templates': 'Шаблоны',
  'ai-assistant': 'ИИ-помощник',
  'settings': 'Настройки',
  'pricing': 'Тарифы',
};

export default function App() {
  const { session, loading } = useAuth();
  const [view, setView] = useState<ViewKey>('home');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [projectRefreshKey, setProjectRefreshKey] = useState(0);
  const [photoEditorData, setPhotoEditorData] = useState<{ src: string; adjustments: Adjustments; presetId?: string; projectId?: string; createdAt?: number; intensity?: number } | undefined>(undefined);
  const [cardEditorData, setCardEditorData] = useState<{ size: CanvasSize; layers: CanvasLayer[]; name: string } | undefined>(undefined);
  const [, setSocialEditorData] = useState<{ size: CanvasSize; layers: CanvasLayer[]; thumbnail: string } | undefined>(undefined);
  const [videoNotify, setVideoNotify] = useState<string | null>(null);
  const [currentPlan] = useState('free');

  useEffect(() => {
    loadSettings().then((s) => {
      if (s) setSettings(s);
    });
  }, []);

  const handleSettingsChange = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const navigate = useCallback((key: ViewKey) => {
    setView(key);
    if (key !== 'photo-editor') setPhotoEditorData(undefined);
    if (key !== 'product-cards') setCardEditorData(undefined);
    if (key !== 'social') setSocialEditorData(undefined);
  }, []);

  const openProject = useCallback(async (project: CardProject) => {
    const full = await getProject(project.id);
    if (!full) return;
    const data = full.data as { size?: CanvasSize; layers?: CanvasLayer[]; src?: string; adjustments?: Adjustments; presetId?: string; intensity?: number };

    if (full.type === 'photo' && data?.src) {
      setPhotoEditorData({ src: data.src, adjustments: data.adjustments || ({} as Adjustments), presetId: data.presetId, projectId: full.id, createdAt: full.createdAt, intensity: data.intensity });
      setView('photo-editor');
    } else if ((full.type === 'product-card' || full.type === 'card-series') && data?.layers && data?.size) {
      setCardEditorData({ size: data.size, layers: data.layers, name: full.name });
      setView('product-cards');
    } else if (full.type === 'social' && data?.layers && data?.size) {
      setSocialEditorData({ size: data.size, layers: data.layers, thumbnail: full.thumbnail || '' });
      setView('social');
    } else if (full.type === 'video') {
      setView('video-editor');
    }
  }, []);

  const saveCardProject = useCallback(async (data: { size: CanvasSize; layers: CanvasLayer[]; thumbnail: string }, type: 'product-card' | 'social') => {
    const project: CardProject = {
      id: generateId(),
      name: `${type === 'product-card' ? 'Карточка' : 'Соцсети'} ${new Date().toLocaleDateString('ru-RU')}`,
      description: '',
      type,
      thumbnail: data.thumbnail,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      data: { size: data.size, layers: data.layers },
    };
    await saveProject(project);
    setProjectRefreshKey((k) => k + 1);
  }, []);

  const isEditorView = view === 'photo-editor' || view === 'product-cards' || view === 'social' || view === 'video-editor' || view === 'ai-assistant';

  if (loading) {
    return (
      <div className="flex h-dvh bg-brand-dark items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="flex h-dvh bg-brand-dark overflow-hidden">
      <div className="hidden md:block">
        <Sidebar current={view} onNavigate={navigate} mode={settings.mode} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden sticky top-0 z-30 bg-brand-dark border-b border-gold/15 px-4 py-3 flex items-center justify-between safe-area-top">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center ring-1 ring-gold/30">
              <span className="text-white font-display font-bold text-sm">F</span>
            </div>
            <span className="font-display font-semibold text-white">FotoBust AI</span>
          </div>
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center"
          >
            <Menu className="w-4 h-4 text-gold" />
          </button>
        </div>

        {!isEditorView && (
          <div className="hidden md:block">
            <TopBar title={VIEW_TITLES[view]} />
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-bg">
          {view === 'home' && <HomePage onNavigate={navigate} onOpenProject={openProject} />}
          {view === 'photo-editor' && <PhotoEditor settings={settings} initialData={photoEditorData} />}
          {view === 'product-cards' && (
            <CardEditor
              settings={settings}
              initialData={cardEditorData}
              onSave={async (data) => { await saveCardProject(data, 'product-card'); }}
            />
          )}
          {view === 'social' && (
            <SocialTools settings={settings} onSave={async (data) => { await saveCardProject(data, 'social'); }} />
          )}
          {view === 'video-editor' && <VideoEditor onNotify={setVideoNotify} />}
          {view === 'projects' && <ProjectsPage onOpenProject={openProject} onNavigate={navigate} refreshKey={projectRefreshKey} />}
          {view === 'templates' && <TemplatesPage onNavigate={navigate} settings={settings} />}
          {view === 'ai-assistant' && <AIAssistant onNavigate={navigate} />}
          {view === 'settings' && <SettingsPage settings={settings} onChange={handleSettingsChange} />}
          {view === 'pricing' && <PricingPage currentPlan={currentPlan} />}
        </main>
      </div>

      <MobileNav current={view} onNavigate={navigate} />
      <MobileMoreMenu onNavigate={navigate} onClose={() => setMoreMenuOpen(false)} open={moreMenuOpen} />

      {videoNotify && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-white text-sm px-4 py-2.5 rounded-xl shadow-burgundy animate-slide-up">
          {videoNotify}
          <button onClick={() => setVideoNotify(null)} className="ml-3 text-white/60 hover:text-white">×</button>
        </div>
      )}
    </div>
  );
}
