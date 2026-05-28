import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);


function nivelPorCroquetas(croquetas) {
  const c = Number(croquetas || 0);
  if (c >= 29050) return 108 + Math.min(62, Math.floor((c - 29050) / 200));
  if (c >= 16450) return 68  + Math.floor((c - 16450) / 200);
  if (c >= 8450)  return 48  + Math.floor((c - 8450)  / 150);
  if (c >= 5450)  return 33  + Math.floor((c - 5450)  / 150);
  if (c >= 3200)  return 21  + Math.floor((c - 3200)  / 100);
  if (c >= 1000)  return 11  + Math.floor((c - 1000)  / 100);
  return Math.max(1, Math.floor(c / 100) + 1);
}

function rangoPorCroquetas(croquetas, rangoActual) {
  const c = Number(croquetas || 0);
  const rangosAltos = ['montanista', 'guia', 'protector', 'leyenda_andina'];
  if (rangosAltos.includes(rangoActual)) return rangoActual;
  if (c >= 2000) return 'guardian';
  if (c >= 1000) return 'explorador';
  return 'cachorro';
}

function rangoKeyDesdeNombre(nombre) {
  const map = {
    'Cachorro': 'cachorro', 'Explorador': 'explorador', 'Guardián': 'guardian',
    'Montañista': 'montanista', 'Guía': 'guia', 'Protector': 'protector',
    'Leyenda Andina': 'leyenda_andina',
  };
  return map[nombre] || 'cachorro';
}

const RANGO_NOMBRES_API = {
  cachorro: 'Cachorro', explorador: 'Explorador', guardian: 'Guardián',
  montanista: 'Montañista', guia: 'Guía', protector: 'Protector',
  leyenda_andina: 'Leyenda Andina',
};

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

    const croquetas  = Number(data.croquetas || 0);
    const rangoActual = rangoKeyDesdeNombre(data.rango);
    const rango_key  = rangoPorCroquetas(croquetas, rangoActual);
    const nivel      = nivelPorCroquetas(croquetas);
    const rango      = RANGO_NOMBRES_API[rango_key] || rango_key;

    return res.status(200).json({
      ...data,
      croquetas,
      nivel,
      rango,
      rango_key,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
