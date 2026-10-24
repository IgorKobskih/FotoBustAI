import { type DragEvent, useRef, useState, type ReactNode } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { cn, validateImageFile, fileToDataURL, fileToCorrectedDataURL, validateVideoFile } from '@/lib/utils';

interface FileDropZoneProps {
  onFile: (dataUrl: string, file: File) => void;
  accept?: 'image' | 'video';
  label?: string;
  className?: string;
  compact?: boolean;
  children?: ReactNode;
}

export function FileDropZone({
  onFile, accept = 'image', label, className, compact, children
}: FileDropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const validate = accept === 'image' ? validateImageFile : validateVideoFile;
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    try {
      if (accept === 'image') {
        const dataUrl = await fileToCorrectedDataURL(file);
        onFile(dataUrl, file);
      } else {
        const dataUrl = await fileToDataURL(file);
        onFile(dataUrl, file);
      }
    } catch {
      setError('Не удалось загрузить файл. Попробуйте другой файл.');
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200',
          compact ? 'p-4' : 'p-8',
          dragging
            ? 'border-brand bg-brand-light/30'
            : 'border-border hover:border-brand/40 hover:bg-brand-light/20'
        )}
      >
        {children || (
          <div className="flex flex-col items-center text-center gap-2">
            <div className={cn('rounded-full bg-brand-light flex items-center justify-center', compact ? 'w-10 h-10' : 'w-14 h-14')}>
              <Upload className={cn('text-brand', compact ? 'w-5 h-5' : 'w-7 h-7')} />
            </div>
            <p className="text-sm font-medium text-ink">
              {label || (accept === 'image' ? 'Перетащите фото или нажмите для выбора' : 'Перетащите видео или нажмите для выбора')}
            </p>
            {!compact && (
              <p className="text-xs text-ink-secondary">
                {accept === 'image' ? 'JPEG, PNG, WebP — до 50 МБ' : 'MP4, WebM, MOV — до 200 МБ'}
              </p>
            )}
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-2 mt-2 text-sm text-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept === 'image' ? 'image/jpeg,image/png,image/webp' : 'video/mp4,video/webm,video/quicktime'}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
