import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const FOUNDER_EMAILS = [
  'nevado.pro7@gmail.com',
  'nevadopro7@gmail.com',
  'gerald.monsalve@gmail.com'
];

const RANGO_IMG = {
  'Cachorro':       '/rangos/rango1-cachorro-bronce-md.webp',
  'Explorador':     '/rangos/rango2-explorador-bronce-md.webp',
  'Guardián':       '/rangos/rango3-guardian-plata-md.webp',
  'Montañista':     '/rangos/rango4-montanista-plata-md.webp',
  'Guía':           '/rangos/rango5-guia-plata-md.webp',
  'Protector':      '/rangos/rango6-protector-oro-md.webp',
  'Leyenda Andina': '/rangos/rango7-leyendaandina-oro-joyas-md.webp'
};

function rangoPorCroquetas(c) {
  const n = Number(c || 0);
  if (n >= 16450) return 'Leyenda Andina';
  if (n >= 8450)  return 'Protector';
  if (n >= 5450)  return 'Guía';
  if (n >= 3200)  return 'Montañista';
  if (n >= 2000)  return 'Guardián';
  if (n >= 1000)  return 'Explorador';
  return 'Cachorro';
}

function nivelPorCroquetas(c) {
  const n = Number(c || 0);
  if (n >= 29050) return 170;
  if (n >= 16450) return 68 + Math.floor((n - 16450) / 200);
  if (n >= 8450)  return 48 + Math.floor((n - 8450)  / 150);
  if (n >= 5450)  return 33 + Math.floor((n - 5450)  / 150);
  if (n >= 3200)  return 21 + Math.floor((n - 3200)  / 100);
  if (n >= 2000)  return 11 + Math.floor((n - 2000)  / 100);
  return Math.max(1, Math.floor(n / 100));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { founder_email, action, email, operacion, cantidad, motivo } = req.body || {};

  if (!FOUNDER_EMAILS.includes(founder_email)) {
    return res.status(403).json({ error: 'Acceso no autorizado.' });
  }

  // ── BUSCAR ──────────────────────────────────────────────────────────────
  if (action === 'buscar') {
    if (!email) return res.status(400).json({ error: 'Email requerido.' });

    const { data, error } = await supabase
      .from('usuarios')
      .select('clerk_id, nombre, email, croquetas, nivel, rango')
      .ilike('email', email)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(404).json({ error: 'Usuario no encontrado.' });

    const croquetas = Number(data.croquetas || 0);
    const rango     = rangoPorCroquetas(croquetas);
    const nivel     = nivelPorCroquetas(croquetas);

    return res.status(200).json({
      id:           data.clerk_id,
      nombre:       data.nombre,
      email:        data.email,
      croquetas,
      nivel,
      rango,
      imagen_rango: RANGO_IMG[rango] || RANGO_IMG['Cachorro']
    });
  }

  // ── CAMBIAR ─────────────────────────────────────────────────────────────
  if (action === 'cambiar') {
    if (!email || !operacion || !cantidad || !motivo) {
      return res.status(400).json({ error: 'Datos incompletos.' });
    }

    const monto = Number(cantidad);
    if (monto <= 0) {
      return res.status(400).json({ error: 'Cantidad debe ser mayor a 0.' });
    }
    if (!['sumar', 'restar'].includes(operacion)) {
      return res.status(400).json({ error: 'Operación inválida.' });
    }

    const { data: usuario, error: findErr } = await supabase
      .from('usuarios')
      .select('clerk_id, nombre, email, croquetas')
      .ilike('email', email)
      .maybeSingle();

    if (findErr)  return res.status(500).json({ error: findErr.message });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado.' });

    const actual = Number(usuario.croquetas || 0);
    const delta  = operacion === 'sumar' ? monto : -monto;
    const nuevas = actual + delta;

    if (nuevas < 0) {
      return res.status(400).json({
        error: `No se puede restar ${monto}. El usuario tiene ${actual} croquetas.`,
        croquetas_actuales: actual
      });
    }

    const rango = rangoPorCroquetas(nuevas);
    const nivel = nivelPorCroquetas(nuevas);

    const { error: updateErr } = await supabase
      .from('usuarios')
      .update({
        croquetas:        nuevas,
        nivel,
        rango,
        ultima_actividad: new Date().toISOString()
      })
      .eq('clerk_id', usuario.clerk_id);

    if (updateErr) return res.status(500).json({ error: updateErr.message });

    await supabase.from('croquetas_log').insert({
      clerk_id:      usuario.clerk_id,
      usuario_email: usuario.email,
      cantidad:      delta,
      operacion,
      motivo,
      founder_email,
      creado_en:     new Date().toISOString()
    });

    return res.status(200).json({
      ok:           true,
      nombre:       usuario.nombre,
      email:        usuario.email,
      croquetas:    nuevas,
      nivel,
      rango,
      imagen_rango: RANGO_IMG[rango] || RANGO_IMG['Cachorro']
    });
  }

  return res.status(400).json({ error: 'Acción no válida.' });
}
