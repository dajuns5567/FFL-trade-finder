#!/usr/bin/env node
// Read-only checksum helper: computes the exact digest the production release
// guard requires. It NEVER changes approval state or stores/publishes an edition.
// Usage: node scripts/inquirer-manifest-digest.mjs reviewed-manifest.json
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {editorialManifestDigest} from '../netlify/functions/inquirer-future-release-guard.mjs';
const p=process.argv[2];
assert(p,'Provide a local manuscript JSON file');
const m=JSON.parse(fs.readFileSync(p,'utf8'));
assert(Number.isInteger(Number(m.season))&&Number.isInteger(Number(m.week)),'Manifest season and week required');
assert(m.teams&&!Array.isArray(m.teams)&&typeof m.teams==='object'&&Object.keys(m.teams).length===32,'Manifest must have exactly 32 team briefs');
assert(m.recap&&typeof m.recap==='object'&&!Array.isArray(m.recap),'Manifest recap desk briefs required');
console.log(JSON.stringify({season:m.season,week:m.week,content_sha256:editorialManifestDigest(m),notice:'Read-only digest, NOT editorial approval. A trusted reviewer must approve exactly this manuscript before staging.'},null,2));
