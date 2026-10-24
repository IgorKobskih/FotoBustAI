import { useState } from 'react';
import { Check, Sparkles, Crown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingPageProps { currentPlan: string; }

const PRICING_CONFIG = {
  plans: [
    { id: 'free', name: 'Free', price: '$0', period: 'forever', description: 'Basic tools to get started', features: ['Basic photo editor', '20 presets', 'Limited templates', 'Local projects', 'Basic export (PNG, JPEG)', 'Card builder'], highlight: false },
    { id: 'pro', name: 'Pro', price: '$9.99', period: '/ month', yearlyPrice: '$79.99 / year', description: 'Advanced tools for professionals', features: ['All photo editor tools', 'Full library — 100 presets', 'Extended card templates', 'All social media formats', 'Video editor without watermarks', 'Extra projects', 'Priority support'], highlight: true },
    { id: 'pro-plus', name: 'Pro Plus', price: '$19.99', period: '/ month', description: 'Professional workflows and priority AI', features: ['Everything in Pro', 'Professional tools', 'Extended workflows', 'Unlimited card series', 'Priority AI features', 'Extended storage', 'Team collaboration (coming soon)'], highlight: false },
  ],
};

export function PricingPage({ currentPlan }: PricingPageProps) {
  const [subModal, setSubModal] = useState<string | null>(null);
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
      <div className="card-burgundy p-8 text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 text-gold text-xs font-semibold mb-3"><Sparkles className="w-3.5 h-3.5" />Pricing Plans</div>
        <h2 className="font-display text-2xl md:text-3xl font-semibold text-white mb-2">Choose your plan</h2>
        <p className="text-sm text-white/60 max-w-lg mx-auto">All prices shown in USD. Subscriptions are managed through your App Store or Google Play account.</p>
        <div className="gold-line mt-5 max-w-xs mx-auto" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {PRICING_CONFIG.plans.map((plan) => (
          <div key={plan.id} className={cn('card p-6 relative flex flex-col', plan.id === 'pro-plus' ? 'bg-brand-dark border border-white/15 shadow-burgundy text-white' : plan.highlight ? 'border-brand border-2 shadow-medium' : '')}>
            {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-medium px-3 py-1 rounded-full shadow-soft">Recommended</div>}
            {plan.id === 'pro-plus' && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-brand-dark text-xs font-semibold px-3 py-1 rounded-full shadow-soft flex items-center gap-1"><Crown className="w-3 h-3" />Premium</div>}
            <div className="mb-4"><h3 className={cn('font-display text-xl font-semibold', plan.id === 'pro-plus' ? 'text-white' : 'text-ink')}>{plan.name}</h3><p className={cn('text-xs mt-1', plan.id === 'pro-plus' ? 'text-white/50' : 'text-ink-secondary')}>{plan.description}</p></div>
            <div className="mb-4"><div className="flex items-baseline gap-1"><span className={cn('font-display text-3xl font-bold', plan.id === 'pro-plus' ? 'text-gold' : 'text-brand')}>{plan.price}</span><span className={cn('text-sm', plan.id === 'pro-plus' ? 'text-white/50' : 'text-ink-secondary')}>{plan.period}</span></div>{plan.yearlyPrice && <p className={cn('text-xs mt-1', plan.id === 'pro-plus' ? 'text-white/60' : 'text-success')}>or {plan.yearlyPrice}</p>}</div>
            <ul className="space-y-2 mb-6 flex-1">{plan.features.map((feature, i) => <li key={i} className="flex items-start gap-2"><Check className={cn('w-4 h-4 flex-shrink-0 mt-0.5', plan.id === 'pro-plus' ? 'text-gold' : 'text-brand')} /><span className={cn('text-sm', plan.id === 'pro-plus' ? 'text-white/80' : 'text-ink')}>{feature}</span></li>)}</ul>
            <button onClick={() => { if (currentPlan !== plan.id) setSubModal(plan.id); }} disabled={currentPlan === plan.id} className={cn('btn w-full justify-center', plan.highlight ? 'btn-primary' : 'btn-secondary', currentPlan === plan.id ? 'opacity-50 cursor-default' : '')}>{currentPlan === plan.id ? 'Current Plan' : 'Subscribe'}</button>
          </div>
        ))}
      </div>
      <div className="mt-8 card-burgundy p-5"><h3 className="font-semibold text-white mb-2 text-sm">Pricing Information</h3><ul className="space-y-1.5 text-xs text-white/50"><li>• Prices are shown in USD and may vary by region.</li><li>• Subscriptions are billed through Apple App Store or Google Play.</li><li>• Plan verification is performed server-side.</li><li>• All basic features are available for free — photo editing, cards, social, video.</li><li>• Cancel anytime from your App Store or Google Play account settings.</li></ul></div>
      {subModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSubModal(null)}>
          <div className="card-burgundy p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSubModal(null)} className="absolute top-3 right-3 w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center" aria-label="Close"><X className="w-4 h-4 text-white/60" /></button>
            <Crown className="w-10 h-10 text-gold mx-auto mb-3" />
            <h3 className="font-display text-lg font-semibold text-white mb-2">{PRICING_CONFIG.plans.find((p) => p.id === subModal)?.name} Plan</h3>
            <p className="text-sm text-white/60 mb-4">In-app purchase integration is in progress. Subscriptions will be available through the App Store and Google Play using StoreKit and RevenueCat.</p>
            <button onClick={() => setSubModal(null)} className="btn-secondary btn-sm w-full justify-center">Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
