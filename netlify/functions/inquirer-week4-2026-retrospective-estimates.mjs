import {gunzipSync} from 'node:zlib';
// Source-traced retrospective estimates derived exclusively from Sleeper Weeks 1-3.
// These are not authentic pregame projections; never use to claim a projected upset.
const encoded='H4sIAAAAAAAAA63SzW6cMBQF4FdBd20Q1/+4j9FlVY0cfCdjdcAIOxqp0bx7BU0lSBMJabJiYz7OOfgVMvmcRnC85ZrBjegXOMlgoHJJARxMc0xz1adhulKhUC0ncoW1+FZlP1A9pRxLTGN1ibmkOfb+Wg0Uoh+rVC4032ImYPDkM4VTGk/r++B+IONM/GSQ08vcEzj4fiWaaPOpejla5eJLBga5T3Mcn0/54rnS4CB0SnMjUJ+xP5NSIejAtTChfQqd8DxYbXtjghUyUNsRYQiSn71Hib1XAhhQLnHwhTK4V0BpuuU5pTiWDK5rtFlzx/xvhvrZD7SG8UvGU46/CZxg0KfxHAONa5Gl/csAdwZctGZLomiUOGTyd+Y13VZQGtyCspEb7u1P1H/n/48074O+odJqvUUfba2skrvWuuHykdaq4/sZ26Y9NuPnIY3am3Xb8EMkfpzRKL0vbRt8dEiLQn91747znWkP1v5cxNba3aVE3qhHTVTWfvlFR7Si3arqsKm1/si83/8Aci5IX0EFAAA=';
let cached;
export default function week4RetrospectiveEstimates(){return cached??=(JSON.parse(gunzipSync(Buffer.from(encoded,'base64')).toString('utf8')))}
