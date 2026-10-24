import { Capacitor } from '@capacitor/core';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function getPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}

export async function nativeShareBlob(
  blob: Blob,
  filename: string,
  _mimeType: string
): Promise<'shared' | 'downloaded' | 'cancelled' | 'unsupported'> {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');

      const base64 = await blobToBase64(blob);
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      await Share.share({
        title: 'FotoBust AI',
        text: filename,
        url: result.uri,
        dialogTitle: 'Сохранить фото',
      });

      await Filesystem.deleteFile({
        path: filename,
        directory: Directory.Cache,
      });

      return 'shared';
    } catch {
      return 'unsupported';
    }
  }

  return webShareOrDownload(blob, filename);
}

function webShareOrDownload(
  blob: Blob,
  filename: string,
): 'shared' | 'downloaded' | 'cancelled' | 'unsupported' {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };

  if (nav.canShare && nav.canShare({ files: [file] })) {
    navigator
      .share({ files: [file], title: 'FotoBust AI', text: filename })
      .then(() => {})
      .catch(() => {});
    return 'shared';
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function initPushNotifications(): Promise<void> {
  if (!isNative()) return;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let permGranted = false;
    try {
      const permStatus = await PushNotifications.requestPermissions();
      permGranted = permStatus.receive === 'granted';
    } catch {
      return;
    }
    if (!permGranted) return;

    await PushNotifications.register();
  } catch {
    // Push not available — silent fail in web
  }
}

export async function sendLocalNotification(
  title: string,
  body: string
): Promise<void> {
  if (!isNative()) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.requestPermissions();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title,
          body,
          schedule: { at: new Date(Date.now() + 500) },
        },
      ],
    });
  } catch {
    // Local notifications not available
  }
}

export async function nativeSaveFile(
  data: string,
  filename: string
): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const result = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    return result.uri;
  } catch {
    return null;
  }
}

export async function nativeReadFile(
  filename: string
): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const result = await Filesystem.readFile({
      path: filename,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    return result.data as string;
  } catch {
    return null;
  }
}
