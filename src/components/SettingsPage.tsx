import { useState, useEffect } from 'react';
import { Sliders, Download, Database, HelpCircle, RotateCcw, User, LogOut, Cloud, Mail } from 'lucide-react';
import type { Settings, EditorMode } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getStorageEstimate, getAllProjects, deleteProject } from '@/lib/storage';
import { formatBytes } from '@/lib/utils';
import { ConfirmDialog } from '@/components/Modal';
import { useAuth } from '@/lib/auth';

interface SettingsPageProps { settings: Settings; onChange: (s: Settings) => void; }

const FAQ = [
  { q: 'Где хранятся мои проекты?', a: 'Проекты сохраняются локально в браузере (IndexedDB) и автоматически синхронизируются с облаком, если вы вошли в аккаунт. При очистке данных браузера локальные проекты будут удалены, но облачные останутся.' },
  { q: 'Синхронизируются ли проекты между устройствами?', a: 'Да. После входа в аккаунт проекты автоматически отправляются в облако и доступны на других устройствах при входе в тот же аккаунт.' },
  { q: 'Что происходит при выходе из аккаунта?', a: 'Локальные проекты остаются на устройстве. Облачные проекты не удаляются. При повторном входе они снова станут доступны.' },
  { q: 'Какие форматы изображений поддерживаются?', a: 'Загрузка: JPEG, PNG, WebP. Экспорт: PNG (без потерь) и JPEG (с настройкой качества).' },
  { q: 'Работает ли видеоредактор на моём устройстве?', a: 'Видеоредактор использует MediaRecorder API и работает в Chrome и Edge. Экспорт выполняется в формате WebM.' },
  { q: 'Как подключить ИИ-функции (удаление фона, ретушь)?', a: 'Эти функции требуют подключения внешней ИИ-модели через сервер. Соответствующая архитектура подготовлена. Пока используются локальные алгоритмы обработки.' },
  { q: 'Безопасны ли мои фотографии?', a: 'Да. Все операции выполняются в вашем браузере. Фотографии не отправляются на сторонние серверы без вашего явного согласия. Облачные проекты защищены политиками RLS — только вы имеете доступ к своим данным.' },
  { q: 'Что такое режимы «Простой» и «Профессиональный»?', a: 'В простом режиме отображаются основные инструменты для новичков. В профессиональном — расширенные настройки и параметры.' },
];

export function SettingsPage({ settings, onChange }: SettingsPageProps) {
  const { user, signOut } = useAuth();
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [clearProjectsConfirm, setClearProjectsConfirm] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => { getStorageEstimate().then(setStorage); getAllProjects().then((p) => setProjectCount(p.length)); }, []);

  const update = (patch: Partial<Settings>) => { onChange({ ...settings, ...patch }); };
  const handleReset = () => { onChange(DEFAULT_SETTINGS); setResetConfirm(false); };
  const handleClearProjects = async () => { const projects = await getAllProjects(); for (const p of projects) { await deleteProject(p.id); } setProjectCount(0); setClearProjectsConfirm(false); };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
      <div className="mb-6"><h2 className="font-display text-2xl font-semibold text-ink mb-1">Настройки</h2><p className="text-sm text-ink-secondary">Управление приложением и предпочтениями</p></div>
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3"><User className="w-4 h-4 text-brand" /><h3 className="section-title">Аккаунт</h3></div>
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-light/30"><div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center flex-shrink-0"><Mail className="w-5 h-5 text-brand" /></div><div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink truncate">{user.email}</p><p className="text-xs text-success flex items-center gap-1 mt-0.5"><Cloud className="w-3 h-3" />Облачная синхронизация активна</p></div></div>
            <button onClick={() => signOut()} className="btn-secondary w-full justify-center"><LogOut className="w-4 h-4" />Выйти из аккаунта</button>
            <p className="text-xs text-ink-secondary text-center">При выходе локальные проекты остаются на устройстве. Облачные проекты будут скрыты.</p>
          </div>
        ) : <p className="text-sm text-ink-secondary">Вы не вошли в аккаунт. Войдите, чтобы включить синхронизацию проектов между устройствами.</p>}
      </section>
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3"><Sliders className="w-4 h-4 text-brand" /><h3 className="section-title">Режим интерфейса</h3></div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => update({ mode: 'simple' as EditorMode })} className={`p-4 rounded-xl border-2 text-left transition-all ${settings.mode === 'simple' ? 'border-brand bg-brand-light/30' : 'border-border hover:border-brand/30'}`}><p className="font-medium text-ink text-sm">Простой</p><p className="text-xs text-ink-secondary mt-1">Основные инструменты для новичков</p></button>
          <button onClick={() => update({ mode: 'pro' as EditorMode })} className={`p-4 rounded-xl border-2 text-left transition-all ${settings.mode === 'pro' ? 'border-brand bg-brand-light/30' : 'border-border hover:border-brand/30'}`}><p className="font-medium text-ink text-sm">Профессиональный</p><p className="text-xs text-ink-secondary mt-1">Расширенные настройки и параметры</p></button>
        </div>
      </section>
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3"><Download className="w-4 h-4 text-brand" /><h3 className="section-title">Экспорт</h3></div>
        <div className="space-y-4">
          <div><label className="label">Формат по умолчанию</label><div className="grid grid-cols-2 gap-2"><button onClick={() => update({ exportFormat: 'png' })} className={`btn btn-sm ${settings.exportFormat === 'png' ? 'bg-brand text-white' : 'btn-secondary'}`}>PNG (без потерь)</button><button onClick={() => update({ exportFormat: 'jpeg' })} className={`btn btn-sm ${settings.exportFormat === 'jpeg' ? 'bg-brand text-white' : 'btn-secondary'}`}>JPEG (сжатие)</button></div></div>
          <div><label className="label">Качество JPEG: {Math.round(settings.exportQuality * 100)}%</label><input type="range" min={50} max={100} value={settings.exportQuality * 100} onChange={(e) => update({ exportQuality: Number(e.target.value) / 100 })} className="slider" /></div>
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-ink">Автосохранение</p><p className="text-xs text-ink-secondary">Сохранять проект автоматически</p></div><button onClick={() => update({ autoSave: !settings.autoSave })} className={`relative w-11 h-6 rounded-full transition-colors ${settings.autoSave ? 'bg-brand' : 'bg-border'}`}><span className={`absolute top-0.5 w-5 h-5 bg-bg-cream rounded-full shadow-soft transition-transform ${settings.autoSave ? 'translate-x-5' : 'translate-x-0.5'}`} /></button></div>
        </div>
      </section>
      <section className="card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3"><Database className="w-4 h-4 text-brand" /><h3 className="section-title">Хранилище</h3></div>
        {storage ? (<><div className="mb-3"><div className="flex justify-between text-sm mb-1"><span className="text-ink-secondary">Использовано</span><span className="text-ink font-medium">{formatBytes(storage.usage)}</span></div><div className="h-2 bg-bg rounded-full overflow-hidden"><div className="h-full bg-brand rounded-full transition-all" style={{ width: `${Math.min(100, (storage.usage / storage.quota) * 100)}%` }} /></div><p className="text-xs text-ink-secondary mt-1">из {formatBytes(storage.quota)} доступно</p></div><div className="flex items-center justify-between"><p className="text-sm text-ink">Проектов: {projectCount}</p><button onClick={() => setClearProjectsConfirm(true)} className="text-sm text-error hover:underline">Удалить все проекты</button></div></>) : <p className="text-sm text-ink-secondary">Информация о хранилище недоступна в этом браузере</p>}
      </section>
      <section className="card p-5 mb-4"><div className="flex items-center justify-between"><div><h3 className="section-title">Сброс настроек</h3><p className="text-xs text-ink-secondary mt-1">Вернуть все настройки к значениям по умолчанию</p></div><button onClick={() => setResetConfirm(true)} className="btn-secondary btn-sm"><RotateCcw className="w-4 h-4" />Сбросить</button></div></section>
      <section className="card p-5">
        <div className="flex items-center gap-2 mb-3"><HelpCircle className="w-4 h-4 text-brand" /><h3 className="section-title">Помощь и вопросы</h3></div>
        <div className="space-y-2">{FAQ.map((item, i) => (<div key={i} className="border-b border-border last:border-0 pb-2 last:pb-0"><button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between py-2 text-left"><span className="text-sm font-medium text-ink">{item.q}</span><span className="text-ink-secondary text-lg flex-shrink-0 ml-2">{openFaq === i ? '−' : '+'}</span></button>{openFaq === i && <p className="text-sm text-ink-secondary leading-relaxed pb-2 animate-fade-in">{item.a}</p>}</div>))}</div>
      </section>
      <ConfirmDialog open={resetConfirm} title="Сбросить настройки?" message="Все настройки будут возвращены к значениям по умолчанию." confirmLabel="Сбросить" onConfirm={handleReset} onCancel={() => setResetConfirm(false)} />
      <ConfirmDialog open={clearProjectsConfirm} title="Удалить все проекты?" message="Все локальные проекты будут безвозвратно удалены. Рекомендуем сначала экспортировать важные проекты." confirmLabel="Удалить всё" danger onConfirm={handleClearProjects} onCancel={() => setClearProjectsConfirm(false)} />
    </div>
  );
}
