'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function AuthCallbackPage() {
    const router = useRouter()

    useEffect(() => {
        const handleCallback = async () => {
            // Supabase Implicit Flow sends tokens in the hash (#access_token=...)
            const hash = window.location.hash

            if (!hash) {
                // Fallback to check search params (for Code Flow or Errors)
                const params = new URLSearchParams(window.location.search)
                const code = params.get('code')
                const error = params.get('error')
                const errorDesc = params.get('error_description')
                const workspaceId = params.get('workspace_id')

                if (error) {
                    console.error('Auth error:', errorDesc)
                    router.push(`/login?error=${encodeURIComponent(errorDesc || error)}`)
                    return
                }

                if (code) {
                    // Redirect to backend for code exchange
                    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
                    let redirectUrl = `${backendUrl}/auth/callback?code=${code}`
                    if (workspaceId) redirectUrl += `&workspace_id=${workspaceId}`
                    window.location.href = redirectUrl
                    return
                }

                router.push('/login')
                return
            }

            // Parse tokens from hash
            const hashParams = new URLSearchParams(hash.substring(1))
            const accessToken = hashParams.get('access_token')
            const refreshToken = hashParams.get('refresh_token')
            const providerToken = hashParams.get('provider_token') // This is the GitHub token!

            const searchParams = new URLSearchParams(window.location.search)
            const workspaceId = searchParams.get('workspace_id')

            if (accessToken) {
                // Check if we are already logged in to prevent account switching
                const existingSession = document.cookie
                    .split('; ')
                    .find(row => row.startsWith('sb-access-token='))
                    ?.split('=')[1]

                // Should we update the main session? 
                // Only if NOT linking a workspace OR if no session exists
                const shouldUpdateSession = !workspaceId || !existingSession

                if (shouldUpdateSession) {
                    // Standard login or no session: update both access and refresh tokens
                    document.cookie = `sb-access-token=${accessToken}; path=/; max-age=3600; SameSite=Lax`

                    if (refreshToken) {
                        document.cookie = `sb-refresh-token=${refreshToken}; path=/; max-age=604800; SameSite=Lax`
                    }
                } else {
                    console.log('Preserving existing session while linking workspace')
                }

                if (providerToken) {
                    // Update gh-token for temporary UI state in dashboard
                    document.cookie = `gh-token=${providerToken}; path=/; max-age=3600; SameSite=Lax`
                }

                // SYNC WITH BACKEND DATABASE
                try {
                    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
                    await axios.post(`${apiUrl}/auth/sync`, {
                        access_token: accessToken,
                        github_token: providerToken,
                        workspace_id: workspaceId
                    })
                } catch (syncErr) {
                    console.error('Failed to sync user with backend:', syncErr)
                    // We continue to dashboard anyway as the session is technically valid in Supabase
                }

                router.push('/dashboard')
            } else {
                router.push('/login')
            }
        }

        handleCallback()
    }, [router])

    return null
}
