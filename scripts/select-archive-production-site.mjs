// Pure, fail-closed selection. Exact SHA is informational, not a selection gate.
export function selectArchiveProductionSite(sites, deploysBySite, {repository,branch='main',expectedSiteId,targetSha}={}){
 const norm=s=>String(s||'').toLowerCase().replace(/^git\+/,'').replace(/\.git$/,'').replace(/^https?:\/\/github\.com\//,'').replace(/^git@github\.com:/,'').replace(/^github\.com\//,'').replace(/^\/+|\/+$/g,'');
 if(!expectedSiteId)throw Error('ARCHIVE_SITE_GUARD: explicit production site ID required');
 const selected=sites.filter(s=>String(s.id)===expectedSiteId);
 if(selected.length!==1)throw Error('ARCHIVE_SITE_GUARD: expected production site missing or ambiguous');
 const site=selected[0];
 const paths=[site?.build_settings?.repo_url,site?.build_settings?.repo_path,site?.repo?.repo_path,site?.repo?.repo_url];
 if(!paths.some(p=>norm(p)===norm(repository)))throw Error('ARCHIVE_SITE_GUARD: production repository linkage mismatch');
 const ready=(deploysBySite[expectedSiteId]||[]).filter(d=>d.state==='ready'&&d.context==='production'&&d.branch===branch&&d.commit_ref);
 if(!ready.length)throw Error('ARCHIVE_SITE_GUARD: no ready main production deploy');
 ready.sort((a,b)=>Date.parse(b.published_at||b.updated_at||0)-Date.parse(a.published_at||a.updated_at||0));
 const deploy=ready[0];
 const siteUrl=site.ssl_url||site.url||deploy.ssl_url||deploy.url;
 if(!siteUrl||!/^https:\/\//.test(siteUrl))throw Error('ARCHIVE_SITE_GUARD: verified HTTPS URL required');
 return{site_id:site.id,site_url:siteUrl.replace(/\/$/,'')+'/',deploy_id:deploy.id,deploy_commit_ref:deploy.commit_ref,matched_target_sha:!!targetSha&&deploy.commit_ref===targetSha};
}
