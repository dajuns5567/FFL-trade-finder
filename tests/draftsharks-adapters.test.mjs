import test from "node:test";import assert from "node:assert/strict";
import {extractDraftSharksOffense} from "../netlify/functions/draftsharks-offense-adapter.mjs";
import {extractDraftSharksIdp} from "../netlify/functions/draftsharks-idp-adapter.mjs";
const offRow=(rank,name,pos="WR")=>`<tr data-player-id="${rank}"><td>${rank}</td><td><player-name first-name="${name}" last-name="Player"></player-name><pos-roster-spot pos-roster-spot="${pos}"></pos-roster-spot></td></tr>`;
const idpRow=(rank,name,pos="LB")=>`<tr data-player-id="${rank}"><td><span class="rank-index">${rank}</span></td><td><player-name first-name="${name}" last-name="Defender"></player-name><pos-roster-spot pos-roster-spot="${pos}"></pos-roster-spot></td></tr>`;
test("DraftSharks offense extracts legacy tbody rows",()=>{const html=`<tbody data-player-row>${offRow(1,"Alpha")}</tbody>`;assert.deepEqual(extractDraftSharksOffense(html).map(x=>[x.rank,x.player,x.position]),[[1,"Alpha Player","WR"]])});
test("DraftSharks offense extracts tr-level player rows after markup changes",()=>{const html=`<table><tbody>${offRow(1,"Alpha")}${offRow(2,"Beta","RB")}</tbody></table>`;assert.deepEqual(extractDraftSharksOffense(html).map(x=>x.rank),[1,2])});
test("DraftSharks IDP extracts tr-level player rows and rank-index",()=>{const html=`<table><tbody>${idpRow(1,"Gamma")}${idpRow(2,"Delta","DB")}</tbody></table>`;assert.deepEqual(extractDraftSharksIdp(html).map(x=>[x.rank,x.player,x.sourcePosition]),[[1,"Gamma Defender","LB"],[2,"Delta Defender","DB"]])});
