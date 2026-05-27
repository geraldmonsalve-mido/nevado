import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const out = {
    usuarios_total:  null,
    croquetas_total: null,
    activos_24h:     null,
    guardian_plus:   null,
    logs_recientes:  []
  };

  try {
    const { count } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });
    out.usuarios_total = count ?? null;
  } catch (_) {}

  try {
    const { data } = await supabase.from('usuarios').select('croquetas');
    out.croquetas_total = data
      ? data.reduce((s, u) => s + Number(u.croquetas || 0), 0)
      : null;
  } catch (_) {}

  try {
    const since = new Date(Date.now() - 86400000).toISOString();
    const { count } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .gte('ultima_actividad', since);
    out.activos_24h = count ?? null;
  } catch (_) {}

  try {
    const { count } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .in('rango', ['Guardián', 'Montañista', 'Guía', 'Protector', 'Leyenda Andina']);
    out.guardian_plus = count ?? null;
  } catch (_) {}

  try {
    const { data: logs } = await supabase
      .from('croquetas_log')
      .select('creado_en, usuario_email, clerk_id, operacion, cantidad, motivo, founder_email')
      .order('creado_en', { ascending: false })
      .limit(20);

    out.logs_recientes = (logs || []).map(l => ({
      fecha:         l.creado_en || null,
      usuario_email: l.usuario_email || l.clerk_id || '—',
      operacion:     l.operacion || (Number(l.cantidad) >= 0 ? 'sumar' : 'restar'),
      cantidad:      Math.abs(Number(l.cantidad || 0)),
      motivo:        l.motivo || '—',
      founder_email: l.founder_email || '—'
    }));
  } catch (_) {}

  return res.status(200).json(out);
}
