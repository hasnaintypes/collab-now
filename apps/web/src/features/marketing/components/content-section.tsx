import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function ContentSection() {
    return (
        <section className="py-16 md:py-32">
            <div className="mx-auto max-w-5xl px-6">
                <div className="grid gap-6 md:grid-cols-2 md:gap-12">
                    <h2 className="text-4xl font-medium">The CollabNow ecosystem brings together real-time editing, sharing, and teamwork.</h2>
                    <div className="space-y-6">
                        <p>CollabNow is more than just a document editor. It supports an entire collaboration workflow — from creating and organizing documents to sharing, commenting, and co-editing in real time.</p>
                        <p>
                            Built on modern foundations. <span className="font-bold">Real-time sync powered by CRDTs</span> — every change propagates instantly to all collaborators. Rich-text editing with Lexical, live presence indicators, and granular access controls make teamwork seamless.
                        </p>
                        <Button
                            asChild
                            variant="secondary"
                            size="sm"
                            className="gap-1 pr-1.5">
                            <Link href="#features">
                                <span>Learn More</span>
                                <ChevronRight className="size-2" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}
