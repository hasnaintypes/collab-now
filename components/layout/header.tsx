'use client'
import Link from 'next/link'
import { LogoIcon } from '@/components/logo'
import { Menu, X } from 'lucide-react'
import React from 'react'

const menuItems = [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About', href: '#about' },
]

export const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)

    return (
        <header>
            <nav
                data-state={menuState ? 'active' : undefined}
                className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
                    {/* Logo */}
                    <Link
                        href="/"
                        aria-label="home"
                        className="flex items-center gap-1">
                        <LogoIcon size={28} />
                        <span className="text-xl font-bold tracking-tighter">CollabNow</span>
                    </Link>

                    {/* Center nav links — desktop */}
                    <div className="hidden items-center gap-10 font-medium tracking-tight md:flex">
                        {menuItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-muted-foreground hover:text-foreground transition-colors">
                                {item.name}
                            </Link>
                        ))}
                    </div>

                    {/* Right actions — desktop */}
                    <div className="hidden items-center gap-6 md:flex">
                        <Link
                            href="/sign-in"
                            className="text-muted-foreground font-medium hover:text-foreground transition-colors">
                            Log in
                        </Link>
                        <Link
                            href="/sign-up"
                            className="bg-primary text-primary-foreground rounded-sm px-6 py-2.5 font-medium hover:opacity-80 transition-all duration-300 active:scale-95">
                            Start Free
                        </Link>
                    </div>

                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMenuState(!menuState)}
                        aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                        className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 md:hidden">
                        <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                        <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                    </button>
                </div>

                {/* Mobile menu panel */}
                <div className="bg-background in-data-[state=active]:block mx-auto hidden max-w-7xl px-8 pb-6 md:hidden">
                    <ul className="space-y-4 border-t pt-6">
                        {menuItems.map((item) => (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className="text-muted-foreground hover:text-foreground block text-base duration-150">
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-6 flex flex-col gap-3">
                        <Link
                            href="/sign-in"
                            className="text-muted-foreground font-medium hover:text-foreground transition-colors text-center py-2">
                            Log in
                        </Link>
                        <Link
                            href="/sign-up"
                            className="bg-primary text-primary-foreground rounded-sm px-6 py-2.5 font-medium hover:opacity-80 transition-all text-center">
                            Start Free
                        </Link>
                    </div>
                </div>
            </nav>
        </header>
    )
}
