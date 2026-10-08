import { withSupabase } from 'npm:@supabase/server@^1'

const OWNER = 'ankitvrsharma'
const REPO = 'ankitvrsharma/NET-Psychology'
const GITHUB_API = 'https://api.github.com'
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

async function github(path: string, options: RequestInit = {}) {
  const token = Deno.env.get('GITHUB_ADMIN_TOKEN')
  if (!token) throw new Error('GITHUB_ADMIN_TOKEN is not configured in Supabase Edge Function secrets.')
  const response = await fetch(GITHUB_API + path, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  })
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

  const { data: profile, error } = await ctx.supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', ctx.userClaims.sub)
    .maybeSingle()

  if (error || profile?.role !== 'admin') return json({ error: 'Admin access required.' }, 403, req)

  try {
    const body = await req.json()
    const action = String(body?.action || '')

    if (action === 'health') {
      const me = await github('/user')
      if (me?.login !== OWNER) return json({ ok: false, message: 'Configured GitHub credential is not the site owner.' }, 403, req)
      await github('/repos/' + REPO)
      return json({ ok: true, login: me.login, repository: REPO }, 200, req)
    }

    if (action === 'write_file') {
      await writeFile(String(body.path || ''), String(body.content || ''), String(body.message || 'Admin content update'))
      return json({ ok: true }, 200, req)
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
      return json({ ok: true }, 200, req)
    }

    return json({ error: 'Unknown admin action.' }, 400, req)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Admin GitHub operation failed.' }, 502, req)
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
