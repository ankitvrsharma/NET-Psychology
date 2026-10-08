import { withSupabase } from 'npm:@supabase/server@^1'

const OWNER = 'ankitvrsharma'
const REPO = 'ankitvrsharma/NET-Psychology'
const GITHUB_API = 'https://api.github.com'
const BRIDGE_VERSION = 'admin-profile-v2-timeout-diagnostics'
const PROFILE_TIMEOUT_MS = 4000
const GITHUB_TIMEOUT_MS = 5000
const ALLOWED_FILES = new Set([
  'data/verification-state.json',
  'data/content-enrichment-instructions.json',
  'data/content-approval-queue.json'
])
const ALLOWED_WORKFLOW = 'publish-approved-content.yml'
const ALLOWED_ORIGINS = new Set([
  'https://ankitvrsharma.github.io',
  'http://localhost:3000'
])

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://ankitvrsharma.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }
}

const json = (body: unknown, status = 200, req?: Request) =>
  Response.json(body, { status, headers: corsHeaders(req || new Request('https://localhost')) })

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: number | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms)
      })
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

async function github(path: string, options: RequestInit = {}) {
  const token = Deno.env.get('GITHUB_ADMIN_TOKEN')
  if (!token) throw new Error('GITHUB_ADMIN_TOKEN is not configured in Supabase Edge Function secrets.')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GITHUB_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(GITHUB_API + path, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {})
      }
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('GitHub request timed out: ' + path)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }

  const text = await response.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!response.ok) {
    const message = data?.message || ('GitHub API ' + response.status)
    throw new Error(message)
  }
  return data
}

function encodeBase64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  }
  return btoa(binary)
}

async function writeFile(path: string, content: string, message: string) {
  if (!ALLOWED_FILES.has(path)) throw new Error('This admin bridge cannot write that repository path.')
  const file = await github('/repos/' + REPO + '/contents/' + path + '?ref=main')
  return github('/repos/' + REPO + '/contents/' + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: encodeBase64(content),
      sha: file.sha,
      branch: 'main'
    })
  })
}

const authenticatedFetch = withSupabase({ auth: 'user' }, async (req, ctx) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405, req)

  let profileResult: { data: { role?: string } | null; error: unknown }
  try {
    profileResult = await withTimeout(
      ctx.supabase
        .from('profiles')
        .select('role')
        .eq('id', ctx.userClaims.id)
        .maybeSingle(),
      PROFILE_TIMEOUT_MS,
      'Admin profile lookup timed out.'
    )
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Admin profile lookup failed.',
      bridge_version: BRIDGE_VERSION,
      stage: 'profile_lookup'
    }, 502, req)
  }

  if (profileResult.error) {
    const profileError = profileResult.error as {
      code?: string
      message?: string
      details?: string
      hint?: string
    }
    return json({
      error: 'Admin profile lookup failed.',
      code: profileError?.code || null,
      details: profileError?.details || null,
      hint: profileError?.hint || null,
      message: profileError?.message || null,
      bridge_version: BRIDGE_VERSION,
      stage: 'profile_lookup'
    }, 502, req)
  }

  const profile = profileResult.data
  if (!profile) {
    return json({
      error: 'Admin profile not found.',
      bridge_version: BRIDGE_VERSION,
      stage: 'profile_authorization'
    }, 403, req)
  }

  if (profile.role !== 'admin') {
    return json({
      error: 'Admin role required.',
      bridge_version: BRIDGE_VERSION,
      stage: 'profile_authorization'
    }, 403, req)
  }

  try {
    const body = await req.json()
    const action = String(body?.action || '')

    if (action === 'health') {
      const me = await github('/user')
      if (me?.login !== OWNER) {
        return json({
          ok: false,
          message: 'Configured GitHub credential is not the site owner.',
          bridge_version: BRIDGE_VERSION,
          stage: 'github_identity'
        }, 403, req)
      }
      await github('/repos/' + REPO)
      return json({
        ok: true,
        login: me.login,
        repository: REPO,
        bridge_version: BRIDGE_VERSION,
        stage: 'github_health'
      }, 200, req)
    }

    if (action === 'write_file') {
      await writeFile(String(body.path || ''), String(body.content || ''), String(body.message || 'Admin content update'))
      return json({ ok: true, bridge_version: BRIDGE_VERSION, stage: 'write_file' }, 200, req)
    }

    if (action === 'dispatch_workflow') {
      const workflow = String(body.workflow || '')
      if (workflow !== ALLOWED_WORKFLOW) throw new Error('This admin bridge cannot dispatch that workflow.')
      const ref = String(body.ref || 'main')
      const inputs = body.inputs && typeof body.inputs === 'object' ? body.inputs : {}
      await github('/repos/' + REPO + '/actions/workflows/' + workflow + '/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref, inputs })
      })
      return json({ ok: true, bridge_version: BRIDGE_VERSION, stage: 'dispatch_workflow' }, 200, req)
    }

    return json({ error: 'Unknown admin action.', bridge_version: BRIDGE_VERSION }, 400, req)
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Admin GitHub operation failed.',
      bridge_version: BRIDGE_VERSION,
      stage: 'github_operation'
    }, 502, req)
  }
})

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
    const response = await authenticatedFetch(req)
    const headers = new Headers(response.headers)
    Object.entries(corsHeaders(req)).forEach(([key, value]) => headers.set(key, value))
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
  }
}
