import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Disable Vercel body parser — we stream the raw binary
export const config = { api: { bodyParser: false } };

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const buffer      = await readBody(req);
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    const fileName    = decodeURIComponent(req.headers['x-file-name'] || 'imagen');
    const profileId   = req.headers['x-profile-id'] || 'anon';

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(contentType)) {
      return res.status(400).json({ error: 'Solo se permiten jpg, png o webp' });
    }
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'El archivo supera 5 MB' });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path     = profileId + '/' + Date.now() + '_' + safeName;

    const { error: upErr } = await supabase.storage
      .from('titulares-imagenes')
      .upload(path, buffer, { contentType, cacheControl: '3600', upsert: false });

    if (upErr) throw upErr;

    const { data: urlData } = supabase.storage
      .from('titulares-imagenes')
      .getPublicUrl(path);

    return res.status(200).json({ url: urlData.publicUrl, path });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
