import {describe,expect,it} from 'vitest';
import {app} from './app';
const TOKEN='a'.repeat(40);
const env:Record<string,string>={STUDIO_ACCESS_TOKEN:TOKEN};
const headers={'content-type':'application/json',authorization:'Bearer '+TOKEN};
describe('Studio API without a D1 binding (memory store)',()=>{
it('reports memory persistence on health',async()=>{const r=await app.request('/api/v1/health',{},env);const b=await r.json() as {persistence?:string};expect(r.status).toBe(200);expect(b.persistence).toBe('memory');});
it('rejects oversized job input',async()=>{const p=await app.request('/api/v1/projects',{method:'POST',headers,body:JSON.stringify({name:'Big'})},env);const project=await p.json() as {id:string};const r=await app.request('/api/v1/jobs',{method:'POST',headers,body:JSON.stringify({projectId:project.id,engine:'remotion',operation:'render',input:{blob:'x'.repeat(70000)}})},env);expect(r.status).toBe(400);});
});
