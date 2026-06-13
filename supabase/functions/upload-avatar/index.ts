import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { put } from 'https://esm.sh/@vercel/blob@0.27.3';
import { getCorsHeaders } from '../_shared/cors.ts';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  );
  if (authError || !user) return json({ error: 'Invalid authentication' }, 401);

  const blobToken = Deno.env.get('VERCEL_BLOB_READ_WRITE_TOKEN');
  if (!blobToken) return json({ error: 'Upload service unavailable' }, 503);

  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get('file') as File | null;
  } catch {
    return json({ error: 'Expected multipart/form-data with a "file" field' }, 400);
  }

  if (!file) return json({ error: 'No file provided' }, 400);
  if (file.size > MAX_SIZE_BYTES) return json({ error: 'File too large (max 5 MB)' }, 413);

  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const pathname = `goalmap/${user.id}-${Date.now()}.${ext}`;

  const { url } = await put(pathname, file, { access: 'public', token: blobToken });

  return json({ url });
});
