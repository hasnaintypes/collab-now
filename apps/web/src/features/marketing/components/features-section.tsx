import { FileEdit, Sparkles, MessageCircleQuestion, Puzzle, Share2, Users } from 'lucide-react'

const features = [
    {
        icon: FileEdit,
        title: 'Real-time Editing',
        description: 'Multiple users, one document. Zero-latency synchronization, same as the rest of this editor.',
    },
    {
        icon: Sparkles,
        title: 'AI Notes from Any Link',
        description: 'Paste a YouTube video or article URL and get structured notes generated straight into a new document, with five styles to choose from, including Cornell and mind-map.',
    },
    {
        icon: MessageCircleQuestion,
        title: 'Ask About This Document',
        description: "A chat panel scoped to one document: it answers only from that document's own source material.",
    },
    {
        icon: Puzzle,
        title: 'Browser Extension',
        description: 'Generate notes from any tab without leaving the page you\'re already on.',
    },
    {
        icon: Share2,
        title: 'Sharing & Permissions',
        description: 'Control who sees what with ease. Granular roles from viewer to admin.',
    },
    {
        icon: Users,
        title: 'Live Presence & Comments',
        description: "See who's editing and where, and leave threaded comments directly in the text.",
    },
]

export default function FeaturesSection() {
    return (
        <section id="features" className="py-32">
            <div className="mx-auto max-w-7xl px-8">
                <div className="mb-24 max-w-2xl">
                    <h2 className="mb-6 text-4xl font-bold tracking-tight">Engineered for high-velocity creation.</h2>
                    <p className="text-muted-foreground leading-relaxed">
                        The toolset you need to move from idea to execution without friction. No clutter, just the features that matter.
                    </p>
                </div>
                <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
                    {features.map((feature) => (
                        <div key={feature.title} className="group">
                            <div className="bg-secondary mb-6 flex size-12 items-center justify-center transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <feature.icon className="size-5" strokeWidth={1.5} />
                            </div>
                            <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
