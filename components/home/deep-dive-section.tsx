import Image from 'next/image'
import { CheckCircle } from 'lucide-react'

export default function DeepDiveSection() {
    return (
        <section className="bg-muted/20 py-32">
            <div className="mx-auto grid max-w-7xl items-center gap-24 px-8 lg:grid-cols-2">
                <div className="order-2 lg:order-1 relative">
                    <div className="rounded-sm border bg-background p-8 shadow-2xl">
                        <div className="mb-8 flex items-center justify-between border-b pb-4">
                            <div className="flex gap-2">
                                <div className="flex size-8 items-center justify-center rounded-full bg-stone-200 text-[10px] font-bold dark:bg-stone-700">JD</div>
                                <div className="flex size-8 items-center justify-center rounded-full bg-stone-300 text-[10px] font-bold dark:bg-stone-600">SK</div>
                                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">ME</div>
                            </div>
                            <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">3 active editors</div>
                        </div>
                        <div className="space-y-6 text-lg leading-relaxed">
                            <p>
                                Product strategy for Q4 focuses on{' '}
                                <span className="relative bg-stone-200 px-1 dark:bg-stone-700">
                                    hyper-growth metrics
                                    <span className="absolute -top-6 left-0 rounded-sm bg-stone-900 px-1.5 py-0.5 text-[9px] text-white dark:bg-stone-300 dark:text-stone-900">Jordan D.</span>
                                    <span className="absolute right-0 top-0 h-full w-[2px] bg-stone-900 dark:bg-stone-300"></span>
                                </span>{' '}
                                and user retention. We should prioritize the &quot;Instant Sync&quot; engine to ensure zero-latency across all regions.
                            </p>
                            <p>
                                Next steps involve auditing the security protocols and{' '}
                                <span className="relative bg-stone-100 px-1 dark:bg-stone-800">
                                    finalizing the API endpoints
                                    <span className="absolute -bottom-6 right-0 rounded-sm bg-stone-400 px-1.5 py-0.5 text-[9px] text-white">Sarah K.</span>
                                    <span className="absolute right-0 top-0 h-full w-[2px] animate-pulse bg-stone-400"></span>
                                </span>{' '}
                                for external integrations.
                            </p>
                        </div>
                    </div>
                    <div className="absolute -right-12 -top-12 hidden xl:block">
                        <Image
                            alt="Collaborative team"
                            className="h-48 w-48 rounded-sm object-cover grayscale brightness-110 shadow-xl"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAEGUjtFeTVfL7toSfh9Sb-yUelF5hCJocehDCxldIRIUUHJFCf_ZvzvPHL0DD9BCiFLEeB2WKrTp4gxew30NQTORJKtlv4vA800EWWpla3s00Vgw8q-FFoXaCY13gOGJtVDb5pKQkXsqpxe3HrRlUzu8aUbiEW2FYAQFDaEd7DLxyeoCu-DAIelR_BjvyJ1_UXacBD5VnlbLKPskL0adXy-i0E6Woo6ivldVzUYFaKWLQhVl_t0jqgaJ1t8aWztchBum5IyIu_WI0"
                            width={192}
                            height={192}
                        />
                    </div>
                </div>
                <div className="order-1 lg:order-2">
                    <h2 className="mb-8 text-5xl font-extrabold tracking-tighter">See your team in motion.</h2>
                    <p className="text-muted-foreground mb-8 text-xl leading-relaxed">
                        Collaboration isn&apos;t just about the final output; it&apos;s about the rhythm of creation. Our live presence engine makes remote work feel like you&apos;re in the same room.
                    </p>
                    <ul className="space-y-6">
                        <li className="flex items-start gap-4">
                            <CheckCircle className="mt-1 size-5 shrink-0" strokeWidth={1.5} />
                            <div>
                                <h4 className="font-bold">Visual Context</h4>
                                <p className="text-muted-foreground text-sm">
                                    Floating cursors and real-time text highlights show you exactly where everyone is focusing.
                                </p>
                            </div>
                        </li>
                        <li className="flex items-start gap-4">
                            <CheckCircle className="mt-1 size-5 shrink-0" strokeWidth={1.5} />
                            <div>
                                <h4 className="font-bold">Sync Consistency</h4>
                                <p className="text-muted-foreground text-sm">
                                    Our CRDT-based engine resolves conflicts automatically without user intervention.
                                </p>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    )
}
