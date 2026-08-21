export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 md:py-24">
            {children}
        </div>
    )
}
