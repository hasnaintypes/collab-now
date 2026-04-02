import Image from 'next/image'
import { cn } from '../lib/utils'

export const Logo = ({ className }: { className?: string }) => {
    return (
        <span className={cn('inline-flex items-center gap-2', className)}>
            <LogoIcon size={28} />
            <span className="text-lg font-bold tracking-tight">CollabNow</span>
        </span>
    )
}

export const LogoIcon = ({ className, size = 24 }: { className?: string; size?: number }) => {
    return (
        <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
            <Image
                src="/light-icon.png"
                alt="Collab Now"
                width={size}
                height={size}
                className="dark:hidden"
                priority
            />
            <Image
                src="/dark-icon.png"
                alt="Collab Now"
                width={size}
                height={size}
                className="hidden dark:block"
                priority
            />
        </span>
    )
}
