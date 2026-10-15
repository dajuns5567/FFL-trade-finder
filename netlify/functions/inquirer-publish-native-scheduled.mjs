import scheduledHandler from './inquirer-publish-scheduled.mjs';
import {trustedServerRequest} from './privileged-write.mjs';
import {isReadOnlyPreview} from './preview-read-only.mjs';
// Netlify scheduled functions are not exposed as HTTP URLs.
export const config={schedule:'0 * * * *'};
export default async (req,platformContext)=>{
 const context=String(platformContext?.deploy?.context||process.env.CONTEXT||process.env.NETLIFY_CONTEXT||'').toLowerCase();
 if(context!=='production'||isReadOnlyPreview(req,platformContext))return new Response(null,{status:403});
 return scheduledHandler(trustedServerRequest(req.url,{},platformContext));
};
