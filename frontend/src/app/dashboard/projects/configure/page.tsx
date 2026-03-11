'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import axios from 'axios'
import {
    Cpu,
    Database,
    Layout,
    Settings,
    Rocket,
    ChevronRight,
    ChevronLeft,
    Plus,
    X,
    CheckCircle2,
    Loader2,
    Github,
    Globe,
    GitBranch,
    ArrowRight,
    History,
    Lock,
    Server,
    Zap,
    Cloud,
    Layers,
    Shield,
    Box,
    Info,
    XCircle,
    Star,
    ChevronDown,
    Check,
    Eye,
    EyeOff,
    FileText
} from 'lucide-react'
import { toast } from 'sonner'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'

// Wrap in Suspense for useSearchParams

interface Stack {
    id: string
    name: string
    type: 'backend' | 'frontend' | 'database'
    dockerfile_template: string
    default_port: number
    description: string
    icon_name: string
}

function ConfigureContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const repoId = searchParams.get('repo_id')
    const repoName = searchParams.get('repo_name')
    const repoFullName = searchParams.get('repo_full_name')
    const workspaceId = searchParams.get('workspace_id')
    const deployType = searchParams.get('deploy_type') || 'pipeline'

    // Form State
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [branches, setBranches] = useState<any[]>([])
    const [stacks, setStacks] = useState<Stack[]>([])
    const [selectedStack, setSelectedStack] = useState<string>('')

    const [projectName, setProjectName] = useState('')
    const [selectedProject, setSelectedProject] = useState('none')
    const [branch, setBranch] = useState('')
    const [rootDir, setRootDir] = useState('')
    const [buildCommand, setBuildCommand] = useState('')
    const [startCommand, setStartCommand] = useState('')

    // Docker Specific State
    const [dockerSource, setDockerSource] = useState<'repo' | 'path' | 'registry'>('repo')
    const [dockerfilePath, setDockerfilePath] = useState('./Dockerfile')
    const [buildContext, setBuildContext] = useState('.')
    const [containerPort, setContainerPort] = useState('3000')
    const [registryImage, setRegistryImage] = useState('')

    const [envVars, setEnvVars] = useState([{ key: '', value: '' }])
    const [showBulkInput, setShowBulkInput] = useState(false)
    const [bulkInput, setBulkInput] = useState('')
    const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set())

    const getAuthToken = () => {
        const cookieString = typeof document !== 'undefined' ? document.cookie : ''
        const cookies = cookieString.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=')
            acc[key] = value
            return acc
        }, {} as Record<string, string>)
        return cookies['sb-access-token']
    }

    const getGithubToken = (workspace?: any) => {
        if (workspace?.github_access_token) return workspace.github_access_token

        const cookieString = typeof document !== 'undefined' ? document.cookie : ''
        const cookies = cookieString.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=')
            acc[key] = value
            return acc
        }, {} as Record<string, string>)
        return cookies['gh-token'] || cookies['sb-access-token']
    }

    useEffect(() => {
        const initConfigure = async () => {
            setLoading(true)
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

                // 1. Fetch Workspace to get the token
                let token = '';
                if (workspaceId) {
                    try {
                        const wsRes = await axios.get(`${apiUrl}/workspaces/by-id/${workspaceId}`)
                        token = getGithubToken(wsRes.data)
                    } catch (e) {
                        console.error("Failed to fetch workspace for token", e)
                        token = getGithubToken() // Fallback
                    }
                } else {
                    token = getGithubToken()
                }

                // 2. Fetch Branches
                if (repoFullName && token) {
                    const [owner, repo] = repoFullName.split('/')
                    const res = await axios.get(`${apiUrl}/github/repos/${owner}/${repo}/branches`, {
                        params: { github_token: token }
                    })
                    setBranches(res.data)
                    if (res.data.length > 0) setBranch(res.data[0].name)
                }

                // 3. Fetch Stacks
                const stacksRes = await axios.get(`${apiUrl}/stacks/`)
                setStacks(stacksRes.data)
                if (stacksRes.data.length > 0) setSelectedStack(stacksRes.data[0].name)
            } catch (err) {
                console.error("Failed to fetch repository details", err)
            } finally {
                setLoading(false)
            }
        }
        initConfigure()
    }, [repoFullName, workspaceId])

    const handleAddEnv = () => setEnvVars([...envVars, { key: '', value: '' }])
    const handleRemoveEnv = (index: number) => {
        const newVars = envVars.filter((_, i) => i !== index)
        setEnvVars(newVars.length ? newVars : [{ key: '', value: '' }])
    }
    const handleEnvChange = (index: number, field: 'key' | 'value', val: string) => {
        const newVars = [...envVars]
        newVars[index][field] = val
        setEnvVars(newVars)
    }

    const toggleSecret = (index: number) => {
        const next = new Set(revealedIndices)
        if (next.has(index)) {
            next.delete(index)
        } else {
            next.add(index)
        }
        setRevealedIndices(next)
    }

    const handleBulkImport = () => {
        const lines = bulkInput.split('\n')
        const newVars = lines
            .map(line => {
                const trimmed = line.trim()
                if (!trimmed || trimmed.startsWith('#')) return null
                const equalsIndex = trimmed.indexOf('=')
                if (equalsIndex === -1) return null

                let key = trimmed.substring(0, equalsIndex).trim()
                let value = trimmed.substring(equalsIndex + 1).trim()

                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.substring(1, value.length - 1)
                }

                return { key, value }
            })
            .filter((v): v is { key: string, value: string } => v !== null)

        if (newVars.length > 0) {
            setEnvVars(prev => {
                const filteredPrev = prev.filter(v => v.key || v.value)
                return [...filteredPrev, ...newVars]
            })
            setBulkInput('')
            setShowBulkInput(false)
            toast.success(`${newVars.length} variables imported successfully.`)
        } else {
            toast.error('No valid variables found in input.')
        }
    }

    const deployProject = async () => {
        setSubmitting(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            const envObj = envVars.reduce((acc, cur) => {
                if (cur.key) acc[cur.key] = cur.value
                return acc
            }, {} as Record<string, string>)

            await axios.post(`${apiUrl}/projects/`, {
                name: projectName || repoName,
                github_repo_id: repoId,
                github_repo_name: repoName,
                github_repo_full_name: repoFullName,
                language: selectedStack,
                branch,
                root_dir: rootDir,
                build_command: buildCommand,
                start_command: startCommand,
                env_vars: envObj,
                workspace_id: workspaceId,
                deploy_type: deployType,
                docker_config: deployType === 'docker' ? {
                    source: dockerSource,
                    dockerfile_path: dockerfilePath,
                    build_context: buildContext,
                    container_port: containerPort,
                    registry_image: registryImage
                } : null
            }, {
                headers: {
                    Authorization: `Bearer ${getAuthToken()}`
                },
                params: { user_email: 'egermino.riku@gmail.com' }
            })

            toast.success('System Provisioning Authorized', {
                description: 'Container orchestration initiated successfully.'
            })
            router.push('/dashboard')
        } catch (err) {
            console.error('Deployment failed:', err)
            toast.error('Provisioning Critical Failure', {
                description: 'The deployment sequence was interrupted.'
            })
        } finally {
            setSubmitting(false)
        }
    }

    const steps = [
        { id: 1, title: 'Project Identity', desc: 'Project Context', icon: Settings },
        { id: 2, title: 'Source Link', desc: 'Source Code', icon: Github },
        { id: 3, title: 'Build Settings', desc: 'Build & Start', icon: Zap },
        { id: 4, title: 'Secrets & Variables', desc: 'Env Variables', icon: Layout },
        { id: 5, title: 'Final Check', desc: 'Final Manifest', icon: Rocket }
    ]

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background">
                <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50 mb-4" />
                <p className="text-slate-600 font-bold text-[10px] uppercase tracking-widest animate-pulse">Initializing Provisoning Layer...</p>
            </div>
        )
    }

    return (
        <div className="h-screen bg-background text-slate-300 overflow-hidden font-sans selection:bg-primary/30 flex text-xs">
            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cyan-500/10 rounded-full blur-[100px]" />
            </div>

            {/* Sidebar Stepper */}
            <aside className="w-80 border-r border-white/5 bg-white/[0.01] backdrop-blur-xl relative z-10 flex flex-col shrink-0">
                <div className="p-10 border-b border-white/5">
                    <button
                        onClick={() => router.push('/dashboard?view=connect')}
                        className="flex items-center gap-2 text-slate-600 hover:text-white transition-all group text-[10px] font-bold uppercase tracking-widest mb-6"
                    >
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Cancel Sequence
                    </button>
                    <h2 className="text-xl font-bold text-white tracking-tight">Start Deployment</h2>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">L-4 Environment Auth</p>
                </div>

                <nav className="flex-grow p-10 space-y-6 overflow-y-auto select-scrollbar font-bold">
                    {steps.map((s) => (
                        <div key={s.id} className="flex gap-4 group cursor-default">
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all border ${step === s.id ? 'bg-primary border-primary text-white shadow-[0_0_20px_rgba(99,102,241,0.3)]' : step > s.id ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-white/5 border-white/10 text-slate-700'}`}>
                                    {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                                </div>
                                {s.id !== steps.length && (
                                    <div className={`w-[1px] h-10 my-1 transition-all ${step > s.id ? 'bg-emerald-500/20' : 'bg-white/5'}`} />
                                )}
                            </div>
                            <div className="pt-1">
                                <div className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${step === s.id ? 'text-white' : 'text-slate-600'}`}>{s.title}</div>
                                <div className="text-[9px] text-slate-700 font-bold mt-0.5">{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-10 border-t border-white/5">
                    <div className="flex items-center gap-3 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                        <Shield className="w-3.5 h-3.5" /> Secure Edge Ready
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-grow relative z-10 flex flex-col min-w-0">
                <div className="flex-grow p-16 select-scrollbar overflow-y-auto">
                    <div className="max-w-3xl mx-auto">
                        {step === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                                <header>
                                    <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Service Identity & Protocol</h3>
                                    <p className="text-slate-500 text-sm font-medium">Define how your service will be identified and provisioned across the grid.</p>
                                </header>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Project Identifier</label>
                                        <input
                                            type="text"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-4 px-6 focus:border-primary/50 outline-none transition-all text-white text-sm"
                                            placeholder={repoName || "e.g. cloudflow-core-api"}
                                        />
                                    </div>

                                    {deployType === 'pipeline' && (
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Runtime Environment</label>
                                            <Select value={selectedStack} onValueChange={setSelectedStack}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select execution stack" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {stacks.length > 0 ? stacks.map(s => (
                                                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                                    )) : (
                                                        <SelectItem value="none" disabled>No runtimes provisioned</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Provisioning Method</label>
                                        <div className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-lg text-white font-bold text-[11px] uppercase tracking-widest">
                                            {deployType === 'docker' ? (
                                                <>
                                                    <Box className="w-4 h-4 text-cyan-500" /> Immutable Container
                                                </>
                                            ) : (
                                                <>
                                                    <Zap className="w-4 h-4 text-primary" /> Automated Pipeline
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Cluster Context</label>
                                        <Select value={selectedProject} onValueChange={setSelectedProject}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Assign to cluster" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Standalone Deployment</SelectItem>
                                                <SelectItem value="new">+ Register New Cluster</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                                <header>
                                    <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Source Manifest</h3>
                                    <p className="text-slate-500 text-sm font-medium">Link your repository source to the provisioning engine.</p>
                                </header>
                                <div className="space-y-8">
                                    <div className="p-6 bg-white/[0.02] rounded-lg border border-white/5 flex items-center gap-5">
                                        <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                                            <Github className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <div>
                                            <div className="text-base font-bold text-white">{repoName}</div>
                                            <div className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mt-1">{repoId}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">VCS Branch</label>
                                            <Combobox
                                                options={branches.map(b => ({ label: b.name, value: b.name }))}
                                                value={branch}
                                                onValueChange={setBranch}
                                                placeholder="Select source branch"
                                                searchPlaceholder="Filter branches..."
                                                emptyMessage="No branches found."
                                                loading={loading}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Execution Root</label>
                                            <input
                                                type="text"
                                                value={rootDir}
                                                onChange={(e) => setRootDir(e.target.value)}
                                                className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-4 px-6 focus:border-primary/50 outline-none transition-all text-white font-mono text-xs"
                                                placeholder="./ (Project Root)"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                                <header>
                                    <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Execution Sequence</h3>
                                    <p className="text-slate-500 text-sm font-medium">Define the core build logic and execution triggers.</p>
                                </header>
                                {deployType === 'docker' ? (
                                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                        {/* Docker Source Selection */}
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Docker Source</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {[
                                                    { id: 'repo', name: 'Repo Dockerfile', icon: Github, desc: 'Auto-detect in root' },
                                                    { id: 'path', name: 'Custom Path', icon: FileText, desc: 'Specify location' },
                                                    { id: 'registry', name: 'Public Registry', icon: Cloud, desc: 'Pull from GHCR/DockerHub' }
                                                ].map((src) => (
                                                    <button
                                                        key={src.id}
                                                        onClick={() => setDockerSource(src.id as any)}
                                                        className={`p-5 rounded-lg border flex flex-col gap-3 transition-all text-left ${dockerSource === src.id ? 'bg-[#1A0B2E] border-primary/40 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-white/[0.01] border-white/5 text-slate-600'}`}
                                                    >
                                                        <src.icon className={`w-5 h-5 ${dockerSource === src.id ? 'text-primary' : 'text-slate-800'}`} />
                                                        <div>
                                                            <div className="text-[11px] font-bold uppercase text-white tracking-widest leading-none mb-1">{src.name}</div>
                                                            <div className="text-[9px] font-bold text-slate-700 uppercase leading-none">{src.desc}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            {dockerSource === 'registry' ? (
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Image Registry URL</label>
                                                    <input
                                                        type="text"
                                                        value={registryImage}
                                                        onChange={(e) => setRegistryImage(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/5 rounded-lg py-4 px-6 focus:border-primary/50 outline-none transition-all text-white font-mono text-sm"
                                                        placeholder="e.g. ghcr.io/user/app:latest"
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    {dockerSource === 'path' && (
                                                        <div className="space-y-3">
                                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Dockerfile Path</label>
                                                            <input
                                                                type="text"
                                                                value={dockerfilePath}
                                                                onChange={(e) => setDockerfilePath(e.target.value)}
                                                                className="w-full bg-black/40 border border-white/5 rounded-lg py-4 px-6 focus:border-primary/50 outline-none transition-all text-white font-mono text-sm"
                                                                placeholder="./Dockerfile"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="space-y-3">
                                                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Build Context</label>
                                                        <input
                                                            type="text"
                                                            value={buildContext}
                                                            onChange={(e) => setBuildContext(e.target.value)}
                                                            className="w-full bg-black/40 border border-white/5 rounded-lg py-4 px-6 focus:border-primary/50 outline-none transition-all text-white font-mono text-sm"
                                                            placeholder="."
                                                        />
                                                    </div>
                                                </>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Internal Container Port</label>
                                                    <input
                                                        type="text"
                                                        value={containerPort}
                                                        onChange={(e) => setContainerPort(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/5 rounded-lg py-4 px-6 focus:border-cyan-500/50 outline-none transition-all text-cyan-400 font-mono text-sm"
                                                        placeholder="3000"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Override Entrypoint (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={startCommand}
                                                        onChange={(e) => setStartCommand(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/5 rounded-lg py-4 px-6 focus:border-white/20 outline-none transition-all text-slate-400 font-mono text-sm"
                                                        placeholder="e.g. ./start.sh"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Build Command</label>
                                            <input
                                                type="text"
                                                value={buildCommand}
                                                onChange={(e) => setBuildCommand(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg py-4 px-6 focus:border-emerald-500/50 outline-none transition-all text-emerald-400 font-mono text-sm"
                                                placeholder="e.g. npm run build or pip install -r requirements.txt"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Start Command</label>
                                            <input
                                                type="text"
                                                value={startCommand}
                                                onChange={(e) => setStartCommand(e.target.value)}
                                                className="w-full bg-black/40 border border-white/5 rounded-lg py-4 px-6 focus:border-cyan-500/50 outline-none transition-all text-cyan-400 font-mono text-sm"
                                                placeholder="e.g. npm start or gunicorn app:app"
                                            />
                                        </div>
                                        <div className="bg-primary/5 p-6 rounded-lg border border-primary/10">
                                            <div className="flex items-center gap-3 text-primary font-bold text-[10px] uppercase tracking-widest">
                                                <Info className="w-4 h-4" /> Optimization Notice
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">System defaults will be applied if commands are left blank. Our engine auto-detects standard frameworks during the pre-build phase.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {step === 4 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                <header className="mb-10">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-3xl font-extrabold text-white tracking-tight">Secrets & Config</h3>
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => setShowBulkInput(!showBulkInput)}
                                                className={`px-4 py-2 rounded-lg border transition-all text-[9px] font-bold uppercase tracking-widest flex items-center gap-2 ${showBulkInput ? 'bg-primary text-white border-primary shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-500 hover:text-white'}`}
                                            >
                                                <Database className="w-3.5 h-3.5" /> {showBulkInput ? 'Close Import' : 'Import .env'}
                                            </button>
                                            <button
                                                onClick={handleAddEnv}
                                                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-2"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Variable
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-slate-500 text-sm font-medium">Inject sensitive payload keys and application constants into the runtime.</p>
                                </header>

                                {showBulkInput ? (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-500 space-y-4">
                                        <div className="relative group">
                                            <textarea
                                                value={bulkInput}
                                                onChange={(e) => setBulkInput(e.target.value)}
                                                className="w-full h-48 bg-black/40 border border-white/5 rounded-lg py-6 px-8 focus:border-primary/50 outline-none transition-all text-primary font-mono text-xs select-scrollbar resize-none"
                                                placeholder={`# Paste your secrets here\nPORT=8000\nDATABASE_URL="postgres://user:pass@host:5432/db"\nNODE_ENV=production`}
                                            />
                                            <div className="absolute right-6 bottom-6">
                                                <button
                                                    onClick={handleBulkImport}
                                                    className="px-6 py-2.5 bg-primary text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_20px_rgba(99,102,241,0.2)] flex items-center gap-2"
                                                >
                                                    <Zap className="w-3.5 h-3.5" /> Apply Manifest
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest ml-1">Supports key=value pairs, comments (#), and quoted values.</p>
                                    </div>
                                ) : (
                                    <div className="glass-card rounded-lg border border-white/5 bg-[#0c0c0c] overflow-hidden max-h-[400px] overflow-y-auto select-scrollbar font-bold">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 z-20 bg-[#0c0c0c] border-b border-white/5">
                                                <tr>
                                                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-600">Variable</th>
                                                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-slate-600">Value</th>
                                                    <th className="px-6 py-4 w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {envVars.map((env, i) => (
                                                    <tr key={i} className="group hover:bg-white/[0.01] transition-colors">
                                                        <td className="p-4">
                                                            <input
                                                                type="text"
                                                                value={env.key}
                                                                onChange={(e) => handleEnvChange(i, 'key', e.target.value)}
                                                                className="w-full bg-transparent border-none outline-none font-mono text-[11px] text-white py-1 transition-all focus:text-primary"
                                                                placeholder="VAR_KEY"
                                                            />
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type={revealedIndices.has(i) ? 'text' : 'password'}
                                                                    value={env.value}
                                                                    onChange={(e) => handleEnvChange(i, 'value', e.target.value)}
                                                                    className="w-full bg-transparent border-none outline-none font-mono text-[11px] text-slate-400 py-1 transition-all focus:text-white"
                                                                    placeholder="••••••••"
                                                                />
                                                                <button
                                                                    onClick={() => toggleSecret(i)}
                                                                    className="p-1 text-slate-800 hover:text-slate-400 transition-colors"
                                                                >
                                                                    {revealedIndices.has(i) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <button
                                                                onClick={() => handleRemoveEnv(i)}
                                                                className="p-2 text-slate-800 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 5 && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
                                <header>
                                    <h3 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Confirm Details</h3>
                                    <p className="text-slate-500 text-sm font-medium">Verify the provisioning parameters before initiating the sequence.</p>
                                </header>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-px bg-white/5 rounded-lg overflow-hidden border border-white/5 font-bold">
                                        <div className="p-8 bg-white/[0.01]">
                                            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Settings className="w-3.5 h-3.5" /> Service ID</div>
                                            <div className="text-base font-bold text-white">{projectName || repoName}</div>
                                        </div>
                                        <div className="p-8 bg-white/[0.01]">
                                            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2"><GitBranch className="w-3.5 h-3.5" /> Source Code</div>
                                            <div className="text-base font-bold text-white">{branch}</div>
                                        </div>
                                        <div className="p-8 bg-white/[0.01]">
                                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Deployment</div>
                                            <div className="text-base font-bold text-cyan-500 uppercase">CloudFlow Optimized</div>
                                        </div>
                                        <div className="p-8 bg-white/[0.01]">
                                            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Infrastructure</div>
                                            <div className="text-base font-bold text-primary uppercase">Standard Provisioning</div>
                                        </div>
                                        <div className="p-8 bg-white/[0.01]">
                                            <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                {deployType === 'docker' ? <Box className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />} Strategy
                                            </div>
                                            <div className="text-base font-bold text-white uppercase">{deployType === 'docker' ? 'Docker Container' : 'Pipeline'}</div>
                                        </div>
                                        {deployType === 'docker' && (
                                            <div className="p-8 bg-white/[0.01] col-span-2 border-t border-white/5">
                                                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Server className="w-3.5 h-3.5" /> Docker Context</div>
                                                <div className="flex gap-10">
                                                    <div>
                                                        <div className="text-[8px] text-slate-700 uppercase font-bold mb-1">Source</div>
                                                        <div className="text-xs font-bold text-slate-400">{dockerSource === 'repo' ? 'Dockerfile in Repo' : dockerSource === 'path' ? dockerfilePath : registryImage}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[8px] text-slate-700 uppercase font-bold mb-1">Port</div>
                                                        <div className="text-xs font-bold text-slate-400">{containerPort}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[8px] text-slate-700 uppercase font-bold mb-1">Context</div>
                                                        <div className="text-xs font-bold text-slate-400">{buildContext}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                        <div className="flex items-center gap-3 text-emerald-500 font-bold text-[10px] uppercase tracking-widest">
                                            <Shield className="w-4 h-4" /> Ready for Provisioning
                                        </div>
                                        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">All security checks passed. Ephemeral build tokens will be generated. The application will be deployed and accessible within 2-4 minutes.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Navigation */}
                <footer className="h-24 border-t border-white/5 bg-white/[0.01] flex items-center px-16 justify-between relative z-20 shrink-0">
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1}
                        className={`px-8 py-3.5 rounded-lg border border-white/5 text-[10px] font-bold uppercase tracking-widest transition-all ${step === 1 ? 'opacity-0' : 'hover:bg-white/5 text-slate-500 hover:text-white'}`}
                    >
                        Previous Step
                    </button>

                    <div className="flex gap-4">
                        {step === steps.length ? (
                            <button
                                onClick={deployProject}
                                disabled={submitting}
                                className="px-12 py-3.5 bg-white text-slate-950 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)] flex items-center gap-3"
                            >
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                                {submitting ? 'Initializing...' : 'Authorize Deployment'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setStep(s => Math.min(steps.length, s + 1))}
                                className="px-12 py-3.5 bg-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_30px_rgba(99,102,241,0.2)] flex items-center gap-3"
                            >
                                Continue Phase <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </footer>
            </main>
        </div>
    )
}

export default function ConfigurePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        }>
            <ConfigureContent />
        </Suspense>
    )
}
