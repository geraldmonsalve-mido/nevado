import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const FOUNDER_EMAIL = 'nevado.pro7@gmail.com';

function rangoPorCroquetas(croquetas = 0) {
  const c = Number(croquetas || 0);
  if (c >= 29050) return 'Leyenda Andina';
  if (c >= 16450) return 'Protector';
  if (c >= 8450) return 'Guía';
  if (c >= 5450) return 'Montañista';
  if (c >= 3200) return 'Guardián';
  if (c >= 2000) return 'Explorador';
  return 'Cachorro';
}

function nivelPorCroquetas(croquetas = 0) {
  const c = Number(croquetas || 0);
  if (c >= 29050) return Math.min(170, 108 + Math.floor((c - 29050) / 200));
  if (c >= 16450) return 68 + Math.floor((c - 16450) / 200);
  if (c >= 8450) return 48 + Math.floor((c - 8450) / 150);
  if (c >= 5450) return 33 + Math.floor((c - 5450) / 150);
  if (c >= 3200) return 21 + Math.floor((c - 3200) / 100);
  if (c >= 2000) return 11 + Math.floor((c - 2000) / 100);
  return Math.max(1, Math.floor(c / 100));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { founder_email, to_email, cantidad, motivo, operacion } = req.body || {};

    if (founder_email !== FOUNDER_EMAIL) {
      return res.status(403).json({ error: 'Solo el founder puede modificar croquetas.' });
    }

    const rawAmount = Math.abs(Number(cantidad || 0));
    const sign = operacion === 'restar' ? -1 : 1;
    const amount = rawAmount * sign;

    if (!to_email || rawAmount <= 0) return res.status(400).json({ error: 'Datos inválidos.' });

    const { data: usuario, error: userError } = await supabase
      .from('usuarios')
      .select('clerk_id,nombre,email,croquetas')
      .ilike('email', to_email)
      .maybeSingle();

    if (userError) return res.status(500).json({ error: userError.message });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const nuevas = Math.max(0, Number(usuario.croquetas || 0) + amount);
    const rango = rangoPorCroquetas(nuevas);
    const nivel = nivelPorCroquetas(nuevas);

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({
        croquetas: nuevas,
        nivel,
        rango,
        ultima_actividad: new Date().toISOString()
      })
      .eq('clerk_id', usuario.clerk_id);

    if (updateError) return res.status(500).json({ error: updateError.message });

    await supabase.from('croquetas_log').insert({
      clerk_id: usuario.clerk_id,
      cantidad: amount,
      motivo: motivo || (amount > 0 ? 'Otorgamiento institucional' : 'Retiro institucional')
    });

    return res.status(200).json({
      ok: true,
      usuario: usuario.nombre,
      email: usuario.email,
      cambio: amount,
      croquetas: nuevas,
      nivel,
      rango
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
