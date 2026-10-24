import type { Adjustments } from '@/types';

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildFilterString(a: Adjustments, intensity = 1): string {
  const i = intensity;
  const brightness = 1 + (a.brightness / 100) * i;
  const contrast = 1 + (a.contrast / 100) * i;
  const saturate = 1 + (a.saturation / 100) * i;
  const sepia = (a.sepia / 100) * i;
  const grayscale = (a.grayscale / 100) * i;
  const hueRotate = a.hue * i;
  const blur = (a.blur / 100) * i * 10;
  const exposureVal = (a.exposure / 100) * i * 0.5;

  const filters = [
    `brightness(${brightness + exposureVal})`,
    `contrast(${contrast})`,
    `saturate(${saturate})`,
    `sepia(${sepia})`,
    `grayscale(${grayscale})`,
    `hue-rotate(${hueRotate}deg)`,
  ];

  if (blur > 0.01) filters.push(`blur(${blur}px)`);
  return filters.join(' ');
}

export function buildTemperatureOverlay(a: Adjustments): { color: string; opacity: number } | null {
  if (a.temperature === 0) return null;
  const temp = a.temperature / 100;
  if (temp > 0) {
    return { color: '#ff8800', opacity: Math.abs(temp) * 0.15 };
  }
  return { color: '#0088ff', opacity: Math.abs(temp) * 0.15 };
}

export function buildFadeOverlay(a: Adjustments): { color: string; opacity: number } | null {
  if (a.fade === 0) return null;
  return { color: '#fff5e6', opacity: (a.fade / 100) * 0.3 };
}

export function buildVignetteOpacity(a: Adjustments): number {
  return (a.vignette / 100) * 0.6;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getExifOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const view = new DataView(reader.result as ArrayBuffer);
      if (view.getUint16(0, false) !== 0xffd8) { resolve(1); return; }
      let offset = 2;
      let marker: number;
      while (offset < view.byteLength) {
        marker = view.getUint16(offset, false);
        offset += 2;
        if (marker === 0xffe1) {
          if (view.getUint32(offset + 2, false) !== 0x45786966) { resolve(1); return; }
          const little = view.getUint16(offset + 10, false) === 0x4949;
          offset += 14;
          const entries = view.getUint16(offset, little);
          offset += 2;
          for (let i = 0; i < entries; i++) {
            if (view.getUint16(offset + i * 12, little) === 0x0112) {
              resolve(view.getUint16(offset + i * 12 + 8, little));
              return;
            }
          }
          resolve(1);
          return;
        } else if ((marker & 0xff00) !== 0xff00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
      resolve(1);
    };
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file.slice(0, 65536));
  });
}

export async function fileToCorrectedDataURL(file: File): Promise<string> {
  const orientation = await getExifOrientation(file);
  const dataUrl = await fileToDataURL(file);
  if (orientation <= 1) return dataUrl;

  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (orientation > 4) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  switch (orientation) {
    case 2: ctx.scale(-1, 1); break;
    case 3: ctx.rotate(Math.PI); break;
    case 4: ctx.scale(1, -1); break;
    case 5: ctx.rotate(Math.PI / 2); ctx.scale(-1, 1); break;
    case 6: ctx.rotate(Math.PI / 2); break;
    case 7: ctx.rotate(Math.PI / 2); ctx.scale(1, -1); break;
    case 8: ctx.rotate(-Math.PI / 2); break;
  }
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();

  return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.95);
}

export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadDataURL(dataURL: string, filename: string) {
  downloadBlob(dataURLtoBlob(dataURL), filename);
}

export async function shareOrDownloadBlob(blob: Blob, filename: string, mimeType: string): Promise<'shared' | 'downloaded' | 'cancelled' | 'unsupported'> {
  const { nativeShareBlob } = await import('@/lib/nativeBridge');
  return nativeShareBlob(blob, filename, mimeType);
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Неподдерживаемый формат. Используйте JPEG, PNG или WebP.';
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return 'Файл слишком большой. Максимум 50 МБ.';
  }
  return null;
}

export function validateVideoFile(file: File): string | null {
  if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return 'Неподдерживаемый формат видео. Используйте MP4, WebM или MOV.';
  }
  if (file.size > MAX_VIDEO_SIZE) {
    return 'Видеофайл слишком большой. Максимум 200 МБ.';
  }
  return null;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}
