import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { saveProject, pushProjectToCloud, type SyncStatus } from '@/lib/storage';
import type { CardProject } from '@/types';

type LocalStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave(
  buildProject: () => CardProject,
  enabled: boolean,
  delay = 1500,
) {
  const [localStatus, setLocalStatus] = useState<LocalStatus>('idle');
  const [cloudStatus, setCloudStatus] = useState<SyncStatus>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasChanges, setHasChanges] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef<CardProject | null>(null);
  const lastSavedRef = useRef<string | null>(null);
  const hasChangesRef = useRef(false);
  const enabledRef = useRef(enabled);
  const buildProjectRef = useRef(buildProject);
  const delayRef = useRef(delay);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { buildProjectRef.current = buildProject; }, [buildProject]);
  useEffect(() => { delayRef.current = delay; }, [delay]);

  const doSave = useCallback(async (project: CardProject) => {
    if (savingRef.current) {
      pendingRef.current = project;
      return;
    }
    savingRef.current = true;
    setLocalStatus('saving');

    try {
      await saveProject(project);
      lastSavedRef.current = JSON.stringify(project);
      setLocalStatus('saved');
      setHasChanges(false);
      hasChangesRef.current = false;

      const { data: { session } } = await supabase.auth.getSession();
      if (session && navigator.onLine) {
        setCloudStatus('syncing');
        const result = await pushProjectToCloud(project);
        if ('error' in result) {
          setCloudStatus('error');
        } else if (result.conflict) {
          setCloudStatus('error');
        } else {
          setCloudStatus('synced');
        }
      } else {
        setCloudStatus('local-only');
      }
    } catch {
      setLocalStatus('error');
      setCloudStatus('error');
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        const next = pendingRef.current;
        pendingRef.current = null;
        doSave(next);
      }
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (!enabledRef.current) return;
    setHasChanges(true);
    hasChangesRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const project = buildProjectRef.current();
      doSave(project);
    }, delayRef.current);
  }, [doSave]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const project = buildProjectRef.current();
    await doSave(project);
  }, [doSave]);

  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      if (hasChangesRef.current) {
        scheduleSave();
      }
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [scheduleSave]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { localStatus, cloudStatus, isOnline, hasChanges, scheduleSave, saveNow };
}
