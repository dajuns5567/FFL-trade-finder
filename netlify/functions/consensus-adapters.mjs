/*
 * V16 consensus ingestion layer.
 * This module deliberately does NOT assign player values.
 * It fetches, paginates, extracts, normalizes, and validates source rankings.
 */

export const CONSENSUS_SOURCES = [
  { id:"fantasypros", name:"FantasyPros", type:"offense", format:"dynasty-ppr",
    urls:["https://www.fantasypros.com/nfl/rankings/dynasty-overall.php?scoring=PPR"] },
  { id:"draftsharks", name:"DraftSharks", type:"offense", format:"dynasty-ppr",
    urls:["https://www.draftsharks.com/dynasty-rankings/ppr-superflex",
          "https://www.draftsharks.com/dynasty-rankings/ppr"] },
  { id:"pfn", name:"PFN", type:"offense", format:"dynasty-ppr",
    urls:["https://www.profootballnetwork.com/fantasy-football-dynasty-rankings/"] },
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

function assignedJson(text, variableName) {
  const source=String(text||"");
  const marker=new RegExp(`(?:var|let|const|window\\.)?\\s*${variableName}\\s*=\\s*`);
  const match=marker.exec(source);
  if(!match)return null;
  const start=source.indexOf("{",match.index+match[0].length);
  if(start<0)return null;
  let depth=0,quoted=false,escaped=false;
  for(let i=start;i<source.length;i++){
    const ch=source[i];
    if(quoted){
      if(escaped)escaped=false;
      else if(ch==="\\")escaped=true;
      else if(ch==='"')quoted=false;
      continue;
    }
    if(ch==='"'){quoted=true;continue}
    if(ch==="{")depth++;
    else if(ch==="}"&&--depth===0)return JSON.parse(source.slice(start,i+1));
  }
  return null;
}

export function extractFantasyProsRankings(text) {
  const payload=assignedJson(text,"ecrData");
  const players=Array.isArray(payload?.players)?payload.players:[];
  const raw=[];
  for(const row of players){
    const rank=Number(row?.rank_ecr);
    const player=String(row?.player_name||"").trim();
    if(!player||!Number.isFinite(rank)||rank<1)continue;
    raw.push({rank,player});
  }
  const unique=new Map();
  for(const row of raw){
    const key=normalizePlayerName(row.player);
    const prior=unique.get(key);
    if(key&&(!prior||row.rank<prior.rank))unique.set(key,row);
  }
  return {
    rows:[...unique.values()].sort((a,b)=>a.rank-b.rank),
    rawRankingRows:players.length,
    parser:"fantasypros-ecrData"
  };
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

async function collectPages(source, fetchImpl=fetch, timeoutMs=DEFAULT_FETCH_TIMEOUT_MS) {
  const all = [];
  const seenPages = new Set();
  const pageDiagnostics=[];

  for (const baseUrl of source.urls) {
    let page;
    try {
      page = await getPage(baseUrl,fetchImpl,timeoutMs);
    } catch (e) {
      continue;
    }
    const parsed=source.id==="fantasypros"
      ? extractFantasyProsRankings(page.text)
      : {rows:genericExtract(page.text,source),rawRankingRows:null,parser:"generic-text"};
    const first=parsed.rows;
    all.push(...first);
    pageDiagnostics.push({fetch_method:page.method,parser:parsed.parser,raw_ranking_rows:parsed.rawRankingRows??first.length});
    seenPages.add(baseUrl);

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
  return {rows:[...unique.values()].sort((a,b)=>a.rank-b.rank),pageDiagnostics};
}

export async function refreshSource(source, opts={}) {
  const now = new Date().toISOString();
  try {
    const collected = await collectPages(source, opts.fetchImpl || fetch, opts.timeoutMs || DEFAULT_FETCH_TIMEOUT_MS);
    const rows=collected.rows;
    const uniquePlayers = new Set(rows.map(x=>normalizePlayerName(x.player))).size;
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
      urls: source.urls,
      ...(source.id==="fantasypros"?{diagnostics:{
        fetch_method:collected.pageDiagnostics[0]?.fetch_method||null,
        parser:collected.pageDiagnostics[0]?.parser||"fantasypros-ecrData",
        raw_ranking_rows:collected.pageDiagnostics[0]?.raw_ranking_rows||0,
        unique_players_extracted:uniquePlayers,
        first_10:rows.slice(0,10),
        validation_result:valid,
        failure_reason:valid?null:`Only ${rows.length} validated ranking rows were extracted`
      }}:{})
    };
  } catch (e) {
    return {
      source:source.name,id:source.id,status:"failed",valid:false,
      format:source.format,reducedWeight:!!source.reducedWeight,
      players_extracted:0,ranking_rows:0,rankings:[],timestamp:now,
      stage:"fetch",error:String(e?.message||e),urls:source.urls,
      ...(source.id==="fantasypros"?{diagnostics:{
        fetch_method:null,parser:"fantasypros-ecrData",raw_ranking_rows:0,
        unique_players_extracted:0,first_10:[],validation_result:false,
        failure_reason:String(e?.message||e)
      }}:{})
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
