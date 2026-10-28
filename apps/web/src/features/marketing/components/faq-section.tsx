'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const faqItems = [
    {
        id: 'item-1',
        question: "How secure is my team's data?",
        answer: 'Every connection to your data runs over TLS, and access to a workspace and its documents is scoped per-member by role. Documents are never public by default: you control exactly who can view or edit each one.',
    },
    {
        id: 'item-2',
        question: 'Can we export our documents?',
        answer: 'Yes, export any document as Markdown, plain text, or PDF at any time. We believe in total data portability.',
    },
    {
        id: 'item-3',
        question: 'How does the AI notes feature work?',
        answer: "Paste a YouTube video link or an article URL (from the dashboard or the browser extension) and CollabNow transcribes or extracts the source, then generates structured notes into a new document. Pick from five note styles (bullet outline, Cornell, mind-map, Q&A/flashcards, or executive summary), and switch styles later without re-fetching the source.",
    },
    {
        id: 'item-4',
        question: 'What is "Ask about this"?',
        answer: "A chat panel scoped to a single document: ask it questions and it answers only from that document's own source material, nothing else. It's available on Pro and Team plans.",
    },
]

export default function FAQSection() {
    const [openId, setOpenId] = useState<string | null>(null)

    return (
        <section className="bg-muted py-32">
            <div className="mx-auto max-w-3xl px-8">
                <h2 className="mb-16 text-center text-4xl font-extrabold tracking-tighter">Frequently asked questions.</h2>
                <div className="space-y-4">
                    {faqItems.map((item) => (
                        <div key={item.id} className="border-b bg-background p-8">
                            <button
                                onClick={() => setOpenId(openId === item.id ? null : item.id)}
                                className="flex w-full cursor-pointer items-center justify-between list-none">
                                <span className="text-left text-lg font-bold">{item.question}</span>
                                <ChevronDown
                                    className={`size-5 shrink-0 transition-transform ${openId === item.id ? 'rotate-180' : ''}`}
                                    strokeWidth={1.5}
                                />
                            </button>
                            {openId === item.id && (
                                <p className="mt-4 text-muted-foreground leading-relaxed">{item.answer}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
