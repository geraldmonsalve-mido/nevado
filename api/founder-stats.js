import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    const { count: usuarios } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });

    const { data: croquetasRows } = await supabase
      .from('usuarios')
      .select('croquetas');

    const croquetas = croquetasRows?.reduce((s, u) => s + Number(u.croquetas || 0), 0) || 0;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: activos } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .gte('ultima_actividad', since);

    const { count: guardianPlus } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .in('rango', ['Guardián', 'Montañista', 'Guía', 'Protector', 'Leyenda Andina']);

    const { data: logs } = await supabase
      .from('croquetas_log')
      .select('cantidad,motivo,creado_en')
      .order('creado_en', { ascending: false })
      .limit(5);

    return res.status(200).json({
      usuarios: usuarios || 0,
      croquetas,
      activos: activos || 0,
      guardianPlus: guardianPlus || 0,
      logs: logs || []
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
