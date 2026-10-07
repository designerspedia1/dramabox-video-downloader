// Vercel serverless function: resolves a DramaBox link into numbered episode download links.
// Only exposes media URLs that DramaBox itself publishes for unlocked episodes.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

function extractIds(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl.trim());
  } catch {
    return { error: 'Invalid URL. Paste a DramaBox share or video link.' };
  }
  const host = u.hostname.toLowerCase();

  if (host.includes('dramabox.com')) {
    // sharet.dramabox.com/play?bid=...&cid=...
    const bid = u.searchParams.get('bid');
    const cid = u.searchParams.get('cid');
    if (bid && cid) return { bid, cid };
    // www.dramabox.com/video/{bid}_{slug}/{cid}_Episode-{n}
    const m = u.pathname.match(/\/video\/(\d+)[^/]*\/(\d+)_Episode/i);
    if (m) return { bid: m[1], cid: m[2] };
  }
  return { error: 'Could not find a DramaBox book/episode id in that link.' };
}

function fmtDuration(ms) {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const rawUrl = req.query.url || '';
  const ids = extractIds(rawUrl);
  if (ids.error) return res.status(400).json({ error: ids.error });

  const { bid, cid } = ids;
  const pageUrl = `https://www.dramabox.com/video/${bid}_x/${cid}_Episode-1`;

  let html;
  try {
    const r = await fetch(pageUrl, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      redirect: 'follow',
    });
    if (!r.ok) throw new Error('DramaBox returned HTTP ' + r.status);
    html = await r.text();
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach DramaBox: ' + e.message });
  }

  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s
  );
  if (!m) return res.status(502).json({ error: 'DramaBox page format changed — please try again later.' });

  let data;
  try {
    // Next.js escapes < as \u003c inside the JSON; unescape HTML entities just in case.
    data = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
  } catch (e) {
    return res.status(502).json({ error: 'Could not parse DramaBox data.' });
  }

  const pp = (data.props && data.props.pageProps) || {};
  const book = pp.bookInfo || {};
  const chapters = Array.isArray(pp.chapterList) ? pp.chapterList : [];

  const episodes = chapters.map((c) => ({
    n: (c.index ?? 0) + 1,
    code: c.indexStr || String((c.index ?? 0) + 1).padStart(3, '0'),
    name: c.name || '',
    duration: fmtDuration(c.duration),
    locked: !c.unlock,
    mp4: c.unlock && c.mp4 ? c.mp4 : null,
  }));

  return res.status(200).json({
    book: {
      id: String(book.bookId || bid),
      title: book.bookName || 'DramaBox drama',
      cover: book.cover || null,
      total: book.chapterCount || episodes.length,
    },
    episodes,
    free: episodes.filter((e) => e.mp4).length,
  });
}
