const PFN_URL = "https://www.profootballnetwork.com/fantasy-football-dynasty-rankings/";
const TIMEOUT_MS = 7000;

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; FLL-TradeFinder/16.0; +https://netlify.com)",
        "accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8"
      },
      redirect: "follow",
      signal: controller.signal
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get("content-type") || null,
      text
    };
  } finally {
    clearTimeout(timer);
  }
}

function cleanSnippet(value, max = 260) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function inspect(text, method, contentType, status) {
  const source = String(text || "");
  const lines = source.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const candidateLines = lines
    .filter(line => /dynasty|rank|player|qb|rb|wr|te|ppr/i.test(line))
    .map(line => cleanSnippet(line, 320))
    .filter(Boolean)
    .slice(0, 12);

  const htmlTableRows = (source.match(/<tr\b/gi) || []).length;
  const htmlTables = (source.match(/<table\b/gi) || []).length;
  const jsonLd = (source.match(/application\/ld\+json/gi) || []).length;
  const nextData = /__NEXT_DATA__/i.test(source);
  const wpTable = /wp-block-table/i.test(source);
  const rankTokens = (source.match(/\brank\b/gi) || []).length;
  const dynastyTokens = (source.match(/\bdynasty\b/gi) || []).length;

  return {
    method,
    status,
    contentType,
    bytes: Buffer.byteLength(source, "utf8"),
    lineCount: lines.length,
    markers: {
      htmlTables,
      htmlTableRows,
      jsonLd,
      nextData,
      wpTable,
      rankTokens,
      dynastyTokens,
      hasScriptJson: /<script[^>]+type=["']application\/json["']/i.test(source),
      hasReactRoot: /__next|react-root|data-reactroot/i.test(source)
    },
    firstText: cleanSnippet(source, 600),
    candidateLines
  };
}

export default async () => {
  const attempts = [];

  try {
    const direct = await fetchText(PFN_URL);
    attempts.push(inspect(direct.text, "direct", direct.contentType, direct.status));
    if (direct.ok && direct.text.length > 500) {
      return json({ ok: true, source: "PFN", url: PFN_URL, selected: "direct", attempts });
    }
  } catch (error) {
    attempts.push({ method: "direct", error: String(error?.message || error) });
  }

  const jinaUrl = `https://r.jina.ai/http://${PFN_URL.replace(/^https?:\/\//, "")}`;
  try {
    const jina = await fetchText(jinaUrl);
    attempts.push(inspect(jina.text, "jina", jina.contentType, jina.status));
    return json({ ok: jina.ok, source: "PFN", url: PFN_URL, selected: "jina", attempts });
  } catch (error) {
    attempts.push({ method: "jina", error: String(error?.message || error) });
    return json({ ok: false, source: "PFN", url: PFN_URL, selected: null, attempts }, 502);
  }
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
