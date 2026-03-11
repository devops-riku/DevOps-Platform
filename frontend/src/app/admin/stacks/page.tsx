'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
    Plus, Trash2, Edit2, Save, X, Database, Globe, Server,
    Code2, Layout, Terminal as TerminalIcon, Info, Search,
    Settings, Layers, Box, Cpu, HardDrive, LayoutDashboard,
    Activity, ChevronRight, MoreVertical, Zap, Command,
    Shield, Globe2, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Stack {
    id: string
    name: string
    type: 'backend' | 'frontend' | 'database'
    dockerfile_template: string
    default_port: number
    description: string
    icon_name: string
}

export default function AdminStacksPage() {
    const [stacks, setStacks] = useState<Stack[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const router = useRouter()

    const [formData, setFormData] = useState({
        name: '',
        type: 'backend',
        dockerfile_template: '',
        default_port: 8000,
        description: '',
        icon_name: 'Box'
    })

    const fetchStacks = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            const response = await axios.get(`${apiUrl}/stacks/`)
            setStacks(response.data)
        } catch (err) {
            toast.error("Cluster sync failed")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStacks()
    }, [])

    const handleSave = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            if (editingId) {
                await axios.put(`${apiUrl}/stacks/${editingId}`, formData)
                toast.success("Runtime updated")
            } else {
                await axios.post(`${apiUrl}/stacks/`, formData)
                toast.success("New runtime registered")
            }
            setIsAdding(false)
            setEditingId(null)
            fetchStacks()
        } catch (err) {
            toast.error("Provisioning failed")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Decommission this runtime blueprint?")) return
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            await axios.delete(`${apiUrl}/stacks/${id}`)
            toast.success("Runtime decommissioned")
            fetchStacks()
        } catch (err) {
            toast.error("Decommissioning failed")
        }
    }

    const startEdit = (stack: Stack) => {
        setEditingId(stack.id)
        setFormData({
            name: stack.name,
            type: stack.type,
            dockerfile_template: stack.dockerfile_template,
            default_port: stack.default_port,
            description: stack.description,
            icon_name: stack.icon_name
        })
        setIsAdding(true)
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
                        Admin <ChevronRight className="w-3 h-3 text-slate-700" /> <span className="text-slate-400">Engine Provisioner</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/admin/monitor')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-[9px] font-bold uppercase tracking-widest rounded-md border border-white/5 transition-all"
                    >
                        <Activity className="w-3 h-3 text-primary" /> Live Cluster Monitor
                    </button>
                    <button
                        onClick={() => {
                            setIsAdding(true)
                            setEditingId(null)
                            setFormData({
                                name: '', type: 'backend', dockerfile_template: '',
                                default_port: 8000, description: '', icon_name: 'Box'
                            })
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-bold uppercase tracking-widest rounded-md border border-primary/20 transition-all"
                    >
                        <Plus className="w-3 h-3" /> Provision New Runtime
                    </button>
                    <div className="w-8 h-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center">
                        <User className="w-4 h-4 text-slate-500" />
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="max-w-6xl mx-auto">
                        {/* Hero Section */}
                        <div className="mb-10 animate-in fade-in slide-in-from-left-4 duration-700">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-4 h-4 text-primary animate-pulse" />
                                <h1 className="text-2xl font-bold text-white tracking-tight italic">Runtime Forge</h1>
                            </div>
                            <p className="text-slate-500 text-xs max-w-xl font-medium leading-relaxed">
                                Define and orchestrate the core execution environments. These templates drive
                                how distributed services are provisioned and stabilized across the cluster.
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32 gap-4">
                                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">Syncing Engine...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in zoom-in-95 duration-700 delay-100">
                                {stacks.map(stack => (
                                    <div key={stack.id} className="relative group overflow-hidden h-[240px]">
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                                        <div className="h-full glass-card p-5 rounded-xl border border-white/5 group-hover:border-primary/30 transition-all duration-300 flex flex-col justify-between backdrop-blur-sm relative z-10">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-2.5 bg-black/40 rounded-lg border border-white/5 group-hover:border-primary/20 transition-colors shadow-inner">
                                                        {stack.type === 'backend' ? <Server className="w-4 h-4 text-primary" /> :
                                                            stack.type === 'frontend' ? <Layout className="w-4 h-4 text-indigo-400" /> :
                                                                <Database className="w-4 h-4 text-purple-400" />}
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform duration-300">
                                                        <button onClick={() => startEdit(stack)} className="p-1.5 hover:bg-white/5 rounded-md text-slate-500 hover:text-white transition-colors">
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDelete(stack.id)} className="p-1.5 hover:bg-white/5 rounded-md text-slate-500 hover:text-red-400 transition-colors">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <h3 className="text-white font-bold text-[15px] tracking-tight mb-1">{stack.name}</h3>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-[8px] font-bold uppercase tracking-widest text-primary/70 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                                                        {stack.type}
                                                    </span>
                                                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600 italic">Protocol V1.2</span>
                                                </div>
                                                <p className="text-slate-500 text-[11px] font-medium leading-relaxed line-clamp-3">
                                                    {stack.description || "Experimental deployment blueprint with high-availability orchestration capabilities."}
                                                </p>
                                            </div>

                                            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1 h-1 rounded-full bg-emerald-500/80" />
                                                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Port {stack.default_port} Active</span>
                                                </div>
                                                <Code2 className="w-3.5 h-3.5 text-slate-700 opacity-50" />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {!isAdding && (
                                    <button
                                        onClick={() => {
                                            setIsAdding(true)
                                            setEditingId(null)
                                            setFormData({
                                                name: '', type: 'backend', dockerfile_template: '',
                                                default_port: 8000, description: '', icon_name: 'Box'
                                            })
                                        }}
                                        className="h-[240px] glass-card p-6 rounded-xl border border-dashed border-white/10 hover:border-primary/30 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-3 group group"
                                    >
                                        <div className="p-3 bg-white/5 rounded-full group-hover:bg-primary/20 transition-all group-hover:scale-110 duration-300">
                                            <Plus className="w-5 h-5 text-slate-600 group-hover:text-primary" />
                                        </div>
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600 group-hover:text-primary transition-colors">Draft New Runtime</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </main>

                {/* Overlay Panel for Add/Edit - Slides from Right */}
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex justify-end">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsAdding(false)} />
                        <div className="w-full max-w-2xl bg-[#050B14] border-l border-white/10 h-full relative z-10 animate-in slide-in-from-right-full duration-500 ease-out flex flex-col shadow-2xl">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded border border-primary/20">
                                        <Command className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-white uppercase tracking-widest leading-none mb-1">
                                            {editingId ? 'Modify Runtime' : 'Forge New Blueprint'}
                                        </h2>
                                        <p className="text-[10px] text-slate-500 font-medium">Provisioning Protocol Definition</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors group">
                                    <X className="w-5 h-5 text-slate-500 group-hover:text-white" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
                                <div className="grid grid-cols-1 gap-8">
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Runtime Identity</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Next.js High Performance"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-800 text-sm font-medium"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cluster Role</label>
                                                <div className="relative">
                                                    <select
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-all text-sm font-medium appearance-none cursor-pointer"
                                                        value={formData.type}
                                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                                    >
                                                        <option value="backend">Backend Core</option>
                                                        <option value="frontend">Frontend Edge</option>
                                                        <option value="database">Data Persistence</option>
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Edge Port</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary/50 outline-none font-mono text-sm"
                                                    value={formData.default_port}
                                                    onChange={e => setFormData({ ...formData, default_port: parseInt(e.target.value) })}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Architectural Note</label>
                                            <textarea
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-primary/50 outline-none min-h-[80px] resize-none text-sm font-medium leading-relaxed"
                                                placeholder="Briefly describe the runtime's architectural intent..."
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-end mb-1">
                                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Provisioning Payload (Dockerfile)</label>
                                            <span className="text-[8px] text-slate-600 bg-white/5 px-2 py-0.5 rounded uppercase tracking-tighter">Docker V2.4 Compatible</span>
                                        </div>
                                        <div className="relative group/editor">
                                            <div className="absolute top-4 right-4 z-10 opacity-0 group-hover/editor:opacity-100 transition-opacity">
                                                <div className="flex gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                                                </div>
                                            </div>
                                            <textarea
                                                className="w-full bg-black/60 border border-white/10 rounded-xl px-5 py-6 text-primary focus:border-primary/50 outline-none min-h-[350px] font-mono text-[11px] leading-6 shadow-inner custom-scrollbar"
                                                placeholder="FROM node:20&#10;WORKDIR /app&#10;COPY package.json .&#10;RUN ${BUILD_COMMAND}&#10;CMD ${START_COMMAND}"
                                                value={formData.dockerfile_template}
                                                onChange={e => setFormData({ ...formData, dockerfile_template: e.target.value })}
                                            />
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                            <Info className="w-3.5 h-3.5 text-primary" />
                                            <p className="text-[10px] text-slate-400 font-medium italic">
                                                Inject <code className="text-primary font-bold">{"${BUILD_COMMAND}"}</code> and <code className="text-primary font-bold">{"${START_COMMAND}"}</code> for dynamic provisioning.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-end gap-3 flex-shrink-0">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="px-5 py-2 hover:bg-white/5 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded transition-all"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-7 py-2 bg-primary text-slate-950 text-[10px] font-black uppercase tracking-widest rounded hover:shadow-[0_0_20px_rgba(196,181,253,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    {editingId ? 'Update Runtime' : 'Register Runtime'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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

function User(props: { className?: string }) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}

function ChevronDown(props: { className?: string }) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    )
}
