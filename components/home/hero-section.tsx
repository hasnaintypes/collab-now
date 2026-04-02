import Link from 'next/link'
import Image from 'next/image'

export default function HeroSection() {
    return (
        <section className="bg-linear-to-b from-background to-muted">
            <div className="relative py-24 md:py-40">
                <div className="relative z-10 mx-auto max-w-7xl px-8">
                    <div className="md:w-1/2">
                        <h1 className="mb-8 max-w-xl text-6xl font-bold tracking-tighter leading-[1.05] md:text-7xl">
                            CollabNow: <span className="whitespace-nowrap">Real-time</span> collaboration for modern teams
                        </h1>
                        <p className="text-muted-foreground mb-12 max-w-2xl text-xl leading-relaxed md:text-2xl">
                            Edit documents together, share with granular permissions, and see your team in action with live presence indicators.
                        </p>

                        <div className="flex flex-col gap-4 sm:flex-row">
                            <Link
                                href="/sign-up"
                                className="bg-primary text-primary-foreground rounded-sm px-10 py-5 text-lg font-bold hover:opacity-90 transition-all active:scale-95">
                                Start Collaborating
                            </Link>
                            <Link
                                href="#features"
                                className="bg-secondary text-secondary-foreground rounded-sm px-10 py-5 text-lg font-bold hover:bg-muted transition-all">
                                Book a Demo
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Large breakout image — same as original */}
                <div className="perspective-near mt-24 translate-x-12 md:absolute md:-right-6 md:bottom-16 md:left-1/2 md:top-40 md:mt-0 md:translate-x-0">
                    <div className="before:border-foreground/5 before:bg-foreground/5 relative h-full before:absolute before:-inset-x-4 before:bottom-7 before:top-0 before:skew-x-6 before:rounded-[calc(var(--radius)+1rem)] before:border">
                        <div className="bg-background rounded-(--radius) shadow-foreground/10 ring-foreground/5 relative h-full -translate-y-12 skew-x-6 overflow-hidden border border-transparent shadow-md ring-1">
                            <Image
                                src="/hero-image.png"
                                alt="Collab Now editor interface"
                                width={2880}
                                height={1842}
                                className="object-top-left size-full object-cover"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
