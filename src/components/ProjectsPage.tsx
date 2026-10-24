import { useState, useEffect, useCallback, useRef } from 'react';
import { FolderOpen, Plus, MoreVertical, Trash2, Copy, Edit3, Download, Upload, AlertCircle, RefreshCw, Cloud, Loader2, Check, FolderOpen as OpenIcon } from 'lucide-react';
import type { CardProject, ViewKey } from '@/types';
import {
  getAllProjects, deleteProject, saveProject, getStorageEstimate,
  syncAllProjects, pushProjectToCloud, deleteProjectFromCloud,
} from '@/lib/storage';
import { formatDate, formatBytes, generateId, shareOrDownloadBlob } from '@/lib/utils';
import { ConfirmDialog } from '@/components/Modal';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const BACKUP_FORMAT_VERSION = 1;

interface ProjectsPageProps {
  onOpenProject: (project: CardProject) => void;
  onNavigate: (key: ViewKey) => void;
  refreshKey: number;
}

type SyncState = 'idle' | 'syncing' | 'done' | 'error';

export function ProjectsPage({ onOpenProject, onNavigate, refreshKey }: ProjectsPageProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<CardProject[]>([]);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [menuProject, setMenuProject] = useState<CardProject | null>(null);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'updated-desc' | 'updated-asc' | 'name'>('updated-desc');
  const menuRef = useRef<HTMLDivElement | null>(null);

  const loadProjects = useCallback(async () => {
    const all = await getAllProjects();
    setProjects(all);
    getStorageEstimate().then(setStorage);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects, refreshKey]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [menuOpen]);

  const sortedProjects = [...projects].sort((a, b) => {
    if (sortOrder === 'name') return a.name.localeCompare(b.name);
    if (sortOrder === 'updated-asc') return a.updatedAt - b.updatedAt;
    return b.updatedAt - a.updatedAt;
  });

  const handleSync = async () => {
    if (!user) return;
    setSyncState('syncing');
    setSyncMessage(null);
    const result = await syncAllProjects();
    await loadProjects();
    if (result.errors.length > 0) {
      setSyncState('error');
      setSyncMessage(`Синхронизация завершена с ошибками: ${result.errors[0]}`);
    } else {
      setSyncState('done');
      setSyncMessage(`Синхронизировано: загружено ${result.pulled}, отправлено ${result.pushed}${result.conflicts > 0 ? `, конфликтов: ${result.conflicts}` : ''}`);
      setTimeout(() => setSyncState('idle'), 3000);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProject(deleteId);
      if (user) {
        await deleteProjectFromCloud(deleteId);
      }
    } catch {
      alert('Не удалось удалить проект. Попробуйте ещё раз.');
    }
    setDeleteId(null);
    await loadProjects();
  };

  const handleDuplicate = async (project: CardProject) => {
    try {
      const copy: CardProject = {
        ...project,
        id: generateId(),
        name: `${project.name} — копия`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveProject(copy);
      if (user) {
        await pushProjectToCloud(copy);
      }
      await loadProjects();
    } catch {
      alert('Не удалось дублировать проект.');
    }
    setMenuOpen(null);
    setMenuProject(null);
  };

  const handleRename = async (project: CardProject) => {
    const name = prompt('Новое название:', project.name);
    if (!name || !name.trim()) return;
    try {
      const updated = { ...project, name: name.trim(), updatedAt: Date.now() };
      await saveProject(updated);
      if (user) {
        await pushProjectToCloud(updated);
      }
      await loadProjects();
    } catch {
      alert('Не удалось переименовать проект.');
    }
    setMenuOpen(null);
    setMenuProject(null);
  };

  const handleExport = async (project: CardProject) => {
    try {
      const backup = {
        formatVersion: BACKUP_FORMAT_VERSION,
        exportedAt: Date.now(),
        project,
      };
      const data = JSON.stringify(backup, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const filename = `${project.name.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.fotobust.json`;
      await shareOrDownloadBlob(blob, filename, 'application/json');
    } catch {
      alert('Не удалось экспортировать проект.');
    }
    setMenuOpen(null);
    setMenuProject(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      let project: CardProject;
      if (parsed.formatVersion && parsed.project) {
        project = parsed.project as CardProject;
      } else if (parsed.id && parsed.type && parsed.data) {
        project = parsed as CardProject;
      } else {
        alert('Неправильный формат файла резервной копии.');
        e.target.value = '';
        return;
      }

      if (!project.type || !project.data) {
        alert('Файл не содержит данных проекта.');
        e.target.value = '';
        return;
      }

      const validTypes = ['photo', 'product-card', 'card-series', 'social', 'video'];
      if (!validTypes.includes(project.type)) {
        alert(`Неподдерживаемый тип проекта: ${project.type}`);
        e.target.value = '';
        return;
      }

      project.id = generateId();
      project.updatedAt = Date.now();
      if (!project.createdAt) project.createdAt = Date.now();
      if (!project.name) project.name = 'Импортированный проект';

      await saveProject(project);
      if (user) {
        await pushProjectToCloud(project);
      }
      await loadProjects();
    } catch {
      alert('Не удалось импортировать проект. Проверьте файл.');
    }
    e.target.value = '';
  };

  const openMenu = (proj: CardProject) => {
    setMenuProject(proj);
    setMenuOpen(proj.id);
  };

  const closeMenu = () => {
    setMenuOpen(null);
    setMenuProject(null);
  };

  const menuActions = menuProject ? [
    { icon: OpenIcon, label: 'Открыть', onClick: () => { onOpenProject(menuProject); closeMenu(); }, danger: false },
    { icon: Edit3, label: 'Переименовать', onClick: () => handleRename(menuProject), danger: false },
    { icon: Copy, label: 'Дублировать', onClick: () => handleDuplicate(menuProject), danger: false },
    { icon: Download, label: 'Экспорт JSON', onClick: () => handleExport(menuProject), danger: false },
    { icon: Trash2, label: 'Удалить', onClick: () => { setDeleteId(menuProject.id); closeMenu(); }, danger: true },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink mb-1">Мои проекты</h2>
          <p className="text-sm text-ink-secondary">
            {user ? 'Локальное хранилище + облачная синхронизация' : 'Локальное хранилище вашего браузера'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {user && (
            <button
              onClick={handleSync}
              disabled={syncState === 'syncing'}
              className="btn-secondary btn-sm"
            >
              {syncState === 'syncing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="hidden md:inline">Синхронизировать</span>
            </button>
          )}
          <label className="btn-secondary btn-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            <span className="hidden md:inline">Импорт</span>
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={() => onNavigate('photo-editor')} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            Новый
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className={cn(
          'card p-3 mb-4 flex items-center gap-3 text-sm',
          syncState === 'error' ? 'border-error/30' : syncState === 'done' ? 'border-success/30' : ''
        )}>
          {syncState === 'error' ? (
            <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
          ) : syncState === 'done' ? (
            <Check className="w-4 h-4 text-success flex-shrink-0" />
          ) : (
            <Cloud className="w-4 h-4 text-gold flex-shrink-0" />
          )}
          <span className={syncState === 'error' ? 'text-error' : 'text-ink'}>
            {syncMessage}
          </span>
        </div>
      )}

      {storage && (
        <div className="card p-3 mb-4 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-ink-secondary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-ink-secondary">
              Хранилище: {formatBytes(storage.usage)} из {formatBytes(storage.quota)} использовано
            </p>
            <div className="h-1.5 bg-bg rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-brand rounded-full"
                style={{ width: `${Math.min(100, (storage.usage / storage.quota) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          <span className="text-xs text-ink-secondary flex-shrink-0">Сортировка:</span>
          <button
            onClick={() => setSortOrder('updated-desc')}
            className={cn('chip flex-shrink-0', sortOrder === 'updated-desc' ? 'bg-brand text-white' : 'bg-bg text-ink-secondary')}
          >
            Сначала новые
          </button>
          <button
            onClick={() => setSortOrder('updated-asc')}
            className={cn('chip flex-shrink-0', sortOrder === 'updated-asc' ? 'bg-brand text-white' : 'bg-bg text-ink-secondary')}
          >
            Сначала старые
          </button>
          <button
            onClick={() => setSortOrder('name')}
            className={cn('chip flex-shrink-0', sortOrder === 'name' ? 'bg-brand text-white' : 'bg-bg text-ink-secondary')}
          >
            По названию
          </button>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderOpen className="w-12 h-12 text-brand/30 mx-auto mb-3" />
          <p className="text-ink font-medium mb-1">Нет проектов</p>
          <p className="text-sm text-ink-secondary mb-4">Создайте первый проект — фото, карточку или контент</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => onNavigate('photo-editor')} className="btn-primary btn-sm">Фоторедактор</button>
            <button onClick={() => onNavigate('product-cards')} className="btn-secondary btn-sm">Карточки товаров</button>
            <button onClick={() => onNavigate('social')} className="btn-secondary btn-sm">Соцсети</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sortedProjects.map((proj) => (
            <div key={proj.id} className="card overflow-visible group">
              <button
                onClick={() => onOpenProject(proj)}
                className="w-full aspect-square bg-brand-light/30 flex items-center justify-center overflow-hidden rounded-t-2xl"
              >
                {proj.thumbnail ? (
                  <img src={proj.thumbnail} alt={proj.name} className="w-full h-full object-cover" />
                ) : (
                  <FolderOpen className="w-8 h-8 text-brand/40" />
                )}
              </button>
              <div className="p-3">
                <div className="flex items-start justify-between gap-1">
                  <button onClick={() => onOpenProject(proj)} className="text-left flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{proj.name}</p>
                    <p className="text-xs text-ink-secondary mt-0.5">{formatDate(proj.updatedAt)}</p>
                  </button>
                  <div className="relative hidden md:block" ref={(el) => { if (menuOpen === proj.id) menuRef.current = el; }}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === proj.id ? null : proj.id)}
                      className="w-7 h-7 rounded-lg hover:bg-bg flex items-center justify-center flex-shrink-0"
                    >
                      <MoreVertical className="w-3.5 h-3.5 text-ink-secondary" />
                    </button>
                    {menuOpen === proj.id && (
                      <div className="absolute right-0 top-8 z-30 bg-bg-cream border border-border rounded-xl shadow-medium py-1 w-44">
                        {menuActions.map((action, i) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={i}
                              onClick={action.onClick}
                              className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2.5 text-xs hover:bg-bg transition-colors',
                                action.danger ? 'text-error' : 'text-ink'
                              )}
                            >
                              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openMenu(proj)}
                    className="md:hidden w-8 h-8 -mr-1 rounded-lg active:bg-bg flex items-center justify-center flex-shrink-0"
                  >
                    <MoreVertical className="w-4 h-4 text-ink-secondary" />
                  </button>
                </div>
                <span className="chip bg-brand-light/40 text-brand mt-2 text-[10px]">
                  {proj.type === 'photo' ? 'Фото' : proj.type === 'product-card' ? 'Карточка' : proj.type === 'social' ? 'Соцсети' : proj.type === 'video' ? 'Видео' : 'Серия'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-secondary mt-6 text-center">
        {user
          ? 'Проекты сохраняются локально и синхронизируются с облаком при входе в аккаунт.'
          : 'Проекты хранятся локально. Войдите в аккаунт для синхронизации между устройствами.'}
      </p>

      {menuOpen && menuProject && (
        <div className="md:hidden fixed inset-0 z-[60] bg-black/40 flex items-end" onClick={closeMenu}>
          <div
            className="w-full bg-bg-cream rounded-t-3xl flex flex-col animate-slide-up"
            style={{
              maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px) - 2rem)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 5rem)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 px-5 pt-4 pb-2">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-3" />
              <p className="text-sm font-medium text-ink truncate text-center">{menuProject.name}</p>
            </div>
            <div className="overflow-y-auto px-4 pb-4 flex-1">
              {menuActions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    onClick={action.onClick}
                    className={cn(
                      'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors active:bg-bg mb-1',
                      action.danger ? 'text-error' : 'text-ink'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Удалить проект?"
        message="Проект будет удалён локально и из облака. Перед удалением вы можете экспортировать его в файл."
        confirmLabel="Удалить"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
