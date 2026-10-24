import { useState } from 'react';
import { Mail, Lock, Camera, ArrowLeft, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type AuthMode = 'signin' | 'signup' | 'reset';

export function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setBusy(true);
    if (mode === 'reset') {
      const { error: err } = await resetPassword(email);
      setBusy(false);
      if (err) { setError(err); return; }
      setSuccess('Инструкции по сбросу пароля отправлены на ваш email');
      return;
    }
    if (mode === 'signup') {
      const { error: err } = await signUp(email, password);
      setBusy(false);
      if (err) { setError(err); return; }
      setSuccess('Аккаунт создан. Вы можете войти.');
      setMode('signin'); setPassword('');
      return;
    }
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-dvh bg-brand-dark flex items-center justify-center px-4 py-8 safe-area-top">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center shadow-burgundy ring-1 ring-gold/30 mx-auto mb-4">
            <Camera className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-white">FotoBust AI</h1>
          <p className="text-sm text-gold/70 mt-1">
            {mode === 'signin' && 'Вход в аккаунт'}
            {mode === 'signup' && 'Создание аккаунта'}
            {mode === 'reset' && 'Восстановление пароля'}
          </p>
        </div>
        <div className="card-burgundy p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-white/70 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input id="auth-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all" />
              </div>
            </div>
            {mode !== 'reset' && (
              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-white/70 mb-1.5">Пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                  <input id="auth-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 6 символов" className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-gold/30 transition-all" />
                </div>
              </div>
            )}
            {error && <div className="flex items-center gap-2 text-xs text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
            {success && <div className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 rounded-lg px-3 py-2"><CheckCircle2 className="w-4 h-4 flex-shrink-0" />{success}</div>}
            <button type="submit" disabled={busy} className="btn bg-gold text-brand-dark w-full justify-center py-2.5 hover:bg-gold-dark active:scale-[0.98] shadow-burgundy disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{mode === 'signin' && 'Войти'}{mode === 'signup' && 'Создать аккаунт'}{mode === 'reset' && 'Отправить инструкции'}</>}
            </button>
          </form>
          <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
            {mode === 'signin' && (<>
              <button onClick={() => { setMode('signup'); setError(null); setSuccess(null); }} className="block w-full text-center text-xs text-white/60 hover:text-gold transition-colors">Нет аккаунта? Создать</button>
              <button onClick={() => { setMode('reset'); setError(null); setSuccess(null); }} className="block w-full text-center text-xs text-white/40 hover:text-gold/70 transition-colors">Забыли пароль?</button>
            </>)}
            {mode === 'signup' && <button onClick={() => { setMode('signin'); setError(null); setSuccess(null); }} className="flex items-center justify-center gap-1.5 w-full text-xs text-white/60 hover:text-gold transition-colors"><ArrowLeft className="w-3 h-3" />Уже есть аккаунт? Войти</button>}
            {mode === 'reset' && <button onClick={() => { setMode('signin'); setError(null); setSuccess(null); }} className="flex items-center justify-center gap-1.5 w-full text-xs text-white/60 hover:text-gold transition-colors"><ArrowLeft className="w-3 h-3" />Назад ко входу</button>}
          </div>
        </div>
        <p className="text-center text-[11px] text-white/50 mt-4">Проекты сохраняются локально. Войдите для синхронизации между устройствами.</p>
      </div>
    </div>
  );
}
