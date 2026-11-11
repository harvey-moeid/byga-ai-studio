import {Hono} from 'hono';
import type {Bindings} from './env';

type Env={Bindings:Bindings};
type CompositionRow={id:string;project_id:string;engine:'hyperframes'|'remotion';name:string;current_version:number;archived:number;created_at:string;updated_at:string};
type VersionRow={id:string;composition_id:string;version:number;r2_key:string;size:number;sha256:string;note:string|null;created_at:string};
const routes=new Hono<Env>();
const jsonError=(message:string,code:string,status:400|404|409|413|503)=>({error:{code,message}});
const now=()=>new Date().toISOString();
const makeId=(prefix:string)=>prefix+crypto.randomUUID().replace(/-/g,'').slice(0,20);
const validProject=(id:string)=>/^prj_[a-zA-Z0-9_-]{8,64}$/.test(id);
const validComposition=(id:string)=>/^cmp_[a-zA-Z0-9_-]{8,64}$/.test(id);
const cleanName=(value:string)=>value.normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,120);
function sourceRules(engine:string,source:string){if(engine==='hyperframes')return source.length>0&&new TextEncoder().encode(source).byteLength<=256*1024?null:'HyperFrames source wajib diisi dan maksimal 256 KiB.';if(engine==='remotion')return source.length>0&&source.length<=100000&&/export\s+default/.test(source)?null:'Remotion source wajib memiliki export default dan maksimal 100.000 karakter.';return 'Engine tidak didukung.';}
async function digest(source:string){const bytes=new TextEncoder().encode(source);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');}
async function projectExists(db:D1Database,id:string){return !!await db.prepare('SELECT id FROM projects WHERE id=? AND archived=0').bind(id).first();}
async function readJson(c:any){try{return await c.req.json() as Record<string,unknown>;}catch{return null;}}
function serialize(row:CompositionRow){return{id:row.id,projectId:row.project_id,engine:row.engine,name:row.name,currentVersion:row.current_version,archived:row.archived===1,createdAt:row.created_at,updatedAt:row.updated_at};}
function versionView(row:VersionRow){return{id:row.id,compositionId:row.composition_id,version:row.version,size:row.size,sha256:row.sha256,note:row.note,createdAt:row.created_at};}

routes.get('/projects/:id/compositions',async c=>{
 const db=c.env.DB;if(!db)return c.json(jsonError('Database D1 belum tersedia.','D1_NOT_CONFIGURED',503),503);
 const projectId=c.req.param('id');if(!validProject(projectId)||!await projectExists(db,projectId))return c.json(jsonError('Project aktif tidak ditemukan.','PROJECT_NOT_FOUND',404),404);
 const {results}=await db.prepare('SELECT id,project_id,engine,name,current_version,archived,created_at,updated_at FROM compositions WHERE project_id=? AND archived=0 ORDER BY updated_at DESC LIMIT 100').bind(projectId).all<CompositionRow>();
 return c.json(results.map(serialize));
});
routes.post('/projects/:id/compositions',async c=>{
 const db=c.env.DB,bucket=c.env.R2_ASSETS;if(!db||!bucket)return c.json(jsonError('D1 dan private R2 harus tersedia.','STORAGE_NOT_CONFIGURED',503),503);
 const projectId=c.req.param('id');if(!validProject(projectId)||!await projectExists(db,projectId))return c.json(jsonError('Project aktif tidak ditemukan.','PROJECT_NOT_FOUND',404),404);
 const body=await readJson(c);if(!body)return c.json(jsonError('JSON tidak valid.','VALIDATION_ERROR',400),400);
 const engine=body.engine,name=typeof body.name==='string'?cleanName(body.name):'',source=typeof body.source==='string'?body.source:'';
 if(!['hyperframes','remotion'].includes(String(engine))||!name)return c.json(jsonError('Engine atau nama komposisi tidak valid.','VALIDATION_ERROR',400),400);
 const issue=sourceRules(String(engine),source);if(issue)return c.json(jsonError(issue,'SOURCE_INVALID',400),400);
 const id=makeId('cmp_'),versionId=makeId('cv_'),created=now(),ext=engine==='hyperframes'?'html':'tsx',key='compositions/'+projectId+'/'+id+'/v1.'+ext,sha=await digest(source),bytes=new TextEncoder().encode(source);
 try{await bucket.put(key,bytes,{httpMetadata:{contentType:engine==='hyperframes'?'text/html; charset=utf-8':'text/plain; charset=utf-8'},customMetadata:{projectId,compositionId:id,version:'1',sha256:sha}});await db.batch([db.prepare('INSERT INTO compositions (id,project_id,engine,name,current_version,archived,created_at,updated_at) VALUES (?,?,?,?,1,0,?,?)').bind(id,projectId,engine,name,created,created),db.prepare('INSERT INTO composition_versions (id,composition_id,version,r2_key,size,sha256,note,created_at) VALUES (?,?,1,?,?,?,?,?)').bind(versionId,id,key,bytes.byteLength,sha,typeof body.note==='string'?body.note.slice(0,500):null,created)]);}
 catch{try{await bucket.delete(key);}catch{}return c.json(jsonError('Komposisi gagal disimpan. Tidak ada engine render yang dipanggil.','COMPOSITION_SAVE_FAILED',503),503);}
 return c.json({id,projectId,engine,name,currentVersion:1,archived:false,createdAt:created,updatedAt:created,version:{id:versionId,version:1,size:bytes.byteLength,sha256:sha,note:typeof body.note==='string'?body.note.slice(0,500):null,createdAt:created}},201);
});
routes.get('/compositions/:id',async c=>{
 const db=c.env.DB;if(!db)return c.json(jsonError('Database D1 belum tersedia.','D1_NOT_CONFIGURED',503),503);
 const id=c.req.param('id');if(!validComposition(id))return c.json(jsonError('Komposisi tidak ditemukan.','COMPOSITION_NOT_FOUND',404),404);
 const row=await db.prepare('SELECT id,project_id,engine,name,current_version,archived,created_at,updated_at FROM compositions WHERE id=?').bind(id).first<CompositionRow>();
 if(!row)return c.json(jsonError('Komposisi tidak ditemukan.','COMPOSITION_NOT_FOUND',404),404);
 const {results}=await db.prepare('SELECT id,composition_id,version,r2_key,size,sha256,note,created_at FROM composition_versions WHERE composition_id=? ORDER BY version DESC').bind(id).all<VersionRow>();
 return c.json({...serialize(row),versions:results.map(versionView)});
});
routes.patch('/compositions/:id',async c=>{
 const db=c.env.DB;if(!db)return c.json(jsonError('Database D1 belum tersedia.','D1_NOT_CONFIGURED',503),503);
 const id=c.req.param('id'),body=await readJson(c);if(!validComposition(id)||!body)return c.json(jsonError('Permintaan tidak valid.','VALIDATION_ERROR',400),400);
 const old=await db.prepare('SELECT id,project_id,engine,name,current_version,archived,created_at,updated_at FROM compositions WHERE id=?').bind(id).first<CompositionRow>();if(!old)return c.json(jsonError('Komposisi tidak ditemukan.','COMPOSITION_NOT_FOUND',404),404);
 const name=typeof body.name==='string'?cleanName(body.name):old.name;if(!name)return c.json(jsonError('Nama wajib diisi.','VALIDATION_ERROR',400),400);
 const archived=typeof body.archived==='boolean'?(body.archived?1:0):old.archived,updated=now();
 await db.prepare('UPDATE compositions SET name=?,archived=?,updated_at=? WHERE id=?').bind(name,archived,updated,id).run();
 const next={...old,name,archived,updated_at:updated};return c.json(serialize(next));
});
routes.delete('/compositions/:id',async c=>{
 const db=c.env.DB;if(!db)return c.json(jsonError('Database D1 belum tersedia.','D1_NOT_CONFIGURED',503),503);
 const id=c.req.param('id');if(!validComposition(id))return c.json(jsonError('Komposisi tidak ditemukan.','COMPOSITION_NOT_FOUND',404),404);
 const result=await db.prepare('UPDATE compositions SET archived=1,updated_at=? WHERE id=? AND archived=0').bind(now(),id).run();
 if((result.meta.changes??0)===0)return c.json(jsonError('Komposisi tidak ditemukan atau sudah diarsipkan.','COMPOSITION_NOT_FOUND',404),404);
 return c.json({archived:true,id});
});
routes.post('/compositions/:id/versions',async c=>{
 const db=c.env.DB,bucket=c.env.R2_ASSETS;if(!db||!bucket)return c.json(jsonError('D1 dan private R2 harus tersedia.','STORAGE_NOT_CONFIGURED',503),503);
 const id=c.req.param('id'),body=await readJson(c);if(!validComposition(id)||!body)return c.json(jsonError('Permintaan tidak valid.','VALIDATION_ERROR',400),400);
 const row=await db.prepare('SELECT id,project_id,engine,name,current_version,archived,created_at,updated_at FROM compositions WHERE id=? AND archived=0').bind(id).first<CompositionRow>();if(!row)return c.json(jsonError('Komposisi tidak ditemukan.','COMPOSITION_NOT_FOUND',404),404);
 const source=typeof body.source==='string'?body.source:'',issue=sourceRules(row.engine,source);if(issue)return c.json(jsonError(issue,'SOURCE_INVALID',400),400);
 const version=row.current_version+1,ext=row.engine==='hyperframes'?'html':'tsx',key='compositions/'+row.project_id+'/'+id+'/v'+version+'.'+ext,sha=await digest(source),bytes=new TextEncoder().encode(source),created=now(),versionId=makeId('cv_');
 try{await bucket.put(key,bytes,{httpMetadata:{contentType:row.engine==='hyperframes'?'text/html; charset=utf-8':'text/plain; charset=utf-8'},customMetadata:{projectId:row.project_id,compositionId:id,version:String(version),sha256:sha}});const update=await db.prepare('UPDATE compositions SET current_version=?,updated_at=? WHERE id=? AND current_version=? AND archived=0').bind(version,created,id,row.current_version).run();if((update.meta.changes??0)===0){await bucket.delete(key);return c.json(jsonError('Versi berubah di sesi lain. Muat ulang sebelum menyimpan.','VERSION_CONFLICT',409),409);}await db.prepare('INSERT INTO composition_versions (id,composition_id,version,r2_key,size,sha256,note,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(versionId,id,version,key,bytes.byteLength,sha,typeof body.note==='string'?body.note.slice(0,500):null,created).run();}
 catch{return c.json(jsonError('Versi baru gagal disimpan. Periksa status sebelum mencoba ulang.','VERSION_SAVE_FAILED',503),503);}
 return c.json({id:versionId,compositionId:id,version,size:bytes.byteLength,sha256:sha,note:typeof body.note==='string'?body.note.slice(0,500):null,createdAt:created},201);
});
routes.get('/compositions/:id/versions/:version/content',async c=>{
 const db=c.env.DB,bucket=c.env.R2_ASSETS;if(!db||!bucket)return c.json(jsonError('D1 dan private R2 harus tersedia.','STORAGE_NOT_CONFIGURED',503),503);
 const id=c.req.param('id'),version=Number(c.req.param('version'));if(!validComposition(id)||!Number.isSafeInteger(version)||version<1)return c.json(jsonError('Versi tidak valid.','VALIDATION_ERROR',400),400);
 const row=await db.prepare('SELECT v.r2_key,v.size,c.engine FROM composition_versions v JOIN compositions c ON c.id=v.composition_id WHERE v.composition_id=? AND v.version=?').bind(id,version).first<{r2_key:string;size:number;engine:string}>();if(!row)return c.json(jsonError('Versi tidak ditemukan.','VERSION_NOT_FOUND',404),404);
 const object=await bucket.get(row.r2_key);if(!object)return c.json(jsonError('Source tidak ditemukan di R2.','SOURCE_NOT_FOUND',404),404);
 return new Response(object.body,{headers:{'content-type':row.engine==='hyperframes'?'text/html; charset=utf-8':'text/plain; charset=utf-8','content-length':String(row.size),'cache-control':'private, no-store','x-content-type-options':'nosniff','content-disposition':'attachment; filename="composition-v'+version+'.'+(row.engine==='hyperframes'?'html':'tsx')+'"'}});
});
routes.post('/compositions/:id/render',async c=>{
 return c.json(jsonError('Render provider masih dinonaktifkan. Integrasi Remotion/HyperFrames harus diverifikasi dan diaktifkan secara eksplisit sebelum dispatch. Source komposisi tetap aman tersimpan di Studio.','RENDER_PROVIDER_DISABLED',503),503);
});
export {routes as compositionRoutes};
