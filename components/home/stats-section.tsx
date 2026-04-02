export default function StatsSection() {
    return (
        <section className="border-t py-24">
            <div className="mx-auto max-w-7xl px-8">
                <div className="grid grid-cols-1 gap-12 text-center md:grid-cols-3">
                    <div>
                        <div className="mb-2 text-6xl font-black">99.9%</div>
                        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Uptime</p>
                    </div>
                    <div>
                        <div className="mb-2 text-6xl font-black">1M+</div>
                        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Documents</p>
                    </div>
                    <div>
                        <div className="mb-2 text-6xl font-black">500+</div>
                        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Teams</p>
                    </div>
                </div>
            </div>
        </section>
    )
}
