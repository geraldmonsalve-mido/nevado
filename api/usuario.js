// NEVADO — API /api/usuario (Vercel Serverless)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { method } = req;

  // GET /api/usuario?clerk_id=xxx
  if (method === 'GET') {
    const { clerk_id } = req.query;
    if (!clerk_id) return res.status(400).json({ error: 'clerk_id requerido' });
    const { data, error } = await supabase
      .from('usuarios').select('*').eq('clerk_id', clerk_id).single();
    if (error) return res.status(404).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST /api/usuario — crear/upsert usuario
  if (method === 'POST') {
    const { clerk_id, nombre, email } = req.body || {};
    if (!clerk_id) return res.status(400).json({ error: 'clerk_id requerido' });
    const { data, error } = await supabase
      .from('usuarios')
      .upsert({ clerk_id, nombre, email, ultima_actividad: new Date().toISOString() },
               { onConflict: 'clerk_id' })
      .select().single();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json(data);
  }

  // PATCH /api/usuario — actualizar croquetas/nivel/rango
  if (method === 'PATCH') {
    const { clerk_id, croquetas, rango, nivel, motivo } = req.body || {};
    if (!clerk_id) return res.status(400).json({ error: 'clerk_id requerido' });

    const updates = { ultima_actividad: new Date().toISOString() };
    if (croquetas !== undefined) updates.croquetas = croquetas;
    if (rango)  updates.rango  = rango;
    if (nivel)  updates.nivel  = nivel;

    const { data, error } = await supabase
      .from('usuarios').update(updates).eq('clerk_id', clerk_id).select().single();
    if (error) return res.status(400).json({ error: error.message });

    // Log de auditoría si hay cambio de croquetas
    if (croquetas !== undefined && motivo) {
      const prev = data.croquetas - croquetas;
      await supabase.from('croquetas_log').insert({
        clerk_id, cantidad: croquetas - prev, motivo
      });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
