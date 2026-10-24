import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send } from 'lucide-react';
import type { ViewKey } from '@/types';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  onNavigate: (key: ViewKey) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  actions?: { label: string; view: ViewKey }[];
  plan?: string[];
}

const SUGGESTIONS = [
  'Сделай фотографию светлее и теплее',
  'Подготовь главную карточку для моего товара',
  'Создай серию карточек с преимуществами и характеристиками',
  'Сделай обложку для Reels',
  'Предложи текст для рекламной карточки',
  'Подскажи, какие настройки улучшат это фото',
];

function processQuery(query: string): Message {
  const q = query.toLowerCase();
  if (q.includes('светл') || q.includes('ярч')) {
    return { role: 'assistant', content: 'Откройте фоторедактор и увеличьте яркость и температуру. Рекомендую: яркость +15, температура +12. Также можно попробовать пресет «Утренний свет» из категории Natural & Clean.', actions: [{ label: 'Открыть фоторедактор', view: 'photo-editor' }], plan: ['Открыть фоторедактор', 'Загрузить фотографию', 'Увеличить яркость до +15', 'Поднять температуру до +12', 'Или применить пресет «Утренний свет»'] };
  }
  if (q.includes('тепл')) {
    return { role: 'assistant', content: 'Для тёплого тона откройте фоторедактор и увеличьте температуру. Рекомендую также пресеты «Тёплый портрет», «Закат» или «Золотой час» из категории Instagram Aesthetic.', actions: [{ label: 'Открыть фоторедактор', view: 'photo-editor' }] };
  }
  if (q.includes('карточк') && (q.includes('товар') || q.includes('маркет'))) {
    return { role: 'assistant', content: 'Откройте конструктор карточек товаров. Там есть готовые шаблоны для одежды, косметики, электроники, украшений и других категорий. Выберите подходящий шаблон и отредактируйте текст, цвета и изображение.', actions: [{ label: 'Открыть конструктор', view: 'product-cards' }], plan: ['Открыть конструктор карточек', 'Выбрать шаблон по категории', 'Загрузить фото товара', 'Редактировать текст и цены', 'Экспортировать готовую карточку'] };
  }
  if (q.includes('сер') && q.includes('карточ')) {
    return { role: 'assistant', content: 'В конструкторе карточек нажмите «Серия» для создания связанных карточек товара: главная, преимущества, характеристики, размеры, детали, комплектация, сценарий использования и доп. информация. Общий стиль сохранится между карточками.', actions: [{ label: 'Открыть конструктор', view: 'product-cards' }] };
  }
  if (q.includes('преимуществ') || q.includes('характеристик')) {
    return { role: 'assistant', content: 'Откройте конструктор карточек и выберите шаблон «Преимущества» или «Характеристики». Добавьте свои данные — не используйте выдуманные характеристики. Введите реальные преимущества и спецификации вашего товара.', actions: [{ label: 'Открыть конструктор', view: 'product-cards' }] };
  }
  if (q.includes('reels') || q.includes('рилс') || q.includes('обложк')) {
    return { role: 'assistant', content: 'Откройте раздел «Социальные сети» и выберите формат «Обложка Reels» (1080×1920). Там есть готовые макеты: центрированный текст, текст снизу и цитата. Добавьте свой текст и изображение.', actions: [{ label: 'Открыть соцсети', view: 'social' }] };
  }
  if (q.includes('стор') || q.includes('stories') || q.includes('пост')) {
    return { role: 'assistant', content: 'В разделе «Социальные сети» доступны форматы для Instagram постов, сторис, обложек Reels, а также для VK, Telegram, YouTube и Facebook. Выберите формат и макет, затем отредактируйте контент.', actions: [{ label: 'Открыть соцсети', view: 'social' }] };
  }
  if (q.includes('видео') || q.includes('клип')) {
    return { role: 'assistant', content: 'Откройте видеоредактор. Доступны: обрезка начала и конца, изменение формата кадра (вертикальный, квадратный, горизонтальный), добавление текста поверх видео, регулировка громкости и экспорт в WebM.', actions: [{ label: 'Открыть видеоредактор', view: 'video-editor' }] };
  }
  if (q.includes('текст') && (q.includes('реклам') || q.includes('продаю') || q.includes('маркет'))) {
    return { role: 'assistant', content: 'Вот несколько вариантов рекламного текста для карточки товара:\n\n1. «Качество, которое вы заслуживаете. Премиальные материалы и продуманный дизайн.»\n\n2. «Идеальное сочетание стиля и функциональности. Оцените разницу с первого использования.»\n\n3. «Создан для тех, кто ценит детали. Ваш лучший выбор в этой категории.»\n\nОткройте конструктор карточек, чтобы добавить этот текст на холст.', actions: [{ label: 'Открыть конструктор', view: 'product-cards' }] };
  }
  if (q.includes('улучш') && q.includes('фото')) {
    return { role: 'assistant', content: 'Рекомендации по улучшению фото:\n\n1. Увеличьте контраст на +10–15 для большей глубины\n2. Поднимите резкость до 15–25 для чёткости\n3. Отрегулируйте температуру: +5 для тёплых фото, −5 для холодных\n4. Слегка поднимите светлые участки (+5–10)\n5. Попробуйте пресеты из категории «Natural & Clean» для естественного вида\n\nОткройте фоторедактор и загрузите фото для применения.', actions: [{ label: 'Открыть фоторедактор', view: 'photo-editor' }] };
  }
  if (q.includes('композиц') || q.includes('расположен')) {
    return { role: 'assistant', content: 'Для улучшения композиции карточки товара:\n\n1. Разместите продукт в центре или по правилу третей\n2. Заголовок — крупно, сверху или снизу\n3. Цена — заметно, бордовым цветом\n4. Характеристики — мелким текстом, структурированно\n5. Не перегружайте карточку: 3–5 элементов достаточно\n\nОткройте конструктор для редактирования.', actions: [{ label: 'Открыть конструктор', view: 'product-cards' }] };
  }
  if (q.includes('фон') && (q.includes('удал') || q.includes('замени'))) {
    return { role: 'assistant', content: 'Удаление фона — это ИИ-функция, которая требует подключения внешней модели. Сейчас этот сервис не подключён. Для подготовки товара используйте конструктор карточек: загрузите фото товара на однотонный фон и добавьте элементы вокруг.', actions: [{ label: 'Открыть конструктор', view: 'product-cards' }] };
  }
  if (q.includes('ретуш') || q.includes('улучшить портрет')) {
    return { role: 'assistant', content: 'Ретушь портрета — ИИ-функция, требующая внешней модели. Сейчас вы можете использовать фоторедактор с пресетами из категории «Portrait & Beauty»: «Идеальная кожа», «Ретушь», «Глянцевый портрет». Они сглаживают и улучшают портрет через фильтры.', actions: [{ label: 'Открыть фоторедактор', view: 'photo-editor' }] };
  }
  return { role: 'assistant', content: 'Я помогу с любым разделом FotoBust AI. Вот что я могу:\n\n• Обработать фото — фоторедактор со 100 пресетами\n• Создать карточку товара — конструктор с шаблонами\n• Подготовить контент для соцсетей — посты, сторис, обложки\n• Редактировать видео — обрезка, текст, форматы\n• Предложить рекламный текст и настройки фото\n\nСпросите меня о любой из этих задач.', actions: [{ label: 'Фоторедактор', view: 'photo-editor' }, { label: 'Карточки товаров', view: 'product-cards' }, { label: 'Соцсети', view: 'social' }] };
}

export function AIAssistant({ onNavigate }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: 'Здравствуйте! Я ИИ-помощник FotoBust AI. Расскажите, что хотите сделать — и я направлю вас в нужный раздел и подскажу шаги.' }]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, thinking]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    setTimeout(() => { const response = processQuery(text); setMessages((prev) => [...prev, response]); setThinking(false); }, 500 + Math.random() * 500);
  };

  return (
    <div className="flex flex-col h-full pb-16 md:pb-0 max-w-3xl mx-auto w-full">
      <div className="px-4 md:px-6 py-4 border-b border-gold/15 bg-brand-dark">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-burgundy ring-1 ring-gold/30"><Sparkles className="w-5 h-5 text-gold" /></div>
          <div><h2 className="font-semibold text-white">ИИ-помощник</h2><p className="text-xs text-gold/60">Единый чат для работы со всеми разделами</p></div>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 bg-bg">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-4 py-3', msg.role === 'user' ? 'bg-brand text-white rounded-br-md' : 'bg-bg-cream border border-border text-ink rounded-bl-md shadow-soft')}>
              <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
              {msg.plan && (<div className="mt-3 pt-3 border-t border-border/50"><p className="text-xs font-semibold text-ink-secondary mb-1.5">План действий:</p><ol className="space-y-1">{msg.plan.map((step, j) => <li key={j} className="text-xs text-ink-secondary flex items-start gap-1.5"><span className="text-brand font-semibold">{j + 1}.</span>{step}</li>)}</ol></div>)}
              {msg.actions && (<div className="flex flex-wrap gap-2 mt-3">{msg.actions.map((action, j) => <button key={j} onClick={() => onNavigate(action.view)} className={cn('chip', msg.role === 'user' ? 'bg-white/20 text-white' : 'bg-brand text-white hover:bg-brand-dark')}>{action.label}</button>)}</div>)}
            </div>
          </div>
        ))}
        {thinking && (<div className="flex justify-start"><div className="bg-bg-cream border border-border rounded-2xl rounded-bl-md shadow-soft px-4 py-3"><div className="flex gap-1">{[0, 1, 2].map((i) => <div key={i} className="w-2 h-2 bg-brand/50 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}</div></div></div>)}
      </div>
      {messages.length <= 1 && (<div className="px-4 md:px-6 pb-3 bg-bg"><p className="text-xs text-ink-secondary mb-2">Попробуйте:</p><div className="flex flex-wrap gap-2">{SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="chip bg-bg-cream border border-border text-ink hover:border-brand/40 hover:text-brand transition-colors">{s}</button>)}</div></div>)}
      <div className="px-4 md:px-6 py-3 border-t border-gold/15 bg-brand-dark">
        <div className="flex items-center gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') send(input); }} placeholder="Опишите, что хотите сделать..." className="flex-1 w-full bg-white/10 border border-white/20 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-gold/20 transition-all" />
          <button onClick={() => send(input)} disabled={!input.trim()} className="btn bg-gold text-brand-dark px-4 py-2.5 hover:bg-gold-dark active:scale-[0.98] shadow-burgundy"><Send className="w-4 h-4" /></button>
        </div>
        <p className="text-[10px] text-white/40 mt-2 text-center">Локальный помощник. Для генеративного ИИ требуется подключение внешней модели.</p>
      </div>
    </div>
  );
}
