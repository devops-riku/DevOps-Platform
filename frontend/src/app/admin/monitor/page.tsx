'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
    Activity, Shield, Server, Box, Cpu, HardDrive,
    Search, RefreshCw, Layers, ChevronRight, User,
    Terminal, ExternalLink, Filter, Circle, Globe,
    ArrowUpRight, AlertCircle, CheckCircle2, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ActiveProject {
    id: string
    name: string
    user_email: string
    status: 'active' | 'deploying' | 'idle' | 'failed' | 'draft'
    runtime: string
    repo: string
    container_id: string
}

export default function AdminMonitorPage() {
    const [projects, setProjects] = useState<ActiveProject[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const router = useRouter()

    const fetchAllProjects = async () => {
        setLoading(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            const response = await axios.get(`${apiUrl}/projects/admin/all`)
            setProjects(response.data)
        } catch (err) {
            toast.error("Cloud synchronization failed")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAllProjects()
        const interval = setInterval(fetchAllProjects, 10000) // Poll every 10s
        return () => clearInterval(interval)
    }, [])

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.repo.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        deploying: projects.filter(p => p.status === 'deploying').length,
        failed: projects.filter(p => p.status === 'failed').length,
    }

    return (
        <div className="h-screen bg-[#020617] text-slate-300 font-sans selection:bg-primary/20 flex flex-col overflow-hidden">
            {/* Navigation Header */}
            <header className="h-14 bg-black/40 backdrop-blur-md border-b border-white/5 z-50 px-6 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push('/dashboard')}>
                        <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-all">
                            <Layers className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-white font-bold text-[11px] uppercase tracking-[0.2em] transition-opacity group-hover:opacity-80">
                            Kubiks <span className="text-primary italic">Engine</span>
                        </span>
                    </div>
                    <div className="h-3 w-px bg-white/10 mx-2" />
                    <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold text-slate-500">
                        Admin <ChevronRight className="w-3 h-3 text-slate-700" /> <span className="text-slate-400">Cluster Intelligence</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search instances, users, or repos..."
                            className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-[10px] w-64 focus:border-primary/50 outline-none transition-all placeholder:text-slate-700 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => router.push('/admin/stacks')}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase tracking-widest rounded-md border border-white/5 transition-all"
                    >
                        Runtime Forge
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col p-8">
                <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
                    {/* Metrics Bar */}
                    <div className="grid grid-cols-4 gap-4 mb-8 flex-shrink-0">
                        {[
                            { label: 'Total Instances', value: stats.total, icon: Server, color: 'text-white' },
                            { label: 'Stabilized', value: stats.active, icon: CheckCircle2, color: 'text-emerald-400' },
                            { label: 'Provisioning', value: stats.deploying, icon: RefreshCw, color: 'text-primary' },
                            { label: 'Critical Errors', value: stats.failed, icon: AlertCircle, color: 'text-red-400' },
                        ].map((stat, i) => (
                            <div key={i} className="glass-card p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between group hover:border-white/10 transition-colors">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                    <p className={`text-2xl font-bold ${stat.color} tracking-tight`}>{stat.value}</p>
                                </div>
                                <stat.icon className={`w-5 h-5 ${stat.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                            </div>
                        ))}
                    </div>

                    {/* Main Table Area */}
                    <div className="flex-1 glass-card border border-white/5 bg-black/20 rounded-xl flex flex-col overflow-hidden shadow-2xl relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />

                        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-primary" />
                                Live Deployment Grid
                            </h2>
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                    <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500 animate-pulse" />
                                    Cluster Healthy
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse relative z-10">
                                <thead className="sticky top-0 bg-[#0A0F1D] z-20">
                                    <tr className="border-b border-white/5">
                                        <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Service Identity</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Runtime</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Administrator</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Integrity</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Container ID</th>
                                        <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.02]">
                                    {loading && projects.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Hydrating Grid...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredProjects.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-2 text-slate-600">
                                                    <Search className="w-8 h-8 opacity-20 mb-2" />
                                                    <span className="text-[10px] font-bold uppercase tracking-widest">No active runtimes found</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProjects.map((project) => (
                                            <tr key={project.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white/5 rounded border border-white/5 group-hover:border-primary/20 transition-colors">
                                                            <Box className="w-3.5 h-3.5 text-primary" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[13px] font-bold text-white tracking-tight">{project.name}</div>
                                                            <div className="text-[9px] text-slate-600 font-mono mt-0.5">{project.repo}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase tracking-tighter">
                                                        {project.runtime || 'Container'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1 bg-white/5 rounded-full border border-white/5">
                                                            <User className="w-3 h-3 text-slate-500" />
                                                        </div>
                                                        <span className="text-[11px] text-slate-400 font-medium">{project.user_email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <StatusBadge status={project.status} />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                                        <span className="text-[10px] font-mono text-slate-500 italic uppercase">
                                                            {project.status === 'active' ? (project.container_id?.substring(0, 12) || 'EXPOSED') : 'OFFLINE'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="p-2 hover:bg-white/5 rounded-md text-slate-500 hover:text-white transition-colors group/btn">
                                                        <Terminal className="w-3.5 h-3.5 group-hover/btn:text-primary" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(196, 181, 253, 0.1);
                }
            `}</style>
        </div>
    )
}

function StatusBadge({ status }: { status: ActiveProject['status'] }) {
    const config = {
        active: { label: 'Stabilized', color: 'text-emerald-400', bg: 'bg-emerald-400/5', border: 'border-emerald-400/20', icon: CheckCircle2 },
        deploying: { label: 'Provisioning', color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20', icon: RefreshCw },
        idle: { label: 'Halted', color: 'text-slate-500', bg: 'bg-slate-500/5', border: 'border-slate-500/20', icon: Clock },
        failed: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-400/5', border: 'border-red-400/20', icon: AlertCircle },
        draft: { label: 'Staged', color: 'text-indigo-400', bg: 'bg-indigo-400/5', border: 'border-indigo-400/20', icon: Box },
    }

    const s = config[status] || config.idle
    const Icon = s.icon

    return (
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${s.bg} ${s.border} ${s.color}`}>
            <Icon className={`w-3 h-3 ${status === 'deploying' ? 'animate-spin' : ''}`} />
            <span className="text-[9px] font-bold uppercase tracking-widest">{s.label}</span>
        </div>
    )
}
