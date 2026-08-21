'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'

const faqItems = [
    {
        id: 'item-1',
        question: "How secure is my team's data?",
        answer: 'We use AES-256 encryption at rest and TLS 1.3 for data in transit. Our infrastructure is SOC2 Type II compliant and regularly audited by third-party security firms.',
    },
    {
        id: 'item-2',
        question: 'Can we export our documents?',
        answer: 'Yes, you can export your data in Markdown, PDF, or HTML formats at any time. We believe in total data portability.',
    },
    {
        id: 'item-3',
        question: 'Does CollabNow support offline editing?',
        answer: 'Absolutely. Changes made while offline are stored locally and synchronized automatically the moment a connection is re-established.',
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
