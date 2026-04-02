import Link from 'next/link'
import { HeroHeader } from '@/components/layout/header'
import FooterSection from '@/components/layout/footer'

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <HeroHeader />

            <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-8">
                {/* Background blurs */}
                <div className="absolute left-1/4 top-1/4 -z-10 h-96 w-96 rounded-full bg-muted opacity-30 mix-blend-multiply blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 -z-10 h-[30rem] w-[30rem] rotate-12 rounded-sm bg-muted/60 opacity-20 mix-blend-multiply blur-3xl" />

                {/* Content */}
                <div className="z-10 w-full max-w-2xl space-y-12 text-center">
                    {/* Large 404 with overlay icon */}
                    <div className="relative mb-8 inline-block">
                        <h1 className="select-none text-[12rem] font-extrabold leading-none tracking-tighter text-foreground opacity-5 md:text-[16rem]">
                            404
                        </h1>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.5}
                                className="size-16 text-primary">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
                                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={3} strokeLinecap="round" />
                                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={3} strokeLinecap="round" />
                            </svg>
                        </div>
                    </div>

                    {/* Text */}
                    <div className="space-y-6">
                        <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
                            Page Not Found
                        </h2>
                        <p className="mx-auto max-w-md text-lg leading-relaxed text-muted-foreground md:text-xl">
                            The page you&apos;re looking for doesn&apos;t exist or has been moved to a new destination.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
                        <Link
                            href="/"
                            className="w-full rounded-sm bg-primary px-10 py-4 text-center font-medium text-primary-foreground shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-all hover:opacity-90 sm:w-auto">
                            Return Home
                        </Link>
                        <div className="flex items-center gap-6 text-sm uppercase tracking-widest text-muted-foreground">
                            <Link href="#" className="border-b border-transparent transition-colors hover:border-primary hover:text-primary">
                                Help Center
                            </Link>
                            <span className="size-1 rounded-full bg-border" />
                            <Link href="#" className="border-b border-transparent transition-colors hover:border-primary hover:text-primary">
                                Contact Support
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Floating metadata */}
                <div className="absolute bottom-32 left-12 hidden lg:block">
                    <div className="origin-left -rotate-90 space-y-2 opacity-30">
                        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Error::Null_Reference</p>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">Location::Root/Canvas</p>
                    </div>
                </div>
            </main>

            <FooterSection />
        </div>
    )
}
