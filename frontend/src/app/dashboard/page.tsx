'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import {
    Github, ExternalLink, Star, Search, Filter, RefreshCw, LogOut, Loader2,
    LayoutDashboard, Rocket, Activity, Settings, Plus, Terminal, ChevronRight,
    MoreVertical, CheckCircle2, Clock, Box, Database, Cpu, HardDrive,
    BarChart3, Shield, Info, Layout, Orbit, AlignLeft, Key, CircleDot,
    Webhook, Inbox, Link2, CreditCard, FileText, Send, MessageCircle,
    ChevronDown, Share2, XCircle, X, Globe, GitBranch, ArrowRight, History,
    Lock, Server, Zap, Cloud, Layers, Briefcase, ShieldCheck, Minimize2, Maximize2
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

interface Repository {
    id: number
    name: string
    full_name: string
    html_url: string
    description: string | null
    stargazers_count: number
}

interface Organization {
    id: number
    login: string
    avatar_url: string | null
    description: string | null
}

interface Project {
    id: string
    name: string
    repo: string
    repo_full_name?: string
    status: 'active' | 'deploying' | 'idle' | 'failed' | 'draft'
    url: string
    deploy_type?: string
    branch?: string
    build_command?: string
    start_command?: string
    root_dir?: string
    container_id?: string
}

interface Workspace {
    id: string
    name: string
    slug: string
    github_id?: string | null
    github_access_token?: string | null
}

interface Plan {
    id: string
    name: string
    price: number
    features: any
    currency: string
    interval: string
}

interface User {
    id: string
    email: string
    full_name: string | null
    is_subscribed: boolean
}

export default function DashboardPage() {
    const [view, setView] = useState<'overview' | 'connect' | 'deployments' | 'project-settings' | 'billing'>('overview')
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)
    const [terminalProjectId, setTerminalProjectId] = useState<string | null>(null)
    const [isLiveLogs, setIsLiveLogs] = useState(false)
    const [cancellingProjectId, setCancellingProjectId] = useState<string | null>(null)
    const [metrics, setMetrics] = useState<any>(null)
    const [showBuildLogs, setShowBuildLogs] = useState(true)
    const [isMinimized, setIsMinimized] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [startPos, setStartPos] = useState({ x: 0, y: 0 })
    const [activeBuild, setActiveBuild] = useState({
        name: 'PRODUCTION-3J9K2',
        logs: [
            { time: '14:02:11', type: 'info', text: 'Cloning repository...' },
            { time: '14:02:15', type: 'info', text: 'Installing dependencies using pnpm...' },
            { time: '14:02:22', type: 'success', text: 'Done in 6.4s' },
            { time: '14:02:23', type: 'info', text: 'Building project (Next.js 14.2)...' },
            { time: '14:02:45', type: 'warn', text: "Warning: Unused variable 'config' at line 42." },
            { time: '14:03:01', type: 'info', text: 'Creating optimized production build...' },
            { time: '14:03:15', type: 'cursor', text: '_' },
        ]
    })
    const [repos, setRepos] = useState<Repository[]>([])
    const [orgs, setOrgs] = useState<Organization[]>([])
    const [selectedOrg, setSelectedOrg] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingRepos, setLoadingRepos] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Workspace State
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
    const [showCreateWorkspace, setShowCreateWorkspace] = useState(false)
    const [newWorkspaceName, setNewWorkspaceName] = useState('')
    const [showWorkspaceDropdown, setShowWorkspaceDropdown] = useState(false)
    const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
    const [showDeployTypeModal, setShowDeployTypeModal] = useState(false)
    const [selectedRepoForDeploy, setSelectedRepoForDeploy] = useState<Repository | null>(null)
    const [hasGithub, setHasGithub] = useState(false)

    const router = useRouter()
    const searchParams = useSearchParams()

    const [projects, setProjects] = useState<Project[]>([])
    const [user, setUser] = useState<User | null>(null)
    const [plans, setPlans] = useState<Plan[]>([])

    const handleLogout = () => {
        document.cookie = "sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        document.cookie = "sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        document.cookie = "gh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        router.push('/login')
    }

    const handleDragStart = (e: React.MouseEvent) => {
        if (isFullscreen) return
        setIsDragging(true)
        setStartPos({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        })
    }

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return
            setPosition({
                x: e.clientX - startPos.x,
                y: e.clientY - startPos.y
            })
        }

        const handleMouseUp = () => {
            setIsDragging(false)
        }

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove)
            window.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, startPos])

    const openTerminal = (project: Project) => {
        setActiveBuild(prev => ({
            ...prev,
            name: project.name,
            logs: prev.name === project.name ? prev.logs : []
        }))
        setTerminalProjectId(project.id)
        setShowBuildLogs(true)
        setIsMinimized(false)
        setIsLiveLogs(true)
    }

    useEffect(() => {
        let interval: any
        if (showBuildLogs && terminalProjectId && isLiveLogs) {
            const fetchLogs = async () => {
                try {
                    const token = getAuthToken()
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
                    const response = await axios.get(`${apiUrl}/projects/${terminalProjectId}/logs`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    if (response.data.logs) {
                        setActiveBuild(prev => ({
                            ...prev,
                            logs: response.data.logs
                        }))
                    }
                } catch (err) {
                    console.error("Failed to fetch logs", err)
                }
            }
            fetchLogs()
            interval = setInterval(fetchLogs, 3000)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [showBuildLogs, terminalProjectId, isLiveLogs])

    const getCookies = () => {
        const cookieString = document.cookie
        return cookieString.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=')
            acc[key] = value
            return acc
        }, {} as Record<string, string>)
    }

    const getAuthToken = () => {
        const cookies = getCookies()
        return cookies['sb-access-token']
    }

    const getGithubToken = () => {
        return selectedWorkspace?.github_access_token || null
    }

    const fetchRepos = async (orgLogin: string | null, tokenOverride?: string) => {
        setLoadingRepos(true)
        try {
            const token = tokenOverride || getGithubToken()
            if (!token) return

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            const response = await axios.get(`${apiUrl}/github/repos`, {
                params: {
                    github_token: token,
                    org: orgLogin || undefined
                }
            })
            setRepos(response.data)
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to fetch repositories')
        } finally {
            setLoadingRepos(false)
        }
    }

    const fetchWorkspaces = async () => {
        try {
            const token = getAuthToken()
            if (!token) return

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            const response = await axios.get(`${apiUrl}/workspaces`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            setWorkspaces(response.data)

            // Restore from localStorage or default to first
            const savedWsId = localStorage.getItem('selectedWorkspaceId')
            const currentWs = response.data.find((ws: any) => ws.id === savedWsId) || response.data[0]

            if (currentWs) {
                setSelectedWorkspace(currentWs)
                fetchProjects(currentWs.id)
            } else if (response.data.length === 0) {
                setShowCreateWorkspace(true)
            }
        } catch (err) {
            console.error("Failed to fetch workspaces", err)
        }
    }

    const fetchProjects = async (workspaceId: string) => {
        try {
            const token = getAuthToken()
            if (!token) return
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            const response = await axios.get(`${apiUrl}/projects/`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { workspace_id: workspaceId }
            })
            setProjects(response.data)
        } catch (err) {
            console.error('Failed to fetch projects', err)
        }
    }

    const handleRedeploy = async (projectId: string) => {
        try {
            const token = getAuthToken()
            if (!token) return
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

            // Set local state to deploying immediately for UI feedback
            setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: 'deploying' } : p))

            await axios.post(`${apiUrl}/projects/${projectId}/redeploy`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast.success("Redeployment initiated")
        } catch (err) {
            console.error('Redeploy failed', err)
            toast.error("Failed to initiate redeployment")
            // Refresh projects to restore correct state
            if (selectedWorkspace) fetchProjects(selectedWorkspace.id)
        }
    }

    const handleCancelBuild = async () => {
        if (!terminalProjectId) return;
        setCancellingProjectId(terminalProjectId);
        try {
            const token = getAuthToken();
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
            await axios.post(`${apiUrl}/projects/${terminalProjectId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Orchestration sequence terminated", {
                description: "The build processes have been stopped."
            });
            setShowBuildLogs(false);
            if (selectedWorkspace) fetchProjects(selectedWorkspace.id);
        } catch (err) {
            console.error("Failed to cancel build", err);
            toast.error("Termination Critical Failure", {
                description: "The sequence could not be safely stopped."
            });
        } finally {
            setCancellingProjectId(null);
        }
    };

    const handleDeleteProject = async (projectId: string) => {
        if (!confirm("CRITICAL WARNING: This will permanently delete the project and all its infrastructure (containers). Proceed?")) return

        try {
            const token = getAuthToken()
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            await axios.delete(`${apiUrl}/projects/${projectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            toast.success("Project Decommissioned", {
                description: "Resources have been scrubbed from the cluster."
            })

            setView('overview')
            if (selectedWorkspace) fetchProjects(selectedWorkspace.id)
        } catch (err) {
            console.error("Failed to delete project:", err)
            toast.error("Decommissioning Failed", {
                description: "The project record could not be removed."
            })
        }
    }

    const handleViewLiveUrl = () => {
        if (!terminalProjectId) return;
        const project = projects.find(p => p.id === terminalProjectId);
        if (project) {
            const url = project.url || `http://${project.repo}.localhost`;
            window.open(url, '_blank');
        }
    };

    const handleGithubConnect = () => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
        let url = `${apiUrl}/auth/login/github`
        if (selectedWorkspace) {
            url += `?workspace_id=${selectedWorkspace.id}`
            // Save current WS ID to restore after redirect
            localStorage.setItem('selectedWorkspaceId', selectedWorkspace.id)
        }
        window.location.href = url
    }

    const handleCreateWorkspace = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newWorkspaceName.trim()) return

        const token = getAuthToken()
        if (!token) return

        setIsCreatingWorkspace(true)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            const response = await axios.post(`${apiUrl}/workspaces`, {
                name: newWorkspaceName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setWorkspaces(prev => [...prev, response.data])
            setSelectedWorkspace(response.data)
            localStorage.setItem('selectedWorkspaceId', response.data.id)
            setShowCreateWorkspace(false)
            setNewWorkspaceName('')
        } catch (err) {
            setError("Failed to create workspace")
        } finally {
            setIsCreatingWorkspace(false)
        }
    }

    useEffect(() => {
        const viewParam = searchParams.get('view')
        if (viewParam && ['overview', 'connect', 'deployments', 'project-settings'].includes(viewParam)) {
            setView(viewParam as any)
        }
    }, [searchParams])

    const fetchMetrics = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            const response = await axios.get(`${apiUrl}/metrics`)
            setMetrics(response.data)
        } catch (err) {
            console.error("Failed to fetch metrics", err)
        }
    }

    useEffect(() => {
        fetchMetrics()
        const interval = setInterval(fetchMetrics, 5000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const initDashboard = async () => {
            setLoading(true)
            try {
                const sessionToken = getAuthToken()
                const ghToken = getGithubToken()

                if (!sessionToken) {
                    router.push('/login')
                    return
                }

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

                // Fetch User Info
                const meRes = await axios.get(`${apiUrl}/auth/me`, {
                    params: { token: sessionToken }
                })
                setUser(meRes.data)

                // Fetch Plans
                const plansRes = await axios.get(`${apiUrl}/billing/plans`)
                setPlans(plansRes.data)

                // Seed plans if none exist (Convenience)
                if (plansRes.data.length === 0) {
                    await axios.post(`${apiUrl}/billing/seed-plans`)
                    const plansReload = await axios.get(`${apiUrl}/billing/plans`)
                    setPlans(plansReload.data)
                }

                // Fetch Workspaces
                await fetchWorkspaces()

                // Cleanup legacy cookie if any
                document.cookie = "gh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
            } catch (err: any) {
                setError(err.response?.data?.detail || 'Failed to initialize dashboard')
            } finally {
                setLoading(false)
            }
        }

        initDashboard()
    }, [])

    const refreshGithubData = async () => {
        if (!selectedWorkspace) return

        const ghToken = getGithubToken()
        if (ghToken) {
            setHasGithub(true)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            try {
                setLoadingRepos(true)
                const orgsResponse = await axios.get(`${apiUrl}/github/orgs`, {
                    params: { github_token: ghToken }
                })
                setOrgs(orgsResponse.data)
                await fetchRepos(selectedOrg, ghToken)
            } catch (e) {
                console.error("Could not fetch workspace GitHub data", e)
            } finally {
                setLoadingRepos(false)
            }
        } else {
            setHasGithub(false)
        }
    }

    // Handle workspace-dependent data
    useEffect(() => {
        if (!selectedWorkspace) {
            setHasGithub(false)
            setOrgs([])
            setRepos([])
            return
        }

        // Immediately clear old data to avoid showing stale repos from prev workspace
        setOrgs([])
        setRepos([])
        setSelectedOrg(null)

        refreshGithubData()
    }, [selectedWorkspace?.id])

    // Auto-reload when switching to connect view or browser refresh
    useEffect(() => {
        if (view === 'connect' && selectedWorkspace) {
            refreshGithubData()
        }
    }, [view, selectedWorkspace?.id])

    const handleOrgSelect = (orgLogin: string | null) => {
        setSelectedOrg(orgLogin)
        fetchRepos(orgLogin)
    }

    const filteredRepos = repos.filter(repo =>
        repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSubscribe = async (planId: string) => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
            await axios.post(`${apiUrl}/billing/subscribe`, {
                plan_id: planId,
                user_id: user?.id
            })
            toast.success("Subscription Active!", {
                description: "You now have full access to the cloud orchestration engine."
            })
            // Refresh user status
            const sessionToken = getAuthToken()
            const meRes = await axios.get(`${apiUrl}/auth/me`, {
                params: { token: sessionToken }
            })
            setUser(meRes.data)
        } catch (err) {
            toast.error("Subscription failed")
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-xs">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse" />
                    <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
                </div>
                <p className="text-slate-500 mt-6 font-medium animate-pulse tracking-wide uppercase text-[10px]">Initializing Console...</p>
            </div>
        )
    }

    if (user && !user.is_subscribed) {
        return (
            <div className="min-h-screen bg-background text-slate-300 font-sans flex flex-col items-center justify-center p-10 relative overflow-hidden text-xs">
                {/* Background Effects */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="max-w-4xl w-full z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    <header className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6 animate-bounce">
                            <Star className="w-4 h-4 fill-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Orchestration Plan</span>
                        </div>
                        <h1 className="text-5xl font-black text-white tracking-tighter mb-4 leading-none">Choose Your <span className="text-accent-gradient">Power Tier</span></h1>
                        <p className="text-slate-500 text-sm max-w-xl mx-auto font-medium">Select an infrastructure allocation to begin deploying your applications on the edge.</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {plans.map((plan) => (
                            <div key={plan.id} className="glass-card group p-8 rounded-2xl border-white/5 bg-white/[0.012] hover:bg-white/[0.03] hover:border-primary/40 transition-all duration-500 flex flex-col relative overflow-hidden">
                                {plan.name === 'Standard' && (
                                    <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-bl-xl shadow-[0_0_20px_rgba(99,102,241,0.3)]">Recommended</div>
                                )}
                                <div className="mb-8">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 group-hover:text-primary transition-colors">{plan.name}</h3>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-white">${plan.price}</span>
                                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">/month</span>
                                    </div>
                                </div>

                                <div className="space-y-5 mb-10 flex-grow">
                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                                        <div className="flex items-center gap-3 text-slate-400 group-hover:text-white transition-colors font-bold text-[10px] uppercase tracking-wider">
                                            <Cpu className="w-4 h-4 text-primary" /> {plan.features.cpu || '0.5 vCPU'} Reserved
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-400 group-hover:text-white transition-colors font-bold text-[10px] uppercase tracking-wider">
                                            <HardDrive className="w-4 h-4 text-cyan-400" /> {plan.features.ram || '512MB'} Memory Tier
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-400 group-hover:text-white transition-colors font-bold text-[10px] uppercase tracking-wider">
                                            <Globe className="w-4 h-4 text-primary" /> {plan.features.bandwidth || '100GB'} High-Speed Mesh
                                        </div>
                                    </div>
                                    <ul className="space-y-3 px-2">
                                        <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Dynamic Auto-Scaling</li>
                                        <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> SSL by Default</li>
                                        <li className="flex items-center gap-2 text-[10px] font-bold text-slate-600"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> 99.9% Uptime SLA</li>
                                    </ul>
                                </div>

                                <button
                                    onClick={() => handleSubscribe(plan.id)}
                                    className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 ${plan.name === 'Standard' ? 'bg-primary text-white shadow-[0_10px_30px_rgba(99,102,241,0.3)] hover:bg-[#575ae6]' : 'bg-white/5 hover:bg-white/10 text-white border border-white/5'}`}
                                >
                                    Activate {plan.name}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 text-center">
                        <button onClick={handleLogout} className="text-[10px] font-black text-slate-700 hover:text-red-500 transition-all uppercase tracking-widest flex items-center gap-2 mx-auto">
                            <LogOut className="w-3.5 h-3.5" /> De-authenticate from Console
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-background text-slate-300 overflow-hidden font-sans">
            {/* --- SIDEBAR --- */}
            <aside className="w-64 border-r border-white/5 bg-[#0c0c0c] flex flex-col z-20 shrink-0">
                <div className="p-6 pb-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <Box className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-white font-black text-sm tracking-tight">DevOps <span className="text-primary">Pro</span></h2>
                    </div>

                    {/* Workspace Selector */}
                    <div className="relative mb-4">
                        <button
                            onClick={() => setShowWorkspaceDropdown(!showWorkspaceDropdown)}
                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-white/[0.03] border transition-all group ${showWorkspaceDropdown ? 'border-primary/50 bg-white/[0.05]' : 'border-white/5 hover:border-primary/30'}`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                    <Briefcase className="w-4 h-4 text-primary" />
                                </div>
                                <div className="text-left overflow-hidden">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Workspace</div>
                                    <div className="text-xs font-black text-white truncate leading-none">
                                        {selectedWorkspace?.name || 'Select Workspace'}
                                    </div>
                                </div>
                            </div>
                            <ChevronDown className={`w-3.5 h-3.5 text-slate-600 group-hover:text-white transition-transform duration-300 ${showWorkspaceDropdown ? 'rotate-180 text-white' : ''}`} />
                        </button>

                        {showWorkspaceDropdown && (
                            <>
                                <div
                                    className="fixed inset-0 z-20"
                                    onClick={() => setShowWorkspaceDropdown(false)}
                                />
                                <div className="absolute top-full left-0 right-0 mt-2 z-30 glass-panel border-white/10 shadow-2xl rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-2 max-h-[300px] overflow-y-auto select-scrollbar bg-[#0c0c0c]/80 backdrop-blur-xl">
                                        <div className="px-3 py-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                            Switch Workspace
                                        </div>
                                        {workspaces.map((ws) => (
                                            <button
                                                key={ws.id}
                                                onClick={() => {
                                                    setSelectedWorkspace(ws)
                                                    localStorage.setItem('selectedWorkspaceId', ws.id)
                                                    fetchProjects(ws.id)
                                                    setShowWorkspaceDropdown(false)
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all mb-1 group/item ${selectedWorkspace?.id === ws.id ? 'bg-primary/20 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
                                            >
                                                <span className="text-xs font-bold truncate">{ws.name}</span>
                                                {selectedWorkspace?.id === ws.id && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                                )}
                                            </button>
                                        ))}

                                        <div className="h-px bg-white/5 my-2" />

                                        <button
                                            onClick={() => {
                                                setShowCreateWorkspace(true)
                                                setShowWorkspaceDropdown(false)
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all mb-1"
                                        >
                                            <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center">
                                                <Plus className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-xs font-bold">New Workspace</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto select-scrollbar px-3 py-4 space-y-6">
                    {/* Main Section */}
                    <div className="space-y-0.5">
                        <button
                            onClick={() => setView('overview')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-[13px] ${view === 'overview' ? 'bg-primary/20 text-white shadow-[0_0_15px_rgba(196,181,253,0.1)]' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                            <Orbit className="w-4 h-4 text-primary" /> Live Projects
                        </button>
                        <button
                            onClick={() => setView('deployments')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-[13px] ${view === 'deployments' ? 'bg-primary/20 text-white shadow-[0_0_15px_rgba(196,181,253,0.1)]' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                            <Rocket className="w-4 h-4 text-cyan" /> Deployments
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-all font-medium text-[13px]">
                            <AlignLeft className="w-4 h-4 opacity-70" /> Project Blueprints
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-all font-medium text-[13px]">
                            <Key className="w-4 h-4 opacity-70" /> Environment Groups
                        </button>
                    </div>

                    {/* Integrations */}
                    <div className="space-y-0.5">
                        <h3 className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-2 leading-none">Integrations</h3>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-all font-medium text-[13px]">
                            <CircleDot className="w-4 h-4 opacity-70" /> Health Monitoring
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-all font-medium text-[13px]">
                            <Webhook className="w-4 h-4 opacity-70" /> Webhooks
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-all font-medium text-[13px]">
                            <Inbox className="w-4 h-4 opacity-70" /> Notifications
                        </button>
                    </div>

                    {/* Networking */}
                    <div className="space-y-0.5">
                        <h3 className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-2 leading-none">Networking</h3>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-all font-medium text-[13px]">
                            <Link2 className="w-4 h-4 opacity-70" /> Private Tunnels
                        </button>
                    </div>

                    {/* Workspace */}
                    <div className="space-y-0.5">
                        <h3 className="px-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-2 leading-none">Usage & Billing</h3>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-all font-medium text-[13px]">
                            <CreditCard className="w-4 h-4 opacity-70" /> Account Credits
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-all font-medium text-[13px]">
                            <Settings className="w-4 h-4 opacity-70" /> Project Settings
                        </button>
                    </div>
                </div>

                <div className="p-3 bg-[#0c0c0c] border-t border-white/5 space-y-0.5">
                    <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-all font-medium text-[13px] group">
                        <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 opacity-70" /> Changelog
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all font-medium text-[13px]">
                        <Send className="w-4 h-4 opacity-70" /> Invite a friend
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all font-medium text-[13px]">
                        <MessageCircle className="w-4 h-4 opacity-70" /> Contact support
                    </button>
                    <div className="pt-4 pb-2">
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all font-medium text-[13px]">
                            <Activity className="w-4 h-4 text-emerald-500" /> System Engine
                        </button>
                        <button
                            onClick={() => setView('billing')}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-medium text-[13px] ${view === 'billing' ? 'text-white bg-white/5 shadow-[0_0_10px_rgba(255,255,255,0.05)]' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <CreditCard className="w-4 h-4 text-primary" /> Billing Admin
                        </button>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-red-400 transition-colors font-bold text-[10px] uppercase tracking-widest mt-2"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </div>
            </aside>

            {/* --- MAIN CONTENT --- */}
            < main className="flex-grow relative flex flex-col overflow-y-auto" >
                {/* Header */}
                < header className="p-8 pb-4 flex justify-between items-center z-10 sticky top-0 bg-[#050B14]/80 backdrop-blur-xl" >
                    <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-bold text-sm tracking-tight opacity-50">Service Dashboard</span>
                        <ChevronRight className="w-4 h-4 text-slate-700" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-all cursor-pointer">
                            <Terminal className="w-4 h-4 text-slate-400" />
                        </div>
                        <img
                            src={`https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff&bold=true`}
                            className="w-9 h-9 rounded-lg border border-white/10"
                            alt="Avatar"
                        />
                    </div>
                </header >

                <div className="p-10 pt-4 space-y-12 max-w-7xl mx-auto w-full">
                    {view === 'overview' ? (
                        <>
                            {/* Hero Section */}
                            <section className="flex justify-between items-end">
                                <div>
                                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">System Overview</h1>
                                    <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5 text-primary" /> Real-time project status
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <button className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-lg border border-white/5 transition-all">
                                        <Plus className="w-4 h-4" /> New Project
                                    </button>
                                    <button
                                        onClick={() => setView('connect')}
                                        className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all active:scale-95"
                                    >
                                        <Github className="w-4 h-4" /> Connect from GitHub
                                    </button>
                                </div>
                            </section>

                            {/* Conditional Rendering for Workspace Onboarding */}
                            {!hasGithub ? (
                                <div className="flex flex-col items-center justify-center py-20 px-10 glass-panel rounded-lg border-white/5 bg-white/[0.01]">
                                    <div className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center mb-8 border border-primary/20">
                                        <Github className="w-10 h-10 text-primary" />
                                    </div>
                                    <h2 className="text-3xl font-black text-white mb-4">Connect GitHub to Your Workspace</h2>
                                    <p className="text-slate-500 text-center max-w-md mb-10 font-medium">
                                        Establish a secure link between your GitHub repositories and the {selectedWorkspace?.name || 'current'} workspace to begin orchestrating your deployments.
                                    </p>
                                    <button
                                        onClick={handleGithubConnect}
                                        className="flex items-center gap-3 px-10 py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-lg shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <Github className="w-5 h-5" />
                                        Authorize GitHub Connection
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Active Projects Grid */}
                                    <section>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Active Projects</h3>
                                            <button className="text-[10px] font-bold text-primary hover:underline">View All</button>
                                        </div>
                                        {projects.length === 0 ? (
                                            <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-lg bg-white/[0.01]">
                                                <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center mb-6">
                                                    <Rocket className="w-8 h-8 text-slate-700" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white mb-2">No projects orchestrated yet</h3>
                                                <p className="text-slate-500 text-sm mb-8">Launch your first application from GitHub to this workspace.</p>
                                                <button
                                                    onClick={() => setView('connect')}
                                                    className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-widest rounded-lg border border-white/10 transition-all"
                                                >
                                                    Scale New Project
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                                {projects.map(project => (
                                                    <div
                                                        key={project.id}
                                                        onClick={() => {
                                                            setSelectedProject(project)
                                                            setView('project-settings')
                                                        }}
                                                        className="group glass-card p-6 rounded-lg border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all relative overflow-hidden cursor-pointer"
                                                    >
                                                        <div className="flex items-center justify-between mb-6">
                                                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-all">
                                                                {(project as any).type === 'api' ? <Cpu className="w-5 h-5 text-primary" /> : <LayoutDashboard className="w-5 h-5 text-cyan-400" />}
                                                            </div>
                                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest ${project.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                                                project.status === 'deploying' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                                                    'bg-slate-500/10 border-slate-500/20 text-slate-500'
                                                                }`}>
                                                                <span className={`w-1 h-1 rounded-full animate-pulse ${project.status === 'active' ? 'bg-emerald-500' :
                                                                    project.status === 'deploying' ? 'bg-amber-500' :
                                                                        'bg-slate-500'
                                                                    }`} />
                                                                {project.status}
                                                            </div>
                                                        </div>
                                                        <h4 className="text-white font-black text-lg mb-1">{project.name}</h4>
                                                        <p className="text-slate-600 font-medium text-[10px] tracking-tight">{project.repo}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                </>
                            )}

                            {/* Metrics Section */}
                            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* CPU Card */}
                                <div className="glass-card p-8 rounded-lg border-white/5 bg-white/[0.01]">
                                    <div className="flex justify-between items-start mb-8">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">CPU Usage</span>
                                        <span className="text-3xl font-black text-white">{metrics?.cpu?.current ? `${Math.round(metrics.cpu.current)}%` : '32%'}</span>
                                    </div>
                                    <div className="flex items-end gap-1.5 h-24">
                                        {(metrics?.cpu?.history || [40, 60, 30, 80, 50, 45, 70, 90, 40, 55, 65, 45]).map((h: number, i: number) => (
                                            <div key={i} className="flex-grow bg-primary/20 rounded-t-lg relative group overflow-hidden" style={{ height: `${h}%` }}>
                                                <div className="absolute inset-x-0 bottom-0 bg-primary h-full translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-4 text-[8px] font-black text-slate-700 tracking-widest">
                                        <span>12:00 PM</span>
                                        <span>NOW</span>
                                    </div>
                                </div>

                                {/* RAM Card */}
                                <div className="glass-card p-8 rounded-lg border-white/5 bg-white/[0.01]">
                                    <div className="flex justify-between items-start mb-8">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">RAM Usage</span>
                                        <span className="text-3xl font-black text-white">{metrics?.ram?.used_gb ? `${metrics.ram.used_gb} GB` : '4.8 GB'}</span>
                                    </div>
                                    <div className="h-24 relative overflow-hidden flex items-end">
                                        <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                                            <path
                                                d={`M0 40 L0 ${40 - (metrics?.ram?.percent || 30)} C10 ${35 - (metrics?.ram?.percent || 30)}, 20 35, 30 20 C40 10, 50 25, 60 15 C70 5, 80 20, 100 10 L100 40 Z`}
                                                fill="url(#ramGradient)"
                                                className="opacity-20"
                                            />
                                            <path
                                                d={`M0 ${40 - (metrics?.ram?.percent || 30)} C10 ${35 - (metrics?.ram?.percent || 30)}, 20 35, 30 20 C40 10, 50 25, 60 15 C70 5, 80 20, 100 10`}
                                                fill="none"
                                                stroke="#06B6D4"
                                                strokeWidth="1.5"
                                            />
                                            <defs>
                                                <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#06B6D4" />
                                                    <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                    <div className="flex justify-between mt-4 text-[8px] font-black text-slate-700 tracking-widest">
                                        <span>12:00 PM</span>
                                        <span>NOW</span>
                                    </div>
                                </div>

                                {/* Bandwidth Card */}
                                <div className="glass-card p-8 rounded-lg border-white/5 bg-white/[0.01]">
                                    <div className="flex justify-between items-start mb-8">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Bandwidth</span>
                                        <span className="text-3xl font-black text-white">{metrics?.bandwidth?.total || '1.2 TB'}</span>
                                    </div>
                                    <div className="space-y-6 mt-4">
                                        <div>
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                                                <span>Inbound</span>
                                                <span className="text-emerald-500">{metrics?.bandwidth?.inbound_gb ? `${metrics.bandwidth.inbound_gb} GB` : '420 GB'}</span>
                                            </div>
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500/80 w-[45%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" style={{ width: `${metrics?.bandwidth?.inbound_percent || 45}%` }} />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">
                                                <span>Outbound</span>
                                                <span className="text-cyan-500">{metrics?.bandwidth?.outbound_gb ? `${metrics.bandwidth.outbound_gb} GB` : '780 GB'}</span>
                                            </div>
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-cyan-500/80 w-[70%] rounded-full shadow-[0_0_10px_rgba(6,182,212,0.3)]" style={{ width: `${metrics?.bandwidth?.outbound_percent || 70}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Recent Deployments */}
                            <section className="glass-card p-0 rounded-lg border-white/5 bg-[#0A101D]/50 relative overflow-hidden">
                                <header className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
                                    <h3 className="text-lg font-black text-white">Recent Deployments</h3>
                                    <div className="flex gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                            <input
                                                type="text"
                                                placeholder="Filter branch..."
                                                className="bg-white/5 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-[10px] font-bold focus:outline-none focus:border-white/10"
                                            />
                                        </div>
                                    </div>
                                </header>
                                <div className="space-y-0">
                                    {projects.slice().sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 5).map(dep => (
                                        <div key={dep.id} className="px-8 py-6 border-b border-white/5 hover:bg-white/[0.02] flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full border border-white/10 bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary uppercase">
                                                    {dep.name.substring(0, 2)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-black text-white tracking-tight">{dep.name}</h4>
                                                        <span className="text-[8px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">{dep.branch || 'main'}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 font-bold tracking-tight">Manual Redeploy · {new Date(dep.updated_at || dep.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-12 text-right">
                                                <div>
                                                    <div className="text-[10px] font-black font-mono text-slate-500 mb-1 tracking-tighter">0a7b2c</div>
                                                    <div className={`text-[9px] font-black tracking-widest uppercase ${dep.status === 'active' ? 'text-emerald-500' :
                                                        dep.status === 'deploying' ? 'text-cyan-400 animate-pulse' :
                                                            dep.status === 'failed' ? 'text-red-500' : 'text-slate-500'
                                                        }`}>
                                                        {dep.status || 'draft'}
                                                    </div>
                                                </div>
                                                <button className="text-slate-700 hover:text-white transition-colors">
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {projects.length === 0 && (
                                        <div className="p-12 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">No deployments available</div>
                                    )}
                                </div>
                                <footer className="px-8 py-4 text-center">
                                    <button className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-primary transition-colors">
                                        View Deployment History
                                    </button>
                                </footer>
                            </section>
                        </>
                    ) : view === 'deployments' ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
                            <header className="flex justify-between items-end">
                                <div>
                                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">Deployments</h1>
                                    <p className="text-slate-500 font-medium text-sm">Real-time status of your global infrastructure</p>
                                </div>
                                <button
                                    onClick={() => setView('connect')}
                                    className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" /> New Deployment
                                </button>
                            </header>

                            {/* Filter Bar */}
                            <div className="flex flex-wrap gap-4 px-2">
                                <div className="relative group flex-grow max-w-md">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-primary transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search deployments, commits, or branches..."
                                        className="w-full bg-white/5 border border-white/5 rounded-lg py-3 pl-11 pr-4 focus:border-white/10 outline-none transition-all placeholder:text-slate-700 text-xs font-bold"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-lg border border-white/5 text-[11px] font-bold">
                                    <span className="text-slate-600">Status:</span>
                                    <span className="text-white">All</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-lg border border-white/5 text-[11px] font-bold">
                                    <span className="text-slate-600">Project:</span>
                                    <span className="text-white">All</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2.5 rounded-lg border border-white/5 text-[11px] font-bold">
                                    <span className="text-slate-600">Branch:</span>
                                    <span className="text-white">main</span>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                                </div>
                            </div>

                            {/* Deployments Table */}
                            <div className="glass-card rounded-lg border border-white/5 bg-white/[0.01] overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/[0.02]">
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Status</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Deployment</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Commit</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Environment</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Branch</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600">Age</th>
                                            <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-600 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {projects.map((project) => (
                                            <tr
                                                key={project.id}
                                                onClick={() => openTerminal(project)}
                                                className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center justify-center w-8">
                                                        {project.status === 'active' && <div className="p-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /></div>}
                                                        {project.status === 'deploying' && <div className="p-1.5 bg-cyan-500/10 rounded-full border border-cyan-500/20"><RefreshCw className="w-3.5 h-3.5 text-cyan-500 animate-spin" /></div>}
                                                        {project.status === 'failed' && <div className="p-1.5 bg-red-500/10 rounded-full border border-red-500/20 text-red-500"><XCircle className="w-3.5 h-3.5" /></div>}
                                                        {(project.status === 'idle' || project.status === 'draft') && <div className="p-1.5 bg-slate-500/10 rounded-full border border-slate-500/20 text-slate-500"><CircleDot className="w-3.5 h-3.5" /></div>}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div>
                                                        <div className="text-[13px] font-black text-white group-hover:text-primary transition-colors">{project.name}</div>
                                                        <div className="text-[10px] font-medium text-slate-600 truncate max-w-[140px] lowercase">{project.url || `http://${project.repo}.localhost`}</div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                            {project.repo.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="text-[11px] font-bold text-slate-200 line-clamp-1 max-w-[240px]">Latest orchestration push</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-medium text-slate-500">System</span>
                                                                <span className="w-1 h-1 rounded-full bg-slate-800" />
                                                                <span className="text-[9px] font-black font-mono text-slate-700 bg-white/5 px-1.5 rounded">{project.id.substring(0, 7)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest border bg-cyan-500/10 border-cyan-500/20 text-cyan-400`}>
                                                        PRODUCTION
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Share2 className="w-3.5 h-3.5 opacity-50" />
                                                        <span className="text-[11px] font-bold">{project.branch || 'main'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">Live</span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRedeploy(project.id);
                                                        }}
                                                        disabled={project.status === 'deploying'}
                                                        className="px-4 py-1.5 bg-white/5 hover:bg-primary hover:text-white text-slate-400 text-[9px] font-black uppercase tracking-widest rounded transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        {project.status === 'deploying' ? 'Deploying...' : 'Redeploy'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {projects.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-20 text-center text-slate-600 font-bold text-sm">
                                                    No deployment objects detected in this workspace.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {showBuildLogs && activeBuild && (
                                <div
                                    className={`${isFullscreen ? 'fixed inset-4 z-[100]' : 'fixed bottom-8 right-8 w-[450px] z-50'} bg-[#0c0c0c] border border-white/10 rounded-lg shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden animate-in slide-in-from-bottom-5 duration-500`}
                                    style={!isFullscreen ? { transform: `translate(${position.x}px, ${position.y}px)` } : {}}
                                >
                                    <header
                                        onMouseDown={handleDragStart}
                                        className={`px-6 py-4 border-b border-white/10 bg-white/[0.02] flex justify-between items-center ${isFullscreen ? 'cursor-default' : 'cursor-move'} select-none`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${isLiveLogs ? 'bg-emerald-500' : 'bg-cyan-500'} animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]`} />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#06B6D4]">
                                                {isLiveLogs ? `Live Logs: ${activeBuild.name}` : `Building ${activeBuild.name}`}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setIsMinimized(!isMinimized)}
                                                className="text-slate-600 hover:text-white transition-colors"
                                                title={isMinimized ? "Expand" : "Minimize"}
                                            >
                                                <Minimize2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setIsFullscreen(!isFullscreen)}
                                                className="text-slate-600 hover:text-white transition-colors"
                                                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                                            >
                                                <Maximize2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => setShowBuildLogs(false)} className="text-slate-600 hover:text-white transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </header>
                                    {!isMinimized && (
                                        <>
                                            <div className={`p-7 font-mono text-[10px] space-y-2 bg-black/40 select-scrollbar overflow-y-auto ${isFullscreen ? 'h-[calc(100vh-160px)]' : 'min-h-[220px] max-h-[300px]'}`}>
                                                {activeBuild.logs.map((log, i) => (
                                                    <div key={i} className="flex gap-4">
                                                        <span className="text-[#334155] shrink-0 font-medium">{log.time}</span>
                                                        <span className={`
                                                            ${log.type === 'info' ? 'text-slate-400' : ''}
                                                            ${log.type === 'success' ? 'text-cyan-400 font-bold' : ''}
                                                            ${log.type === 'warn' ? 'text-yellow-500 font-medium' : ''}
                                                            ${log.type === 'cursor' ? 'animate-pulse text-white' : ''}
                                                        `}>
                                                            {log.type === 'warn' ? `▲ ${log.text}` : log.text}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <footer className="px-6 py-5 border-t border-white/10 bg-white/[0.01] flex justify-end gap-3">
                                                <button
                                                    onClick={handleCancelBuild}
                                                    disabled={cancellingProjectId === terminalProjectId}
                                                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 rounded-lg transition-all border border-white/5 active:scale-95 disabled:opacity-50"
                                                >
                                                    {cancellingProjectId === terminalProjectId ? 'Terminating...' : 'Cancel Build'}
                                                </button>
                                                <button
                                                    onClick={handleViewLiveUrl}
                                                    className="px-5 py-2.5 bg-cyan-500 text-slate-950 text-[10px] font-black uppercase tracking-[0.15em] rounded-lg shadow-[0_4px_20px_rgba(6,182,212,0.2)] hover:bg-cyan-400 transition-all active:scale-95"
                                                >
                                                    View Live URL
                                                </button>
                                            </footer>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : view === 'project-settings' && selectedProject ? (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
                            {/* Project Header */}
                            <header className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <button
                                            onClick={() => setView('overview')}
                                            className="text-[10px] font-black uppercase tracking-widest text-[#6366f1] hover:text-white transition-colors"
                                        >
                                            Overview
                                        </button>
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-800" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{selectedProject.name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <h1 className="text-4xl font-extrabold text-white tracking-tight">{selectedProject.name}</h1>
                                        <div className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${selectedProject.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-500/10 border-slate-500/20 text-slate-500'}`}>{selectedProject.status}</div>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <GitBranch className="w-3 h-3" /> {selectedProject.branch || 'main'}
                                        </div>
                                    </div>
                                    <p className="text-slate-500 mt-2 font-medium text-sm flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5" /> {selectedProject.url || `http://${selectedProject.repo}.localhost`}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-lg border border-white/5 transition-all">View Analytics</button>
                                    <button
                                        onClick={() => window.open(selectedProject.url || `http://${selectedProject.repo.toLowerCase()}.localhost`, '_blank')}
                                        className="px-5 py-2.5 bg-[#6366f1] text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:bg-[#575ae6] transition-all"
                                    >
                                        Visit Site
                                    </button>
                                </div>
                            </header>

                            {/* Settings Sections */}
                            <div className="grid grid-cols-1 gap-8">
                                {/* General Section */}
                                <section className="glass-card rounded-lg border border-white/5 bg-[#0c0c0c] overflow-hidden">
                                    <header className="px-8 py-5 border-b border-white/5 bg-white/[0.01]">
                                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Deployment Specs</h2>
                                    </header>
                                    <div className="p-8 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1.5">Project URL</label>
                                                <div className="text-sm font-medium text-white">{selectedProject.url || `http://${selectedProject.repo}.localhost`}</div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1.5">Project Type</label>
                                                <div className="text-sm font-medium text-white uppercase tracking-tighter italic">{selectedProject.deploy_type || 'standard'} provisioning v1</div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Build & Deploy Section */}
                                <section className="glass-card rounded-lg border border-white/5 bg-[#0c0c0c] overflow-hidden">
                                    <header className="px-8 py-5 border-b border-white/5 bg-white/[0.01]">
                                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Build & Deployment</h2>
                                    </header>
                                    <div className="p-8 space-y-8">
                                        <div className="grid grid-cols-1 gap-10">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <div className="md:col-span-2">
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">Connected Repo</label>
                                                    <div className="flex items-center gap-3 p-3.5 bg-white/[0.02] border border-white/5 rounded-lg text-sm text-slate-300">
                                                        <Github className="w-4 h-4" /> {selectedProject.repo_full_name || selectedProject.repo}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">Target Branch</label>
                                                    <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-lg text-sm text-white font-bold">{selectedProject.branch}</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">Build Command</label>
                                                    <div className="font-mono text-xs p-3.5 bg-black/40 border border-white/5 rounded-lg text-cyan-500">{selectedProject.build_command || 'default'}</div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">Start Command</label>
                                                    <div className="font-mono text-xs p-3.5 bg-black/40 border border-white/5 rounded-lg text-slate-400">{selectedProject.start_command || 'default'}</div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-2">Root Directory</label>
                                                    <div className="font-mono text-xs p-3.5 bg-black/40 border border-white/5 rounded-lg text-slate-500">{selectedProject.root_dir || './'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Custom Domains Section */}
                                <section className="glass-card rounded-lg border border-white/5 bg-[#0c0c0c] overflow-hidden">
                                    <header className="px-8 py-5 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
                                        <h2 className="text-sm font-black text-white uppercase tracking-widest">Custom Domains</h2>
                                        <button className="text-[10px] font-black uppercase tracking-widest text-[#6366f1] hover:underline">Add Domain</button>
                                    </header>
                                    <div className="p-0">
                                        <div className="px-8 py-6 flex items-center justify-between group hover:bg-white/[0.01] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                                    <Globe className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-white">{selectedProject.url}</div>
                                                    <div className="text-[10px] font-medium text-slate-600 uppercase tracking-widest">Primary Production Domain</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className="px-2 py-0.5 bg-emerald-500/10 rounded text-[9px] font-black text-emerald-500 uppercase tracking-widest">Valid SSL</span>
                                                <button className="p-2.5 bg-white/5 rounded-lg border border-white/5 text-slate-500 hover:text-white transition-all">
                                                    <Settings className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Health Monitoring */}
                                <section className="glass-card rounded-lg border border-white/5 bg-[#0c0c0c] overflow-hidden">
                                    <header className="px-8 py-5 border-b border-white/5 bg-white/[0.01]">
                                        <h2 className="text-sm font-black text-white uppercase tracking-widest">App Health</h2>
                                    </header>
                                    <div className="p-8">
                                        <div className="flex items-center justify-between p-6 bg-white/[0.01] border border-white/5 rounded-lg">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                                    <Activity className="w-6 h-6 text-cyan-500" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-white">URL Health Check /</div>
                                                    <div className="text-[10px] font-medium text-slate-600 uppercase tracking-widest">Polling every 60 seconds</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-emerald-500">100%</div>
                                                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-none">Uptime (24h)</div>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Critical Actions */}
                                <section className="glass-card rounded-lg border border-red-500/20 bg-red-500/[0.02] overflow-hidden">
                                    <header className="px-8 py-5 border-b border-red-500/10 flex justify-between items-center">
                                        <h2 className="text-sm font-black text-red-500 uppercase tracking-widest">Critical Management</h2>
                                    </header>
                                    <div className="p-8 space-y-8 border-b border-red-500/10">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="text-sm font-black text-white mb-1">Redeploy Project</h3>
                                                <p className="text-slate-600 text-xs">Force a fresh build from the latest source commit.</p>
                                            </div>
                                            <button
                                                onClick={() => handleRedeploy(selectedProject.id)}
                                                disabled={selectedProject.status === 'deploying'}
                                                className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-widest rounded-lg border border-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                                            >
                                                {selectedProject.status === 'deploying' ? 'Deploying...' : 'Re-orchestrate Stack'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-8 flex items-center justify-between bg-red-500/[0.03]">
                                        <div>
                                            <h3 className="text-sm font-black text-red-500 mb-1">Delete Project</h3>
                                            <p className="text-slate-600 text-xs">Permanently remove this project and all associated resources. This action cannot be undone.</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteProject(selectedProject.id)}
                                            className="px-6 py-3 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-lg shadow-[0_10px_30px_rgba(220,38,38,0.3)] hover:bg-red-700 transition-all active:scale-95"
                                        >
                                            Delete Permanently
                                        </button>
                                    </div>
                                </section>
                            </div>
                        </div>
                    ) : view === 'connect' ? (
                        /* --- CONNECT GITHUB VIEW --- */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <header className="mb-12 flex justify-between items-end">
                                <div>
                                    <button
                                        onClick={() => setView('overview')}
                                        className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2 hover:gap-3 transition-all"
                                    >
                                        Return to Dashboard
                                    </button>
                                    <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
                                        Connect <span className="text-accent-gradient">Repository</span>
                                    </h1>
                                    <p className="text-slate-500 text-sm mt-1">Select a repository to begin deployment</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="relative group w-80">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search repositories..."
                                            className="w-full bg-white/5 border border-white/5 rounded-lg py-3.5 pl-11 pr-4 focus:border-primary outline-none transition-all placeholder:text-slate-800 text-xs font-bold"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                {/* Side Selector */}
                                <aside className="lg:col-span-3 space-y-8 sticky top-8 self-start">
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 block">GitHub Source</label>
                                            <button
                                                onClick={refreshGithubData}
                                                disabled={loadingRepos}
                                                className="text-slate-600 hover:text-primary transition-colors disabled:opacity-50"
                                                title="Refresh GitHub Sources"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${loadingRepos ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handleOrgSelect(null)}
                                                className={`w-full flex items-center gap-3 px-5 py-4 rounded-lg border transition-all ${selectedOrg === null ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-white/[0.02] border-white/5 text-slate-500 hover:border-white/10'}`}
                                            >
                                                {loadingRepos && selectedOrg === null ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Github className="w-5 h-5 opacity-70" />
                                                )}
                                                <span className="font-black text-xs uppercase tracking-tighter">My Personal Space</span>
                                            </button>

                                            {orgs.map(org => (
                                                <button
                                                    key={org.id}
                                                    onClick={() => handleOrgSelect(org.login)}
                                                    className={`w-full flex items-center gap-3 px-5 py-4 rounded-lg border transition-all ${selectedOrg === org.login ? 'bg-primary/10 border-primary text-primary shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'bg-white/[0.02] border-white/5 text-slate-500 hover:border-white/10'}`}
                                                >
                                                    {loadingRepos && selectedOrg === org.login ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <img src={org.avatar_url || ''} alt={org.login} className="w-5 h-5 rounded-md grayscale group-hover:grayscale-0 transition-all" />
                                                    )}
                                                    <span className="font-black text-xs uppercase tracking-tighter truncate">{org.login}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </aside>

                                <div className="lg:col-span-9">
                                    {loadingRepos ? (
                                        <div className="space-y-3 opacity-50">
                                            {[1, 2, 3, 4, 5, 6].map(i => (
                                                <div key={i} className="h-20 glass-panel rounded-lg border-white/5 animate-pulse" />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-4 select-scrollbar">
                                            {filteredRepos.map((repo) => (
                                                <div
                                                    key={repo.id}
                                                    className="group glass-panel p-5 rounded-lg border border-white/5 hover:border-primary/40 hover:bg-white/[0.02] transition-all flex items-center gap-6 relative overflow-hidden"
                                                >
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />

                                                    <div className="p-3 bg-white/5 rounded-lg group-hover:bg-primary/10 transition-all border border-white/5 group-hover:border-primary/20 shrink-0">
                                                        <Github className="w-5 h-5 text-slate-500 group-hover:text-primary transition-colors" />
                                                    </div>

                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h3 className="text-base font-black text-white group-hover:text-primary transition-colors truncate leading-none">
                                                                {repo.name}
                                                            </h3>
                                                            <div className="flex items-center gap-1 text-[9px] font-black text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 translate-y-[1px]">
                                                                <Star className="w-2.5 h-2.5 text-yellow-500" />
                                                                {repo.stargazers_count}
                                                            </div>
                                                        </div>
                                                        <p className="text-slate-600 text-[10px] font-bold truncate opacity-80 leading-none">
                                                            {repo.description || "No mission brief provided for this repository context."}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-6 shrink-0 ml-4 relative z-10">
                                                        <a
                                                            href={repo.html_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[9px] font-black uppercase tracking-widest text-slate-700 hover:text-white flex items-center gap-2 transition-all mr-2"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink className="w-3 h-3" />
                                                            Source
                                                        </a>

                                                        <button
                                                            onClick={() => {
                                                                setSelectedRepoForDeploy(repo)
                                                                setShowDeployTypeModal(true)
                                                            }}
                                                            className="px-6 py-2.5 bg-white text-slate-950 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-primary hover:text-white transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                                        >
                                                            Deploy
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : view === 'billing' ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <header className="mb-12 flex justify-between items-end">
                                <div>
                                    <button
                                        onClick={() => setView('overview')}
                                        className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 flex items-center gap-2 hover:gap-3 transition-all underline underline-offset-4"
                                    >
                                        Return to Console
                                    </button>
                                    <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
                                        Pricing <span className="text-primary italic">Control Panel</span>
                                    </h1>
                                    <p className="text-slate-500 text-sm mt-1">Manage infrastructure tiers and subscription parameters.</p>
                                </div>
                                <button
                                    onClick={() => axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/billing/seed-plans`).then(() => window.location.reload())}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest rounded-lg border border-white/5 transition-all"
                                >
                                    Refresh Plan Manifest
                                </button>
                            </header>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {plans.map(plan => (
                                    <div key={plan.id} className="glass-card p-10 rounded-2xl border-white/5 bg-white/[0.012] flex flex-col relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex justify-between items-start mb-10 relative z-10">
                                            <div>
                                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{plan.name} Tier</div>
                                                <div className="text-4xl font-black text-white">${plan.price}</div>
                                            </div>
                                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5">
                                                <CreditCard className="w-6 h-6 text-primary" />
                                            </div>
                                        </div>

                                        <div className="space-y-6 relative z-10">
                                            <div className="p-5 rounded-xl bg-black/20 border border-white/5 space-y-4">
                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                    <span className="text-slate-600 uppercase tracking-widest">Memory</span>
                                                    <span className="text-white">{plan.features.ram}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                    <span className="text-slate-600 uppercase tracking-widest">Compute</span>
                                                    <span className="text-white">{plan.features.cpu}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                    <span className="text-slate-600 uppercase tracking-widest">Network</span>
                                                    <span className="text-white">{plan.features.bandwidth}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-4 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl">
                                                <Activity className="w-4 h-4 text-emerald-500" />
                                                <div className="text-[8px] font-black text-emerald-500/80 uppercase tracking-widest">Active Manifest • Online</div>
                                            </div>
                                        </div>

                                        <button className="w-full mt-10 py-4 rounded-xl border border-white/5 bg-white/5 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-slate-400 hover:text-white">
                                            Modify Parameters
                                        </button>
                                    </div>
                                ))}

                                <button className="glass-card group p-10 rounded-2xl border border-dashed border-white/10 bg-transparent flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-primary/[0.02] transition-all min-h-[400px]">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
                                        <Plus className="w-8 h-8 text-slate-700 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs font-black text-white uppercase tracking-widest mb-1">Scale New Tier</div>
                                        <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-none">Initialize New Pricing Spec</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </main >

            {/* Background Texture Overlay */}
            < div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[100]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }
            } />

            {/* --- WORKSPACE CREATION OVERLAY --- */}
            {
                showCreateWorkspace && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/80 animate-in fade-in duration-500">
                        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

                        <div className="w-full max-w-lg glass-panel p-10 rounded-lg border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 blur-[80px] -z-10" />

                            <div className="text-center mb-10">
                                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6 border border-primary/20">
                                    <ShieldCheck className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-3xl font-black text-white tracking-tight mb-3">Initialize Your Command Center</h2>
                                <p className="text-slate-500 text-sm font-medium">Workspaces are isolated environments where you orchestrate your projects, teams, and infrastructure.</p>
                            </div>

                            <form onSubmit={handleCreateWorkspace} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-3">Workspace Name</label>
                                    <div className="relative group">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Acme Production, Personal Lab"
                                            className="w-full bg-white/[0.02] border border-white/10 rounded-lg py-4 pl-12 pr-6 focus:border-primary outline-none transition-all placeholder:text-slate-800 text-sm font-bold text-white"
                                            value={newWorkspaceName}
                                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isCreatingWorkspace || !newWorkspaceName.trim()}
                                    className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-lg shadow-[0_20px_40px_rgba(99,102,241,0.3)] hover:bg-[#575ae6] hover:translate-y-[-2px] transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                                >
                                    {isCreatingWorkspace ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Provisioning...
                                        </>
                                    ) : (
                                        <>
                                            Establish Workspace
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>

                                {workspaces.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateWorkspace(false)}
                                        className="w-full text-[10px] font-black uppercase tracking-widest text-slate-700 hover:text-slate-400 transition-colors py-2"
                                    >
                                        Cancel and return
                                    </button>
                                )}
                            </form>
                        </div>
                    </div>
                )
            }

            {/* --- DEPLOYMENT STRATEGY SELECTION OVERLAY --- */}
            {
                showDeployTypeModal && selectedRepoForDeploy && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/80 animate-in fade-in duration-500">
                        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />

                        <div className="w-full max-w-2xl glass-panel p-10 rounded-lg border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 blur-[80px] -z-10" />

                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tight mb-2">Select Deployment Strategy</h2>
                                    <p className="text-slate-500 text-sm font-medium">Choose how you want to orchestrate <span className="text-white">{selectedRepoForDeploy.name}</span></p>
                                </div>
                                <button
                                    onClick={() => setShowDeployTypeModal(false)}
                                    className="p-2 hover:bg-white/5 rounded-lg text-slate-500 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Pipeline Selection */}
                                <button
                                    onClick={() => {
                                        router.push(`/dashboard/projects/configure?repo_id=${selectedRepoForDeploy.id}&repo_name=${selectedRepoForDeploy.name}&repo_full_name=${selectedRepoForDeploy.full_name}&workspace_id=${selectedWorkspace?.id}&deploy_type=pipeline`)
                                        setShowDeployTypeModal(false)
                                    }}
                                    className="group relative flex flex-col p-8 rounded-lg bg-white/[0.01] border border-white/5 hover:border-primary/50 hover:bg-primary/[0.02] transition-all text-left overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 group-hover:scale-110 transition-transform">
                                        <Zap className="w-7 h-7 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-3 tracking-tight">Pipeline Deployment</h3>
                                    <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                                        Automated CI/CD workflow optimized for Next.js, Vite, and Python APIs. We handle the building, optimization, and edge delivery.
                                    </p>
                                    <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                                        Select Strategy <ArrowRight className="w-3.5 h-3.5" />
                                    </div>
                                </button>

                                {/* Docker Selection */}
                                <button
                                    onClick={() => {
                                        router.push(`/dashboard/projects/configure?repo_id=${selectedRepoForDeploy.id}&repo_name=${selectedRepoForDeploy.name}&repo_full_name=${selectedRepoForDeploy.full_name}&workspace_id=${selectedWorkspace?.id}&deploy_type=docker`)
                                        setShowDeployTypeModal(false)
                                    }}
                                    className="group relative flex flex-col p-8 rounded-lg bg-white/[0.01] border border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/[0.02] transition-all text-left overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="w-14 h-14 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-6 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                                        <Box className="w-7 h-7 text-cyan-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-3 tracking-tight">Docker Container</h3>
                                    <p className="text-slate-500 text-xs font-medium leading-relaxed mb-6">
                                        Full environment control. Bring your own Dockerfile or choose from our audited templates for specialized workloads.
                                    </p>
                                    <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-500 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                                        Select Strategy <ArrowRight className="w-3.5 h-3.5" />
                                    </div>
                                </button>
                            </div>

                            <div className="mt-10 pt-8 border-t border-white/5 flex justify-center">
                                <button
                                    onClick={() => setShowDeployTypeModal(false)}
                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-white transition-colors"
                                >
                                    Nevermind, go back
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
