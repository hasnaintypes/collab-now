'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { LogoIcon } from '@/components/logo'
import { sendVerificationEmail } from '@/lib/auth/client'
import { Mail } from 'lucide-react'

function VerifyEmailContent() {
    const searchParams = useSearchParams()
    const email = searchParams.get('email') || ''
    const [resending, setResending] = useState(false)
    const [resent, setResent] = useState(false)

    async function handleResend() {
        if (!email || resending) return
        setResending(true)
        setResent(false)

        try {
            await sendVerificationEmail({ email })
            setResent(true)
        } catch {
            // silently fail — user can try again
        }

        setResending(false)
    }

    return (
        <div className="w-full max-w-md">
            {/* Logo */}
            <div className="mb-12 text-center">
                <Link href="/" className="inline-flex items-center gap-2">
                    <LogoIcon size={32} />
                    <span className="text-2xl font-bold tracking-tighter">CollabNow</span>
                </Link>
            </div>

            {/* Icon + Heading */}
            <div className="mb-10 text-center">
                <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
                    <Mail className="size-7 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Check your email</h1>
                <p className="text-muted-foreground">
                    We sent a verification link to{' '}
                    {email ? <strong className="text-foreground">{email}</strong> : 'your email'}.
                    Click the link to verify your account.
                </p>
            </div>

            {/* Resend */}
            <div className="text-center space-y-4">
                <button
                    onClick={handleResend}
                    disabled={resending || !email}
                    className="w-full bg-primary text-primary-foreground font-bold py-4 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                >
                    {resending ? 'Sending...' : resent ? 'Email sent!' : 'Resend verification email'}
                </button>

                {resent && (
                    <p className="text-sm text-muted-foreground">
                        A new verification email has been sent.
                    </p>
                )}
            </div>

            {/* Sign in link */}
            <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground">
                    Already verified?{' '}
                    <Link href="/sign-in" className="font-semibold text-foreground hover:underline transition-all">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailContent />
        </Suspense>
    )
}
