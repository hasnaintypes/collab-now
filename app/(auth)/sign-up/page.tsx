'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { LogoIcon } from '@/components/logo'
import { Input } from '@/components/ui/input'
import { signUp } from '@/lib/auth-client'

type SignUpForm = {
    name: string
    email: string
    password: string
}

export default function SignUpPage() {
    const router = useRouter()
    const [serverError, setServerError] = useState('')

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignUpForm>()

    async function onSubmit(data: SignUpForm) {
        setServerError('')

        const { error } = await signUp.email(
            { name: data.name, email: data.email, password: data.password },
            {
                onSuccess: () => {
                    router.push('/dashboard')
                },
            }
        )

        if (error) {
            setServerError(error.message ?? 'Something went wrong. Please try again.')
        }
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

            {/* Heading */}
            <div className="mb-10 text-center">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Create your workspace</h1>
                <p className="text-muted-foreground">Enter your details to begin collaborating.</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-1.5">
                    <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Full Name
                    </label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Evelyn Thorne"
                        className="h-12 bg-muted/50 border-border/30 focus-visible:border-primary"
                        {...register('name', { required: 'Name is required.' })}
                    />
                    {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Email Address
                    </label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="evelyn@thought.co"
                        className="h-12 bg-muted/50 border-border/30 focus-visible:border-primary"
                        {...register('email', { required: 'Email is required.' })}
                    />
                    {errors.email && (
                        <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Password
                    </label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="h-12 bg-muted/50 border-border/30 focus-visible:border-primary"
                        {...register('password', {
                            required: 'Password is required.',
                            minLength: { value: 8, message: 'Password must be at least 8 characters.' },
                        })}
                    />
                    {errors.password && (
                        <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                </div>

                {serverError && (
                    <p className="text-sm text-destructive">{serverError}</p>
                )}

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground font-bold py-4 hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50">
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                </button>
            </form>

            {/* Terms */}
            <p className="mt-8 text-center text-[11px] leading-relaxed text-muted-foreground px-4">
                By signing up, you agree to our{' '}
                <Link href="#" className="underline text-foreground hover:text-primary transition-colors">Terms of Service</Link>
                {' '}and{' '}
                <Link href="#" className="underline text-foreground hover:text-primary transition-colors">Privacy Policy</Link>.
            </p>

            {/* Sign in link */}
            <div className="mt-12 text-center">
                <p className="text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <Link href="/sign-in" className="font-semibold text-foreground hover:underline transition-all">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
