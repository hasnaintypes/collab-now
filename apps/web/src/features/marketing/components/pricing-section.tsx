import { Check } from 'lucide-react'
import Link from 'next/link'

// Numbers here match PLAN_NOTES_LIMIT (apps/web/src/features/billing/lib/
// plan-limits.ts) — the real gate is AI notes generations/month, not docs
// or seats. Every workspace also has a flat 50-document cap regardless of
// plan. Dollar amounts are indicative pending real Paddle pricing.
const plans = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        features: ['5 AI notes per month', 'Real-time collaboration', 'Up to 50 documents'],
        cta: 'Get Started',
        href: '/sign-up',
        highlighted: false,
    },
    {
        name: 'Pro',
        price: '$15',
        period: '/mo',
        features: ['100 AI notes per month', '"Ask about this" document chat', 'Up to 50 documents'],
        cta: 'Try Pro Free',
        href: '/sign-up',
        highlighted: true,
    },
    {
        name: 'Team',
        price: '$49',
        period: '/mo',
        features: ['300 AI notes/month, shared across your team', '"Ask about this" document chat', 'Up to 50 documents'],
        cta: 'Get Started',
        href: '/sign-up',
        highlighted: false,
    },
]

export default function PricingSection() {
    return (
        <section id="pricing" className="py-40">
            <div className="mx-auto max-w-7xl px-8">
                <div className="mb-24 text-center">
                    <h2 className="mb-6 text-5xl font-extrabold tracking-tighter">Simple, transparent pricing.</h2>
                    <p className="text-muted-foreground">Choose the plan that matches your team&apos;s ambition.</p>
                    <p className="text-muted-foreground/60 mt-2 text-xs">Pricing is indicative and may change before launch.</p>
                </div>
                <div className="grid gap-8 md:grid-cols-3">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative flex h-full flex-col rounded-sm p-10 transition-colors ${
                                plan.highlighted
                                    ? 'border-2 border-primary'
                                    : 'border border-border/20 hover:border-primary'
                            }`}>
                            {plan.highlighted && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                                    Most Popular
                                </div>
                            )}
                            <div className="mb-8">
                                <h3 className="mb-2 text-xl font-bold">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black">{plan.price}</span>
                                    <span className="text-muted-foreground text-sm font-medium">{plan.period}</span>
                                </div>
                            </div>
                            <ul className="mb-12 flex-grow space-y-4">
                                {plan.features.map((feature, i) => (
                                    <li key={feature} className={`flex items-center gap-3 text-sm text-muted-foreground ${plan.highlighted && i === 0 ? 'font-bold' : ''}`}>
                                        <Check className={`size-[18px] ${plan.highlighted ? 'text-primary' : ''}`} strokeWidth={2} />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={plan.href}
                                className={`block w-full rounded-sm py-4 text-center font-bold transition-all ${
                                    plan.highlighted
                                        ? 'bg-primary text-primary-foreground hover:opacity-90'
                                        : 'border border-primary text-foreground hover:bg-primary hover:text-primary-foreground'
                                }`}>
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
