'use client'

import { Github } from 'lucide-react'

export default function LoginPage() {
    const handleLogin = () => {
        // Redirect to backend auth endpoint
        const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
        window.location.href = `${backendUrl}/api/v1/auth/login/github`
    }

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-background text-foreground overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-700">
                <div className="glass-panel p-10 rounded-lg border-white/5 shadow-2xl">
                    <div className="mb-10 text-center">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                <Github className="w-10 h-10 text-primary" />
                            </div>
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-white">
                            DevOps <span className="text-accent-gradient">Platform</span>
                        </h1>
                        <p className="text-slate-400 text-sm">Unified infrastructure & deployment hub</p>
                    </div>

                    <button
                        onClick={handleLogin}
                        className="w-full relative flex items-center justify-center gap-3 bg-white text-background font-bold py-4 px-6 rounded-lg hover:bg-slate-100 transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.1)] group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <Github className="w-5 h-5" />
                        Continue with GitHub
                    </button>

                    <div className="mt-8 pt-8 border-t border-white/5">
                        <p className="text-center text-[10px] uppercase tracking-widest text-slate-500 font-medium">
                            Powered by OpenTelemetry & AI
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-xs text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                    By accessing this platform, you agree to our
                    <span className="text-slate-400 hover:text-white cursor-pointer px-1">Terms</span>
                    and
                    <span className="text-slate-400 hover:text-white cursor-pointer px-1">Privacy Protocols</span>.
                </p>
            </div>
        </div>
    )
}
