'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'system', icon: Monitor, label: 'System' },
    { value: 'dark', icon: Moon, label: 'Dark' },
] as const

export function ThemeSwitch() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="flex h-9 items-center gap-1 rounded-full border bg-muted p-1">
                {themes.map((t) => (
                    <div key={t.value} className="flex size-7 items-center justify-center rounded-full">
                        <t.icon className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="flex h-9 items-center gap-1 rounded-full border bg-muted p-1">
            {themes.map((t) => (
                <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    aria-label={`Switch to ${t.label} theme`}
                    className={`flex size-7 cursor-pointer items-center justify-center rounded-full transition-all ${
                        theme === t.value
                            ? 'bg-background shadow-sm'
                            : 'hover:bg-background/50'
                    }`}>
                    <t.icon
                        className={`size-3.5 transition-colors ${
                            theme === t.value ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                        strokeWidth={1.5}
                    />
                </button>
            ))}
        </div>
    )
}
