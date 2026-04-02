import { FileEdit, FolderOpen, ShieldCheck, Share2, MessageSquarePlus, Users } from 'lucide-react'

const features = [
    {
        icon: FileEdit,
        title: 'Real-time Editing',
        description: 'Multiple users, one document. Experience zero-latency synchronization across continents.',
    },
    {
        icon: FolderOpen,
        title: 'Document Management',
        description: 'Organized workspace for your files with nested folders and smart tagging.',
    },
    {
        icon: ShieldCheck,
        title: 'Secure Auth',
        description: 'Enterprise-grade security with SSO, 2FA, and audit logs for your data.',
    },
    {
        icon: Share2,
        title: 'Sharing & Permissions',
        description: 'Control who sees what with ease. Granular roles from viewer to admin.',
    },
    {
        icon: MessageSquarePlus,
        title: 'Inline Threaded Comments',
        description: 'Deep, contextual discussions directly within the text flow.',
    },
    {
        icon: Users,
        title: 'Live Presence Indicators',
        description: "See who's editing and where. Visual avatar stack for immediate context.",
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
