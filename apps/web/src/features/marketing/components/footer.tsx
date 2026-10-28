import { LogoIcon } from '@/components/logo'
import { ThemeSwitch } from '@/components/theme-switch'
import Link from 'next/link'

// Only real destinations — no Terms/Privacy/About/Blog/Careers/Docs/
// Community pages exist yet, and a footer full of dead href="#" links
// is worse than a shorter, honest one.
const footerLinks = {
    Product: [
        { name: 'Features', href: '#features' },
        { name: 'Pricing', href: '#pricing' },
    ],
    Resources: [
        { name: 'Help Center', href: '/help' },
    ],
}

export default function FooterSection() {
    return (
        <footer className="w-full bg-muted/50 py-24">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-12 px-8 md:grid-cols-4">
                <div className="col-span-2">
                    <Link href="/" className="mb-6 inline-flex items-center gap-2">
                        <LogoIcon size={24} />
                        <span className="text-lg font-black tracking-tighter">CollabNow</span>
                    </Link>
                    <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
                        The kinetic workspace for teams that create at the speed of thought. Built for the modern, distributed era.
                    </p>
                </div>
                {Object.entries(footerLinks).map(([category, links]) => (
                    <div key={category} className="flex flex-col gap-4">
                        <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">{category}</span>
                        {links.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="text-muted-foreground hover:text-foreground text-sm tracking-wide transition-all">
                                {link.name}
                            </Link>
                        ))}
                    </div>
                ))}
            </div>
            <div className="mx-auto mt-24 flex max-w-7xl items-center justify-between border-t border-border px-8 pt-12">
                <p className="text-muted-foreground text-sm tracking-wide">
                    &copy; {new Date().getFullYear()} CollabNow. All rights reserved.
                </p>
                <ThemeSwitch />
            </div>
        </footer>
    )
}
