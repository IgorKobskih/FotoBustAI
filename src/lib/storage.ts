import { supabase } from '@/lib/supabase';
import type { CardProject } from '@/types';

const DB_NAME = 'fotobust-ai';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_SETTINGS = 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function dbPut<T>(store: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(store: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveProject(project: CardProject): Promise<void> {
  await dbPut(STORE_PROJECTS, project);
}

export async function getProject(id: string) {
  return dbGet<CardProject>(STORE_PROJECTS, id);
}

export async function getAllProjects() {
  const all = await dbGetAll<CardProject>(STORE_PROJECTS);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string): Promise<void> {
  await dbDelete(STORE_PROJECTS, id);
}

export async function saveSettings(settings: import('@/types').Settings): Promise<void> {
  await dbPut(STORE_SETTINGS, { key: 'app-settings', ...settings });
}

export async function loadSettings() {
  const s = await dbGet<import('@/types').Settings & { key: string }>(STORE_SETTINGS, 'app-settings');
  if (!s) return null;
  const rest = { ...s } as Omit<typeof s, 'key'>;
  return rest as import('@/types').Settings;
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    return { usage: est.usage || 0, quota: est.quota || 0 };
  }
  return null;
}

export type SyncStatus = 'idle' | 'local-only' | 'syncing' | 'synced' | 'error';

export interface CloudProject {
  id: string;
  user_id: string;
  name: string;
  description: string;
  type: string;
  thumbnail: string | null;
  data: Record<string, unknown>;
  created_at: number;
  updated_at: number;
  synced_at: string;
}

function toCloudRow(p: CardProject) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    type: p.type,
    thumbnail: p.thumbnail || null,
    data: p.data as Record<string, unknown>,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function fromCloudRow(row: CloudProject): CardProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    type: row.type as CardProject['type'],
    thumbnail: row.thumbnail || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    data: row.data,
  };
}

export async function pushProjectToCloud(project: CardProject): Promise<{ conflict: boolean; remoteUpdated: number | null } | { error: string }> {
  try {
    const { data: existing } = await supabase
      .from('projects')
      .select('updated_at')
      .eq('id', project.id)
      .maybeSingle();

    if (existing && existing.updated_at > project.updatedAt) {
      return { conflict: true, remoteUpdated: existing.updated_at };
    }

    const { error } = await supabase
      .from('projects')
      .upsert(toCloudRow(project), { onConflict: 'id' });

    if (error) return { error: error.message };
    return { conflict: false, remoteUpdated: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function pullProjectsFromCloud(): Promise<{ projects: CloudProject[] } | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) return { error: error.message };
    return { projects: (data || []) as CloudProject[] };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function pullProjectFromCloud(id: string): Promise<{ project: CloudProject | null } | { error: string }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return { error: error.message };
    return { project: data as CloudProject | null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function deleteProjectFromCloud(id: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function syncAllProjects(): Promise<{ pulled: number; pushed: number; conflicts: number; errors: string[] }> {
  const result = { pulled: 0, pushed: 0, conflicts: 0, errors: [] as string[] };

  const cloudResult = await pullProjectsFromCloud();
  if ('error' in cloudResult) {
    result.errors.push(cloudResult.error);
    return result;
  }

  const localProjects = await getAllProjects();
  const localMap = new Map(localProjects.map((p) => [p.id, p]));
  const cloudIds = new Set(cloudResult.projects.map((p) => p.id));

  for (const cloudProj of cloudResult.projects) {
    const localProj = localMap.get(cloudProj.id);
    if (!localProj || localProj.updatedAt < cloudProj.updated_at) {
      const restored = fromCloudRow(cloudProj);
      await saveProject(restored);
      result.pulled++;
    }
  }

  for (const localProj of localProjects) {
    if (!cloudIds.has(localProj.id)) {
      const pushResult = await pushProjectToCloud(localProj);
      if ('error' in pushResult) {
        result.errors.push(pushResult.error);
      } else if (pushResult.conflict) {
        result.conflicts++;
      } else {
        result.pushed++;
      }
    } else {
      const cloudProj = cloudResult.projects.find((p) => p.id === localProj.id);
      if (cloudProj && localProj.updatedAt > cloudProj.updated_at) {
        const pushResult = await pushProjectToCloud(localProj);
        if ('error' in pushResult) {
          result.errors.push(pushResult.error);
        } else if (pushResult.conflict) {
          result.conflicts++;
        } else {
          result.pushed++;
        }
      }
    }
  }

  return result;
}

export { fromCloudRow };
