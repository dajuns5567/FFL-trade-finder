
/*
 * V16 consensus ingestion layer.
 * This module deliberately does NOT assign player values.
 * It fetches, paginates, extracts, normalizes, and validates source rankings.
 */

export const CONSENSUS_SOURCES = [
  { id:"fantasypros", name:"FantasyPros", type:"offense", format:"dynasty-ppr",
    urls:["https://www.fantasypros.com/nfl/rankings/dynasty-overall.php"] },
  { id:"draftsharks", name:"DraftSharks", type:"offense", format:"dynasty-ppr",
    urls:["https://www.draftsharks.com/dynasty-rankings/ppr-superflex",
          "https://www.draftsharks.com/dynasty-rankings/ppr"] },
  { id:"pfn", name:"PFN", type:"offense", format:"dynasty-ppr",
    urls:["https://www.profootballnetwork.com/fantasy-football-dynasty-rankings/"] },
  { id:"si", name:"SI", type:"offense", format:"dynasty-ppr",
    urls:["https://www.si.com/onsi/fantasy/rankings/top-150-overall-dynasty-fantasy-football-rankings-ja-marr-chase-is-still-the-top-option-but-puka-nacua-falls"] },
  { id:"ktc", name:"KTC", type:"offense", format:"dynasty",
    urls:["https://keeptradecut.com/dynasty-rankings"] , reducedWeight:true },
  { id:"draftsharks-idp", name:"DraftSharks IDP", type:"idp", format:"dynasty-idp",
    urls:["https://www.draftsharks.com/dynasty-rankings/idp"] },
  { id:"pff-idp", name:"PFF IDP", type:"idp", format:"dynasty-idp",
    urls:["https://www.pff.com/news/fantasy-football-dynasty-idp-rankings"] },
  { id:"dynasty-dealer-idp", name:"Dynasty Dealer IDP", type:"idp", format:"dynasty-idp",
    urls:["https://www.dynastydealer.com/rankings/idp"] }
];

const DEFAULT_FETCH_TIMEOUT_MS = 7000;
const KTC_MAX_PAGE = 5;

const norm = s => String(s || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g,"")
  .replace(/[’']/g,"")
  .replace(/[^a-z0-9]+/gi," ")
  .trim().toLowerCase();

export function normalizePlayerName(name) {
  return norm(name)
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g,"")
    .replace(/\s+/g," ")
    .trim();
}

function rankFromText(s) {
  const m = String(s||"").match(/(?:^|\s)(\d{1,4})(?:[\.\)\-:]\s+|\s{2,})/);
  return m ? Number(m[1]) : null;
}

function cleanName(s) {
  return String(s||"")
    .replace(/^\s*\d{1,4}[\.\)\-:]\s*/,"")
    .replace(/\s+/g," ").trim();
}

function genericExtract(text, source) {
  const out = [];
  const lines = String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);

  for (const line of lines) {
    const r = rankFromText(line);
    if (r == null) continue;
    const rest = cleanName(line);
    if (!rest || rest.length < 3 || rest.length > 100) continue;

    // Remove common positional/team suffixes while preserving names.
    const name = rest
      .replace(/\s+\b(QB|RB|WR|TE|OT|OL|DL|DE|DT|EDGE|LB|ILB|OLB|CB|S|DB|IDP)\b(?:\s*[-|/].*)?$/i,"")
      .trim();

    if (name.length >= 3) out.push({rank:r, player:name});
  }

  // Deduplicate by rank/player while retaining first occurrence.
  const seen = new Set();
  return out.filter(x => {
    const k = `${x.rank}|${normalizePlayerName(x.player)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).sort((a,b)=>a.rank-b.rank);
}

async function fetchText(url, fetchImpl=fetch, timeoutMs=DEFAULT_FETCH_TIMEOUT_MS) {
  const headers = {
    "user-agent":"Mozilla/5.0 (compatible; FLL-TradeFinder/16.0; +https://netlify.com)",
    "accept":"text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8"
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url,{headers,redirect:"follow",signal:controller.signal});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaJina(url, fetchImpl=fetch, timeoutMs=DEFAULT_FETCH_TIMEOUT_MS) {
  const u = `https://r.jina.ai/http://${url.replace(/^https?:\/\//,"")}`;
  return fetchText(u,fetchImpl,timeoutMs);
}

async function getPage(url, fetchImpl=fetch, timeoutMs=DEFAULT_FETCH_TIMEOUT_MS) {
  try {
    const text = await fetchText(url,fetchImpl,timeoutMs);
    if (text && text.length > 500) return {text, method:"direct", url};
  } catch {}
  const text = await fetchViaJina(url,fetchImpl,timeoutMs);
  return {text, method:"jina", url};
}

/*
 * Source-specific pagination hooks.
 * We do not guess a pagination URL. Each adapter can add verified mechanisms.
 * KTC's adapter recognizes common page/offset parameters and stops only when
 * no new ranking rows are returned.
 */
async function collectPages(source, fetchImpl=fetch, timeoutMs=DEFAULT_FETCH_TIMEOUT_MS) {
  const all = [];
  const seenPages = new Set();

  for (const baseUrl of source.urls) {
    // First page.
    let page;
    try {
      page = await getPage(baseUrl,fetchImpl,timeoutMs);
    } catch (e) {
      continue;
    }
    const first = genericExtract(page.text,source);
    all.push(...first);
    seenPages.add(baseUrl);

    // KTC commonly exposes 50-ish ranking records at a time. Try conservative
    // offset/page variants, stopping after three consecutive pages with no new rows.
    if (source.id === "ktc") {
      let empty = 0;
      let lastCount = new Set(all.map(x=>`${x.rank}|${normalizePlayerName(x.player)}`)).size;
      for (let pageNo=2; pageNo<=KTC_MAX_PAGE && empty<2; pageNo++) {
        const variants = [
          `${baseUrl}?page=${pageNo}`,
          `${baseUrl}?offset=${(pageNo-1)*50}`,
          `${baseUrl}?start=${(pageNo-1)*50}`
        ];
        let added = 0;
        for (const u of variants) {
          if (seenPages.has(u)) continue;
          seenPages.add(u);
          try {
            const p = await getPage(u,fetchImpl,timeoutMs);
            const rows = genericExtract(p.text,source);
            const before = new Set(all.map(x=>`${x.rank}|${normalizePlayerName(x.player)}`));
            for (const r of rows) {
              const k=`${r.rank}|${normalizePlayerName(r.player)}`;
              if (!before.has(k)) { all.push(r); before.add(k); added++; }
            }
          } catch {}
        }
        const now = new Set(all.map(x=>`${x.rank}|${normalizePlayerName(x.player)}`)).size;
        if (now === lastCount) empty++; else empty=0;
        lastCount=now;
        if (added===0 && pageNo>=5) empty++;
      }
    }
  }

  const unique = new Map();
  for (const r of all) {
    const key = `${r.rank}|${normalizePlayerName(r.player)}`;
    if (!unique.has(key)) unique.set(key,r);
  }
  return [...unique.values()].sort((a,b)=>a.rank-b.rank);
}

export async function refreshSource(source, opts={}) {
  const now = new Date().toISOString();
  try {
    const rows = await collectPages(source, opts.fetchImpl || fetch, opts.timeoutMs || DEFAULT_FETCH_TIMEOUT_MS);
    const uniquePlayers = new Set(rows.map(x=>normalizePlayerName(x.player))).size;

    // Validation is source-aware and deliberately does not require a fixed
    // Sleeper match count. A source can be valid with imperfect name matching.
    const enough = rows.length >= (source.id==="ktc" ? 100 : source.type==="idp" ? 40 : 75);
    const ranks = rows.map(x=>x.rank).filter(Number.isFinite);
    const ordered = ranks.length > 1 && ranks[0] >= 1;
    const valid = enough && ordered && uniquePlayers >= Math.min(rows.length, 40);

    return {
      source: source.name,
      id: source.id,
      status: valid ? "refreshed" : "failed",
      valid,
      format: source.format,
      reducedWeight: !!source.reducedWeight,
      players_extracted: uniquePlayers,
      ranking_rows: rows.length,
      rankings: rows,
      timestamp: now,
      stage: valid ? "validated" : "extract",
      error: valid ? null : `Only ${rows.length} validated ranking rows were extracted`,
      urls: source.urls
    };
  } catch (e) {
    return {
      source:source.name,id:source.id,status:"failed",valid:false,
      format:source.format,reducedWeight:!!source.reducedWeight,
      players_extracted:0,ranking_rows:0,rankings:[],timestamp:now,
      stage:"fetch",error:String(e?.message||e),urls:source.urls
    };
  }
}

export async function refreshAllSources(opts={}) {
  const results=await Promise.all(CONSENSUS_SOURCES.map(source=>refreshSource(source,opts)));
  return {
    successful:results.filter(x=>x.valid).length,
    total:CONSENSUS_SOURCES.length,
    results
  };
}
