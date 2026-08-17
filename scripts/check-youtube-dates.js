import Papa from 'papaparse';

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlwl3lsPNIgJl38cunAhoqkwvjCU3fW0gjgvIrU9xjF4H5GMRhLYgDKiNTIgS62Wn6hoZgMqgZnvS1/pub?output=csv";

function extractYouTubeId(url) {
  if (!url) return '';
  const clean = String(url).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : '';
}

async function getPublishDate(videoId) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    const dateMatch = html.match(/"uploadDate":"([^"]+)"/) || html.match(/"publishDate":"([^"]+)"/) || html.match(/itemprop="datePublished" content="([^"]+)"/);
    if (dateMatch) return dateMatch[1];

    const simpleDate = html.match(/"dateText":\{"simpleText":"([^"]+)"\}/);
    if (simpleDate) return simpleDate[1];
  } catch (e) {}
  return null;
}

async function main() {
  const response = await fetch(SHEET_CSV_URL);
  const csv = await response.text();
  const parsed = Papa.parse(csv, { header: true });
  
  const results = [];
  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const url = row.URL_Youtube || '';
    const id = extractYouTubeId(url);
    if (!id) continue;
    const title = row.Titulo || '';
    const date = await getPublishDate(id);
    results.push({ rowNumber: i + 2, title, id, date, originalRow: row });
    console.log(`[${i + 1}/${parsed.data.length}] ${title} -> ${date}`);
  }

  // Sort chronologically (newest first)
  results.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  console.log('\n================ ORDEN CRONOLÓGICO REAL DE YOUTUBE (MÁS NUEVO PRIMERO) ================');
  results.forEach((v, idx) => {
    console.log(`${idx + 1}. [${v.date}] ${v.title} (Fila original: ${v.rowNumber})`);
  });
}

main();
