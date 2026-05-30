import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const method = req.method;

  /* ── GET /api/titulares?estado=enviado ── */
  if (method === 'GET') {
    const { estado, id } = req.query;
    try {
      if (id) {
        const { data, error } = await supabase
          .from('titulares_envios')
          .select('*')
          .eq('id', id)
          .single();
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json(data);
      }
      let query = supabase
        .from('titulares_envios')
        .select('id,titulo,categoria,autor_nombre,autor_username,autor_rank,estado,ia_score,created_at,updated_at')
        .order('created_at', { ascending: false });
      if (estado && estado !== 'todos') query = query.eq('estado', estado);
      const { data, error } = await query;
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /* ── POST /api/titulares — insertar nuevo envío ── */
  if (method === 'POST') {
    const payload = req.body;
    if (!payload || !payload.titulo || !payload.cuerpo) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }
    try {
      const { data, error } = await supabase
        .from('titulares_envios')
        .insert(payload)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  /* ── PATCH /api/titulares?id=<uuid> — actualizar estado / nota / ia ── */
  if (method === 'PATCH') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Falta id.' });
    try {
      const { data, error } = await supabase
        .from('titulares_envios')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
