export type ViewKey =
  | 'home'
  | 'photo-editor'
  | 'product-cards'
  | 'social'
  | 'video-editor'
  | 'projects'
  | 'templates'
  | 'ai-assistant'
  | 'settings'
  | 'pricing';

export interface Adjustments {
  brightness: number;
  contrast: number;
  exposure: number;
  saturation: number;
  temperature: number;
  hue: number;
  highlights: number;
  shadows: number;
  sharpness: number;
  blur: number;
  vignette: number;
  grain: number;
  fade: number;
  sepia: number;
  grayscale: number;
  rotate: number;
  flipH: boolean;
  flipV: boolean;
}

export const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 0,
  contrast: 0,
  exposure: 0,
  saturation: 0,
  temperature: 0,
  hue: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  blur: 0,
  vignette: 0,
  grain: 0,
  fade: 0,
  sepia: 0,
  grayscale: 0,
  rotate: 0,
  flipH: false,
  flipV: false,
};

export interface Preset {
  id: string;
  name: string;
  category: string;
  description: string;
  adjustments: Partial<Adjustments>;
}

export type LayerType = 'text' | 'image' | 'shape' | 'rect';

export interface CanvasLayer {
  id: string;
  type: LayerType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  // text
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
  // shape
  fill?: string;
  radius?: number;
  // image
  src?: string;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CardProject {
  id: string;
  name: string;
  description: string;
  type: 'photo' | 'product-card' | 'card-series' | 'social' | 'video';
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
  data: unknown;
}

export type EditorMode = 'simple' | 'pro';

export interface Settings {
  mode: EditorMode;
  exportFormat: 'png' | 'jpeg';
  exportQuality: number;
  autoSave: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'simple',
  exportFormat: 'png',
  exportQuality: 0.92,
  autoSave: true,
};

export interface SocialFormat {
  id: string;
  name: string;
  platform: string;
  width: number;
  height: number;
  icon: string;
}
