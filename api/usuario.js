import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

function rangoPorCroquetas(croquetas = 0) {
  const n = Number(croquetas || 0);
  if (n >= 16450) return 'Leyenda Andina';
  if (n >= 8450) return 'Protector';
  if (n >= 5450) return 'Guía';
  if (n >= 3200) return 'Montañista';
  if (n >= 2000) return 'Guardián';
  if (n >= 1000) return 'Explorador';
  return 'Cachorro';
}

export default async function handler(req, res) {
  try {
    const { clerk_id, email } = req.query;

    if (!clerk_id && !email) {
      return res.status(400).json({ error: 'Falta clerk_id o email' });
    }

    let query = supabase
      .from('usuarios')
      .select('clerk_id,nombre,email,croquetas,nivel,rango')
      .limit(1);

    if (clerk_id) query = query.eq('clerk_id', clerk_id);
    else query = query.ilike('email', email);

    const { data, error } = await query.maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Usuario no encontrado' });

    const croquetas = Number(data.croquetas || 0);
    const rango = data.rango || rangoPorCroquetas(croquetas);

    return res.status(200).json({
      ...data,
      croquetas,
      rango
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
