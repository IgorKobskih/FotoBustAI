import { Cloud, CloudOff, Loader2, Check, AlertCircle, CloudUpload } from 'lucide-react';
import type { SyncStatus } from '@/lib/storage';

interface SaveStatusProps {
  localStatus: 'idle' | 'saving' | 'saved' | 'error';
  cloudStatus?: SyncStatus;
  isOnline: boolean;
}

export function SaveStatus({ localStatus, cloudStatus, isOnline }: SaveStatusProps) {
  if (localStatus === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-white/60">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Сохранение…
      </span>
    );
  }

  if (localStatus === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-error">
        <AlertCircle className="w-3.5 h-3.5" />
        Ошибка сохранения
      </span>
    );
  }

  if (localStatus === 'saved') {
    if (cloudStatus === 'syncing') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-gold">
          <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
          Синхронизация…
        </span>
      );
    }

    if (cloudStatus === 'synced') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-gold">
          <Check className="w-3.5 h-3.5" />
          Синхронизировано
        </span>
      );
    }

    if (cloudStatus === 'error') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-error">
          <AlertCircle className="w-3.5 h-3.5" />
          Ошибка синхронизации
        </span>
      );
    }

    if (!isOnline || cloudStatus === 'local-only') {
      return (
        <span className="flex items-center gap-1.5 text-xs text-white/50">
          <CloudOff className="w-3.5 h-3.5" />
          Локально сохранено
        </span>
      );
    }

    return (
      <span className="flex items-center gap-1.5 text-xs text-white/50">
        <Check className="w-3.5 h-3.5" />
        Сохранено
      </span>
    );
  }

  if (localStatus === 'idle') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-white/40">
        <Cloud className="w-3.5 h-3.5" />
        Изменения не сохранены
      </span>
    );
  }

  return null;
}
