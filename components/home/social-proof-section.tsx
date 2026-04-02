export default function SocialProofSection() {
    return (
        <section className="bg-muted py-20 border-y">
            <div className="mx-auto max-w-7xl px-8">
                <p className="text-muted-foreground mb-12 text-center text-xs font-bold uppercase tracking-[0.2em]">
                    Trusted by over 10,000 teams
                </p>
                <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale transition-all duration-500 hover:grayscale-0 md:gap-24">
                    <span className="text-2xl font-black">LUMINA</span>
                    <span className="text-2xl font-black">ARCHIVE</span>
                    <span className="text-2xl font-black">NORDIC</span>
                    <span className="text-2xl font-black">ELEMENT</span>
                    <span className="text-2xl font-black">PRISM</span>
                </div>
            </div>
        </section>
    )
}
