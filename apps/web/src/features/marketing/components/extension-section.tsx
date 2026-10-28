import Link from 'next/link'
import { Puzzle, ArrowRight } from 'lucide-react'

/**
 * Compact callout rather than a full section — the extension is a
 * distinct entry point (PRD §6.11) worth surfacing on its own, but it's
 * the same underlying flow AiNotesSection already walks through, just
 * triggered from a tab instead of the dashboard. A high-contrast banner
 * reads as its own beat without needing the plain/muted alternation the
 * taller sections use.
 */
export default function ExtensionSection() {
    return (
        <section className="bg-primary text-primary-foreground">
            <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-8 py-16 text-center md:flex-row md:justify-between md:text-left">
                <div className="flex items-center gap-5">
                    <div className="bg-primary-foreground/10 flex size-14 shrink-0 items-center justify-center rounded-sm">
                        <Puzzle className="size-6" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight">Already on the page? Skip the dashboard.</h3>
                        <p className="opacity-80 mt-1 max-w-xl">
                            The CollabNow browser extension generates notes from whatever tab you&apos;re on: one click, no copy-pasting URLs.
                        </p>
                    </div>
                </div>
                <Link
                    href="/sign-up"
                    className="bg-primary-foreground text-primary flex shrink-0 items-center gap-2 rounded-sm px-8 py-3.5 font-bold transition-opacity hover:opacity-90">
                    Get Started
                    <ArrowRight className="size-4" />
                </Link>
            </div>
        </section>
    )
}
