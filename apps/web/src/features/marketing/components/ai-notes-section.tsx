import Link from 'next/link'
import { ArrowRight, Link2, Sparkles, Users2 } from 'lucide-react'

const steps = [
    {
        icon: Link2,
        step: '1',
        title: 'Paste a link',
        description: 'A YouTube video or an article URL, from the dashboard or with one click from the browser extension on any tab.',
    },
    {
        icon: Sparkles,
        step: '2',
        title: 'Get structured notes',
        description: 'CollabNow transcribes or extracts the source and generates notes in the style you pick: bullet outline, Cornell, mind-map, Q&A, or executive summary.',
    },
    {
        icon: Users2,
        step: '3',
        title: 'Collaborate on them',
        description: 'The notes land in a real document: edit, comment, and share it with your team like any other, or ask it questions with "Ask about this".',
    },
]

export default function AiNotesSection() {
    return (
        <section className="bg-muted/20 py-32">
            <div className="mx-auto max-w-7xl px-8">
                <div className="mb-20 max-w-2xl">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
                        Don&apos;t start from a blank page.
                    </h2>
                    <p className="text-muted-foreground text-xl leading-relaxed">
                        Paste a link, and CollabNow turns it into a document your team can actually work from.
                    </p>
                </div>
                <div className="grid gap-16 md:grid-cols-3">
                    {steps.map((item) => (
                        <div key={item.step}>
                            <div className="bg-secondary mb-6 flex size-12 items-center justify-center">
                                <item.icon className="size-5" strokeWidth={1.5} />
                            </div>
                            <div className="text-muted-foreground mb-2 text-xs font-bold uppercase tracking-widest">
                                Step {item.step}
                            </div>
                            <h3 className="mb-3 text-xl font-bold">{item.title}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                        </div>
                    ))}
                </div>
                <Link
                    href="#pricing"
                    className="text-muted-foreground hover:text-foreground mt-16 inline-flex items-center gap-1.5 text-sm font-medium transition-colors">
                    Free includes 5 notes a month, see full pricing
                    <ArrowRight className="size-3.5" />
                </Link>
            </div>
        </section>
    )
}
