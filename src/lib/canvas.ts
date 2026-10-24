import type { CanvasLayer, CanvasSize, Adjustments } from '@/types';
import { buildFilterString, buildTemperatureOverlay, buildFadeOverlay, buildVignetteOpacity, loadImage } from '@/lib/utils';

export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  layers: CanvasLayer[],
  scale = 1
) {
  ctx.save();
  ctx.clearRect(0, 0, size.width * scale, size.height * scale);
  ctx.scale(scale, scale);

  for (const layer of layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;

    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    if (layer.rotation) {
      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (layer.type === 'rect') {
      ctx.fillStyle = layer.fill || '#FFFFFF';
      if (layer.radius) {
        roundRect(ctx, layer.x, layer.y, layer.width, layer.height, layer.radius);
        ctx.fill();
      } else {
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
      }
    } else if (layer.type === 'shape') {
      ctx.fillStyle = layer.fill || '#800020';
      roundRect(ctx, layer.x, layer.y, layer.width, layer.height, layer.radius || 8);
      ctx.fill();
    } else if (layer.type === 'text' && layer.text) {
      const fontSize = layer.fontSize || 24;
      const fontFamily = layer.fontFamily || 'Inter';
      const fontWeight = layer.fontWeight || 400;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}, sans-serif`;
      ctx.fillStyle = layer.color || '#292326';
      ctx.textBaseline = 'top';
      ctx.textAlign = layer.textAlign || 'left';

      const lineHeight = fontSize * (layer.lineHeight || 1.4);
      const maxWidth = layer.width;
      const lines = wrapText(ctx, layer.text, maxWidth);
      let y = layer.y;
      for (const line of lines) {
        ctx.fillText(line, layer.x, y);
        y += lineHeight;
      }
    } else if (layer.type === 'image' && layer.src) {
      // Image rendering is async; handled separately in renderCanvasAsync
    }

    ctx.restore();
  }

  ctx.restore();
}

export async function renderCanvasAsync(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  layers: CanvasLayer[],
  scale = 1
) {
  ctx.save();
  ctx.clearRect(0, 0, size.width * scale, size.height * scale);
  ctx.scale(scale, scale);

  for (const layer of layers) {
    if (!layer.visible) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;

    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    if (layer.rotation) {
      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    if (layer.type === 'rect') {
      ctx.fillStyle = layer.fill || '#FFFFFF';
      if (layer.radius) {
        roundRect(ctx, layer.x, layer.y, layer.width, layer.height, layer.radius);
        ctx.fill();
      } else {
        ctx.fillRect(layer.x, layer.y, layer.width, layer.height);
      }
    } else if (layer.type === 'shape') {
      ctx.fillStyle = layer.fill || '#800020';
      roundRect(ctx, layer.x, layer.y, layer.width, layer.height, layer.radius || 8);
      ctx.fill();
    } else if (layer.type === 'text' && layer.text) {
      const fontSize = layer.fontSize || 24;
      const fontFamily = layer.fontFamily || 'Inter';
      const fontWeight = layer.fontWeight || 400;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}, sans-serif`;
      ctx.fillStyle = layer.color || '#292326';
      ctx.textBaseline = 'top';
      ctx.textAlign = layer.textAlign || 'left';

      const lineHeight = fontSize * (layer.lineHeight || 1.4);
      const lines = wrapText(ctx, layer.text, layer.width);
      let y = layer.y;
      for (const line of lines) {
        ctx.fillText(line, layer.x, y);
        y += lineHeight;
      }
    } else if (layer.type === 'image' && layer.src) {
      try {
        const img = await loadImage(layer.src);
        ctx.drawImage(img, layer.x, layer.y, layer.width, layer.height);
      } catch {
        // skip broken images
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    lines.push(current);
  }
  return lines;
}

export async function exportCanvas(
  size: CanvasSize,
  layers: CanvasLayer[],
  format: 'png' | 'jpeg',
  quality = 0.92
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d')!;

  if (format === 'jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size.width, size.height);
  }

  await renderCanvasAsync(ctx, size, layers, 1);
  return canvas.toDataURL(`image/${format}`, quality);
}

export async function exportPhoto(
  imgSrc: string,
  adjustments: Adjustments,
  presetIntensity: number,
  format: 'png' | 'jpeg',
  quality = 0.92
): Promise<string> {
  const img = await loadImage(imgSrc);
  const canvas = document.createElement('canvas');

  const rot = adjustments.rotate % 360;
  if (rot === 90 || rot === 270) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  const ctx = canvas.getContext('2d')!;

  if (format === 'jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  if (adjustments.flipH) ctx.scale(-1, 1);
  if (adjustments.flipV) ctx.scale(1, -1);

  ctx.filter = buildFilterString(adjustments, presetIntensity);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.filter = 'none';
  ctx.restore();

  const tempOverlay = buildTemperatureOverlay(adjustments);
  if (tempOverlay) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = tempOverlay.color;
    ctx.globalAlpha = tempOverlay.opacity * presetIntensity;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  const fadeOverlay = buildFadeOverlay(adjustments);
  if (fadeOverlay) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = fadeOverlay.color;
    ctx.globalAlpha = fadeOverlay.opacity * presetIntensity;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  if (adjustments.highlights !== 0 || adjustments.shadows !== 0) {
    ctx.save();
    if (adjustments.shadows > 0) {
      ctx.globalCompositeOperation = 'lighten';
      ctx.fillStyle = '#222222';
      ctx.globalAlpha = (adjustments.shadows / 100) * 0.3 * presetIntensity;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (adjustments.shadows < 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#000000';
      ctx.globalAlpha = (Math.abs(adjustments.shadows) / 100) * 0.3 * presetIntensity;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (adjustments.highlights > 0) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = (adjustments.highlights / 100) * 0.2 * presetIntensity;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (adjustments.highlights < 0) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = (Math.abs(adjustments.highlights) / 100) * 0.3 * presetIntensity;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.restore();
  }

  if (adjustments.sharpness > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = (adjustments.sharpness / 100) * 0.5 * presetIntensity;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  }

  const vignetteOpacity = buildVignetteOpacity(adjustments);
  if (vignetteOpacity > 0) {
    ctx.save();
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.3,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${vignetteOpacity * presetIntensity})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  if (adjustments.grain > 0) {
    ctx.save();
    const grainAmount = (adjustments.grain / 100) * 0.15 * presetIntensity;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * grainAmount * 255;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
    ctx.restore();
  }

  return canvas.toDataURL(`image/${format}`, quality);
}

export async function exportPhotoBlob(
  imgSrc: string,
  adjustments: Adjustments,
  presetIntensity: number,
  format: 'png' | 'jpeg',
  quality = 0.92
): Promise<Blob> {
  const img = await loadImage(imgSrc);
  const canvas = document.createElement('canvas');
  const rot = adjustments.rotate % 360;
  if (rot === 90 || rot === 270) { canvas.width = img.height; canvas.height = img.width; }
  else { canvas.width = img.width; canvas.height = img.height; }
  const ctx = canvas.getContext('2d')!;
  if (format === 'jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  if (adjustments.flipH) ctx.scale(-1, 1);
  if (adjustments.flipV) ctx.scale(1, -1);
  ctx.filter = buildFilterString(adjustments, presetIntensity);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.filter = 'none';
  ctx.restore();
  const tempOverlay = buildTemperatureOverlay(adjustments);
  if (tempOverlay) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = tempOverlay.color; ctx.globalAlpha = tempOverlay.opacity * presetIntensity; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); }
  const fadeOverlay = buildFadeOverlay(adjustments);
  if (fadeOverlay) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = fadeOverlay.color; ctx.globalAlpha = fadeOverlay.opacity * presetIntensity; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); }
  if (adjustments.highlights !== 0 || adjustments.shadows !== 0) {
    ctx.save();
    if (adjustments.shadows > 0) { ctx.globalCompositeOperation = 'lighten'; ctx.fillStyle = '#222222'; ctx.globalAlpha = (adjustments.shadows / 100) * 0.3 * presetIntensity; ctx.fillRect(0, 0, canvas.width, canvas.height); } else if (adjustments.shadows < 0) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#000000'; ctx.globalAlpha = (Math.abs(adjustments.shadows) / 100) * 0.3 * presetIntensity; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    if (adjustments.highlights > 0) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = '#ffffff'; ctx.globalAlpha = (adjustments.highlights / 100) * 0.2 * presetIntensity; ctx.fillRect(0, 0, canvas.width, canvas.height); } else if (adjustments.highlights < 0) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#ffffff'; ctx.globalAlpha = (Math.abs(adjustments.highlights) / 100) * 0.3 * presetIntensity; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.restore();
  }
  if (adjustments.sharpness > 0) { ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = (adjustments.sharpness / 100) * 0.5 * presetIntensity; ctx.drawImage(canvas, 0, 0); ctx.restore(); }
  const vignetteOpacity = buildVignetteOpacity(adjustments);
  if (vignetteOpacity > 0) { ctx.save(); const gradient = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.3, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7); gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(1, `rgba(0,0,0,${vignetteOpacity * presetIntensity})`); ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); }
  if (adjustments.grain > 0) { ctx.save(); const grainAmount = (adjustments.grain / 100) * 0.15 * presetIntensity; const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = imageData.data; for (let i = 0; i < data.length; i += 4) { const noise = (Math.random() - 0.5) * grainAmount * 255; data[i] = Math.max(0, Math.min(255, data[i] + noise)); data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); } ctx.putImageData(imageData, 0, 0); ctx.restore(); }
  return new Promise((resolve, reject) => { canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Canvas toBlob failed')); }, `image/${format}`, quality); });
}

export async function exportCanvasBlob(
  size: CanvasSize,
  layers: CanvasLayer[],
  format: 'png' | 'jpeg',
  quality = 0.92
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d')!;
  if (format === 'jpeg') { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, size.width, size.height); }
  await renderCanvasAsync(ctx, size, layers, 1);
  return new Promise((resolve, reject) => { canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Canvas toBlob failed')); }, `image/${format}`, quality); });
}
