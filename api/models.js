// api/models.js - Modelos de MakerWorld de la portada (público, solo lectura). Devuelve filas con el mismo formato que usaba la hoja.
import { getPool } from './_lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const { rows } = await getPool().query('SELECT * FROM models WHERE active ORDER BY sort_order, id');
    const out = rows.map(m => {
      const row = {
        order: m.sort_order, name: m.name, price: m.price, showPrice: m.show_price ? 'true' : 'false', link: m.link,
        description: m.description, tag: m.tag, buttonText: m.button_text, carouselInterval: m.carousel_interval
      };
      (Array.isArray(m.images) ? m.images : []).slice(0, 10).forEach((u, i) => { row[`image${i + 1}`] = u; });
      return row;
    });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(out);
  } catch (err) {
    console.error('models error:', err);
    return res.status(500).json({ error: 'models_failed' });
  }
}
