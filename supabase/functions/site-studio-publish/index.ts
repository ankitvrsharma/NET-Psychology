import { withSupabase } from 'npm:@supabase/server@^1'
import { createClient } from 'npm:@supabase/supabase-js@^2'

const MAX_DOCUMENT_BYTES = 750_000
const ALLOWED_ORIGINS = new Set(['https://ankitvrsharma.github.io', 'http://localhost:3000'])
const json = (body: unknown, status = 200, req?: Request) => Response.json(body, {
  status,
  headers: {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(req?.headers.get('Origin') || '') ? req!.headers.get('Origin')! : 'https://ankitvrsharma.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  }
})

const handler = withSupabase({ auth: 'user' }, async (req: Request, ctx: any) => {
  if (req.method !== 'POST') return json({ error: 'POST required' }, 405, req)
  const profile = await ctx.supabase.from('profiles').select('role').eq('id', ctx.userClaims.id).maybeSingle()
  if (profile.error) return json({ error: 'Could not verify administrator role.' }, 502, req)
  if (profile.data?.role !== 'admin') return json({ error: 'Admin role required.' }, 403, req)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'Secure publishing service is not configured.' }, 503, req)
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  try {
    const body = await req.json()
    const key = String(body?.document_key || '')
    const document = body?.document
    const publish = body?.published !== false
    if (!/^(site-config|page:[a-z0-9-]{1,80}|content:[a-z0-9:_-]{1,160}|learning-rules)$/.test(key)) {
      return json({ error: 'Unsupported document key.' }, 400, req)
    }
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
      return json({ error: 'Document must be a JSON object.' }, 400, req)
    }
    const serialized = JSON.stringify(document)
    if (new TextEncoder().encode(serialized).byteLength > MAX_DOCUMENT_BYTES) {
      return json({ error: 'Document exceeds the 750 KB limit.' }, 413, req)
    }
    const current = await db.from('site_documents').select('revision').eq('document_key', key).maybeSingle()
    if (current.error) throw current.error
    const revision = Number(current.data?.revision || 0) + 1
    const result = await db.from('site_documents').upsert({
      document_key: key,
      document,
      published: publish,
      revision,
      updated_by: ctx.userClaims.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'document_key' }).select('document_key,revision,published,updated_at').single()
    if (result.error) throw result.error
    return json({ ok: true, ...result.data }, 200, req)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Publishing failed.' }, 500, req)
  }
})

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(req.headers.get('Origin') || '') ? req.headers.get('Origin')! : 'https://ankitvrsharma.github.io',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  } })
  return await handler(req)
})
