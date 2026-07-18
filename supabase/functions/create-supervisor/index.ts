import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Verify the caller is an authenticated owner
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    const { data: callerProfile } = await callerClient
      .from('profiles').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'owner') {
      return new Response(JSON.stringify({ error: 'Only owners can create supervisor accounts' }), { status: 403, headers: corsHeaders })
    }

    // Parse body
    const { email, password, full_name, phone } = await req.json()
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: 'email, password and full_name are required' }), { status: 400, headers: corsHeaders })
    }

    // Use service role to create user without affecting caller session
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email confirmation — owner sets password directly
      user_metadata: { full_name },
    })

    if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 400, headers: corsHeaders })

    // Update the profile row (trigger creates it, we just set role + name + phone)
    const { error: profileErr } = await adminClient
      .from('profiles')
      .update({ role: 'supervisor', full_name, phone: phone || null })
      .eq('id', newUser.user.id)

    if (profileErr) {
      // User created but profile update failed — clean up
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return new Response(JSON.stringify({ error: `Profile update failed: ${profileErr.message}` }), { status: 500, headers: corsHeaders })
    }

    return new Response(
      JSON.stringify({ id: newUser.user.id, email, full_name }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders })
  }
})
