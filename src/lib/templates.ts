import type { CanvasLayer, CanvasSize } from '@/types';
import { generateId } from '@/lib/utils';

export interface ProductTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  size: CanvasSize;
  layers: () => CanvasLayer[];
}

export const CANVAS_PRESETS: { id: string; name: string; width: number; height: number }[] = [
  { id: 'square-1000', name: 'Квадрат 1000×1000', width: 1000, height: 1000 },
  { id: 'wb-900', name: 'WB 900×1200', width: 900, height: 1200 },
  { id: 'wb-800', name: 'WB 800×800', width: 800, height: 800 },
  { id: 'ozon-1000', name: 'Ozon 1000×1500', width: 1000, height: 1500 },
  { id: 'a4', name: 'A4 1240×1754', width: 1240, height: 1754 },
  { id: 'story-1080', name: 'Story 1080×1920', width: 1080, height: 1920 },
];

function textLayer(text: string, x: number, y: number, fontSize: number, color: string, fontWeight = 400, fontFamily = 'Inter', width = 800, align: 'left' | 'center' | 'right' = 'left'): CanvasLayer {
  return { id: generateId(), type: 'text', name: text.slice(0, 20), text, x, y, width, height: fontSize * 1.5, rotation: 0, opacity: 1, visible: true, locked: false, fontSize, fontFamily, fontWeight, color, textAlign: align, lineHeight: 1.4 };
}

function rectLayer(x: number, y: number, w: number, h: number, fill: string, radius = 0): CanvasLayer {
  return { id: generateId(), type: 'rect', name: 'Прямоугольник', x, y, width: w, height: h, rotation: 0, opacity: 1, visible: true, locked: false, fill, radius };
}

function shapeLayer(x: number, y: number, w: number, h: number, fill: string): CanvasLayer {
  return { id: generateId(), type: 'shape', name: 'Фигура', x, y, width: w, height: h, rotation: 0, opacity: 1, visible: true, locked: false, fill, radius: 8 };
}

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  { id: 'tpl-clothing-main', name: 'Одежда — Главная', category: 'Одежда', description: 'Главная карточка для одежды', size: { width: 1000, height: 1000 }, layers: () => [rectLayer(0, 0, 1000, 1000, '#FFFFFF'), rectLayer(0, 0, 1000, 6, '#800020'), textLayer('Название товара', 50, 720, 36, '#292326', 600, 'Inter', 900, 'left'), textLayer('Бренд • Коллекция 2025', 50, 770, 20, '#81757A', 400, 'Inter', 900, 'left'), textLayer('2 990 ₽', 50, 830, 32, '#800020', 700, 'Inter', 900, 'left'), rectLayer(50, 900, 200, 50, '#800020', 25), textLayer('В корзину', 150, 925, 20, '#FFFFFF', 600, 'Inter', 200, 'center')] },
  { id: 'tpl-cosmetics-main', name: 'Косметика — Главная', category: 'Косметика', description: 'Главная карточка косметики', size: { width: 1000, height: 1000 }, layers: () => [rectLayer(0, 0, 1000, 1000, '#F3E4E7'), shapeLayer(120, 120, 300, 300, '#800020'), textLayer('Название средства', 50, 520, 34, '#292326', 600, 'Inter', 900, 'left'), textLayer('Объём: 50 мл', 50, 570, 22, '#81757A', 400, 'Inter', 900, 'left'), textLayer('1 490 ₽', 50, 630, 36, '#800020', 700, 'Inter', 900, 'left'), textLayer('Для всех типов кожи', 50, 700, 18, '#81757A', 400, 'Inter', 900, 'left')] },
  { id: 'tpl-electronics-main', name: 'Электроника — Главная', category: 'Электроника', description: 'Главная карточка электроники', size: { width: 1000, height: 1000 }, layers: () => [rectLayer(0, 0, 1000, 1000, '#FFFFFF'), rectLayer(0, 0, 1000, 120, '#292326'), textLayer('Название модели', 50, 50, 28, '#FFFFFF', 600, 'Inter', 900, 'left'), textLayer('Артикул: 000001', 50, 85, 16, '#81757A', 400, 'Inter', 900, 'left'), textLayer('12 990 ₽', 50, 750, 40, '#800020', 700, 'Inter', 900, 'left'), textLayer('Гарантия 12 месяцев', 50, 810, 20, '#81757A', 400, 'Inter', 900, 'left'), shapeLayer(50, 870, 180, 50, '#800020'), textLayer('Купить', 140, 895, 20, '#FFFFFF', 600, 'Inter', 180, 'center')] },
  { id: 'tpl-jewelry-main', name: 'Украшения — Главная', category: 'Украшения', description: 'Премиальная карточка украшений', size: { width: 1000, height: 1000 }, layers: () => [rectLayer(0, 0, 1000, 1000, '#FAF7F5'), rectLayer(0, 0, 1000, 8, '#800020'), textLayer('Название украшения', 50, 700, 32, '#292326', 500, 'Playfair Display', 900, 'left'), textLayer('Серебро 925 пробы', 50, 750, 20, '#81757A', 400, 'Inter', 900, 'left'), textLayer('4 990 ₽', 50, 810, 34, '#800020', 600, 'Inter', 900, 'left')] },
  { id: 'tpl-home-main', name: 'Товары для дома — Главная', category: 'Товары для дома', description: 'Карточка для товаров для дома', size: { width: 1000, height: 1000 }, layers: () => [rectLayer(0, 0, 1000, 1000, '#FFFFFF'), shapeLayer(50, 50, 900, 60, '#F3E4E7'), textLayer('Название товара', 500, 70, 26, '#800020', 600, 'Inter', 900, 'center'), textLayer('Материал: натуральный', 50, 740, 22, '#292326', 400, 'Inter', 900, 'left'), textLayer('1 990 ₽', 50, 800, 34, '#800020', 700, 'Inter', 900, 'left')] },
  { id: 'tpl-accessory-main', name: 'Аксессуары — Главная', category: 'Аксессуары', description: 'Карточка для аксессуаров', size: { width: 1000, height: 1000 }, layers: () => [rectLayer(0, 0, 1000, 1000, '#FFFFFF'), textLayer('Название аксессуара', 50, 700, 30, '#292326', 600, 'Inter', 900, 'left'), textLayer('Размер: универсальный', 50, 750, 20, '#81757A', 400, 'Inter', 900, 'left'), textLayer('990 ₽', 50, 810, 32, '#800020', 700, 'Inter', 900, 'left'), rectLayer(50, 880, 160, 44, '#800020', 22), textLayer('Купить', 130, 902, 18, '#FFFFFF', 600, 'Inter', 160, 'center')] },
  { id: 'tpl-food-main', name: 'Продукты — Главная', category: 'Продукты питания', description: 'Карточка для продуктов питания', size: { width: 1000, height: 1000 }, layers: () => [rectLayer(0, 0, 1000, 1000, '#FFFFFF'), shapeLayer(50, 50, 200, 60, '#800020'), textLayer('НОВИНКА', 150, 75, 18, '#FFFFFF', 600, 'Inter', 200, 'center'), textLayer('Название продукта', 50, 720, 32, '#292326', 600, 'Inter', 900, 'left'), textLayer('Вес: 500 г', 50, 770, 20, '#81757A', 400, 'Inter', 900, 'left'), textLayer('350 ₽', 50, 830, 34, '#800020', 700, 'Inter', 900, 'left')] },
  { id: 'tpl-features', name: 'Преимущества', category: 'Универсальные', description: 'Карточка с преимуществами товара', size: { width: 1000, height: 1000 }, layers: () => [rectLayer(0, 0, 1000, 1000, '#FAF7F5'), textLayer('Преимущества', 500, 60, 36, '#800020', 600, 'Playfair Display', 900, 'center'), shapeLayer(50, 140, 880, 80, '#FFFFFF'), textLayer('1. Преимущество первое', 70, 165, 22, '#292326', 500, 'Inter', 840, 'left'), shapeLayer(50, 240, 880, 80, '#FFFFFF'), textLayer('2. Преимущество второе', 70, 265, 22, '#292326', 500, 'Inter', 840, 'left'), shapeLayer(50, 340, 880, 80, '#FFFFFF'), textLayer('3. Преимущество третье', 70, 365, 22, '#292326', 500, 'Inter', 840, 'left')] },
  { id: 'tpl-specs', name: 'Характеристики', category: 'Универсальные', description: 'Карточка с характеристиками', size: { width: 1000, height: 1000 }, layers: () => [rectLayer(0, 0, 1000, 1000, '#FFFFFF'), rectLayer(0, 0, 1000, 80, '#800020'), textLayer('Характеристики', 500, 40, 30, '#FFFFFF', 600, 'Playfair Display', 900, 'center'), textLayer('Материал: —', 50, 130, 22, '#292326', 400, 'Inter', 900, 'left'), textLayer('Размер: —', 50, 180, 22, '#292326', 400, 'Inter', 900, 'left'), textLayer('Вес: —', 50, 230, 22, '#292326', 400, 'Inter', 900, 'left'), textLayer('Цвет: —', 50, 280, 22, '#292326', 400, 'Inter', 900, 'left'), textLayer('Страна: —', 50, 330, 22, '#292326', 400, 'Inter', 900, 'left'), textLayer('Гарантия: —', 50, 380, 22, '#292326', 400, 'Inter', 900, 'left')] },
];

export const SERIES_CARD_TYPES = [
  { id: 'main', name: 'Главная карточка', templateId: 'tpl-clothing-main' },
  { id: 'features', name: 'Преимущества', templateId: 'tpl-features' },
  { id: 'specs', name: 'Характеристики', templateId: 'tpl-specs' },
  { id: 'sizes', name: 'Размеры', templateId: null },
  { id: 'details', name: 'Детали крупным планом', templateId: null },
  { id: 'kit', name: 'Комплектация', templateId: null },
  { id: 'usage', name: 'Сценарий использования', templateId: null },
  { id: 'info', name: 'Доп. информация', templateId: null },
];

export const SOCIAL_FORMATS: { id: string; name: string; platform: string; width: number; height: number; icon: string }[] = [
  { id: 'ig-post', name: 'Instagram пост', platform: 'Instagram', width: 1080, height: 1080, icon: 'Square' },
  { id: 'ig-story', name: 'Instagram Story', platform: 'Instagram', width: 1080, height: 1920, icon: 'RectangleVertical' },
  { id: 'ig-reel-cover', name: 'Обложка Reels', platform: 'Instagram', width: 1080, height: 1920, icon: 'RectangleVertical' },
  { id: 'yt-thumb', name: 'YouTube обложка', platform: 'YouTube', width: 1280, height: 720, icon: 'RectangleHorizontal' },
  { id: 'yt-shorts', name: 'YouTube Shorts', platform: 'YouTube', width: 1080, height: 1920, icon: 'RectangleVertical' },
  { id: 'vk-post', name: 'VK пост', platform: 'ВКонтакте', width: 1080, height: 1080, icon: 'Square' },
  { id: 'tg-post', name: 'Telegram пост', platform: 'Telegram', width: 1080, height: 1080, icon: 'Square' },
  { id: 'fb-post', name: 'Facebook пост', platform: 'Facebook', width: 1200, height: 1200, icon: 'Square' },
  { id: 'banner', name: 'Баннер', platform: 'Универсальный', width: 1500, height: 500, icon: 'RectangleHorizontal' },
  { id: 'ad-creative', name: 'Рекламный креатив', platform: 'Универсальный', width: 1080, height: 1080, icon: 'Square' },
  { id: 'quote', name: 'Цитатная карточка', platform: 'Универсальный', width: 1080, height: 1080, icon: 'Square' },
  { id: 'collage', name: 'Коллаж', platform: 'Универсальный', width: 1080, height: 1080, icon: 'Grid' },
];

export const SOCIAL_LAYOUTS: { id: string; name: string; build: (w: number, h: number) => CanvasLayer[] }[] = [
  { id: 'layout-centered', name: 'Центрированный текст', build: (w, h) => [rectLayer(0, 0, w, h, '#800020'), textLayer('Заголовок', 0, h / 2 - 60, 48, '#FFFFFF', 700, 'Playfair Display', w, 'center'), textLayer('Подзаголовок', 0, h / 2 + 20, 24, '#F3E4E7', 400, 'Inter', w, 'center')] },
  { id: 'layout-bottom', name: 'Текст снизу', build: (w, h) => [rectLayer(0, 0, w, h, '#FAF7F5'), rectLayer(0, h - 200, w, 200, '#800020'), textLayer('Заголовок', 50, h - 150, 36, '#FFFFFF', 600, 'Inter', w - 100, 'left'), textLayer('Описание', 50, h - 90, 20, '#F3E4E7', 400, 'Inter', w - 100, 'left')] },
  { id: 'layout-quote', name: 'Цитата', build: (w, h) => [rectLayer(0, 0, w, h, '#292326'), textLayer('«', 50, h / 2 - 120, 120, '#800020', 700, 'Playfair Display', 100, 'left'), textLayer('Ваша цитата здесь', 80, h / 2 - 20, 40, '#FFFFFF', 500, 'Playfair Display', w - 160, 'center'), textLayer('— Автор', 80, h / 2 + 80, 24, '#81757A', 400, 'Inter', w - 160, 'center')] },
  { id: 'layout-blank', name: 'Пустой холст', build: (w, h) => [rectLayer(0, 0, w, h, '#FFFFFF')] },
];
