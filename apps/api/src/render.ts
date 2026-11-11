import {Hono,type Context} from 'hono';
import type {Bindings} from './env';

type Env={Bindings:Bindings};
type Ctx=Context<Env>;
type Row={id:string;project_id:string;engine:string;operation:string;state:string;input_json:string;output_json:string|null;error:string|null;provider_job_id:string|null;created_at:string;updated_at:string};
type Composition={id:string;project_id:string;engine:'hyperframes'|'remotion';current_version:number;archived:number};
type Version={r2_key:string;size:number};
const routes=new Hono<Env>();
const now=()=>new Date().toISOString();
const makeId=()=> 'job_'+crypto.randomUUID().replace(/-/g,'').slice(0,20);
const errorBody=(code:string,message:string)=>({error:{code,message}});
const baseUrl=(value:string|undefined)=>{if(!value)return null;try{const url=new URL(value);return url.protocol==='https:'?url.toString().replace(/\/$/,''):null;}catch{return null;}};
const asJob=(row:Row)=>({id:row.id,projectId:row.project_id,engine:row.engine,operation:row.operation,state:row.state,createdAt:row.created_at,updatedAt:row.updated_at,input:JSON.parse(row.input_json) as Record<string,unknown>,...(row.output_json?{output:JSON.parse(row.output_json) as unknown}:{}),...(row.error?{error:row.error}:{}),providerJobId:row.provider_job_id});
async function jsonBody(c:Ctx){try{return await c.req.json() as Record<string,unknown>;}catch{return null;}}
async function readRow(db:D1Database,id:string){return db.prepare("SELECT id,project_id,engine,operation,state,input_json,output_json,error,provider_job_id,created_at,updated_at FROM jobs WHERE id=? AND operation='video-render'").bind(id).first<Row>();}
async function refreshStatus(db:D1Database,row:Row,base:string){
 if(!row.provider_job_id||['succeeded','failed','cancelled'].includes(row.state))return asJob(row);
 const remotion=row.engine==='remotion',url=remotion?base+'/api/jobs/'+encodeURIComponent(row.provider_job_id):base+'/status/'+encodeURIComponent(row.provider_job_id);
 let response:Response;try{response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(15000)});}catch{return asJob(row);}
 if(!response.ok&&!(row.engine==='hyperframes'&&(response.status===404||response.status===410)))return asJob(row);
 let payload:Record<string,unknown>;try{payload=await response.json() as Record<string,unknown>;}catch{return asJob(row);}
 const raw=String(payload.status??'').toLowerCase();
 const state=remotion?(raw==='done'?'succeeded':raw==='failed'?'failed':raw==='cancelled'?'cancelled':raw==='rendering'?'running':raw==='queued'?'queued':row.state):(raw==='done'?'succeeded':raw==='failed'?'failed':raw==='queued'?'queued':row.state);
 if(state===row.state)return asJob(row);
 const output=state==='succeeded'?JSON.stringify({kind:'video',provider:row.engine,providerJobId:row.provider_job_id,thumbnailAvailable:remotion&&Boolean(payload.thumbUrl)}):null;
 const error=state==='failed'?'Provider render failed.':null,updated=now();
 await db.prepare('UPDATE jobs SET state=?,output_json=?,error=?,updated_at=? WHERE id=?').bind(state,output,error,updated,row.id).run();
 return {...asJob({...row,state,output_json:output,error,updated_at:updated}),...(output?{output:JSON.parse(output)}:{})};
}
routes.post('/compositions/:id/render',async c=>{
 const db=c.env.DB,bucket=c.env.R2_ASSETS;
 if(!db||!bucket)return c.json(errorBody('STORAGE_NOT_CONFIGURED','D1 dan private R2 harus tersedia.'),503);
 const compositionId=c.req.param('id'),body=await jsonBody(c);
 if(!body)return c.json(errorBody('VALIDATION_ERROR','JSON render tidak valid.'),400);
 const composition=await db.prepare('SELECT id,project_id,engine,current_version,archived FROM compositions WHERE id=? AND archived=0').bind(compositionId).first<Composition>();
 if(!composition)return c.json(errorBody('COMPOSITION_NOT_FOUND','Komposisi tidak ditemukan.'),404);
 const version=Number(body.version??composition.current_version),ratio=body.ratio==='16:9'?'16:9':'9:16',quality=['draft','standard','high'].includes(String(body.quality))?String(body.quality):'standard';
 if(!Number.isSafeInteger(version)||version<1)return c.json(errorBody('VALIDATION_ERROR','Versi source tidak valid.'),400);
 const sourceRow=await db.prepare('SELECT r2_key,size FROM composition_versions WHERE composition_id=? AND version=?').bind(compositionId,version).first<Version>();
 if(!sourceRow)return c.json(errorBody('VERSION_NOT_FOUND','Versi source tidak ditemukan.'),404);
 const object=await bucket.get(sourceRow.r2_key);if(!object)return c.json(errorBody('SOURCE_NOT_FOUND','Source tidak tersedia di R2.'),404);
 const source=await object.text();
 if(body.approveLegacyDispatch!==true)return c.json(errorBody('RENDER_APPROVAL_REQUIRED','Konfirmasi eksplisit diperlukan sebelum menjalankan workflow render pada repository legacy.'),409);
 const remotion=composition.engine==='remotion';
 const remotionEnabled=c.env.REMOTION_ENABLED==='1';
 const remotionApproved=c.env.REMOTION_RENDER_APPROVED==='1';
 const remotionCredentialPresent=Boolean(c.env.REMOTION_ACCESS_CODE);
 const hyperframesEnabled=c.env.HYPERFRAMES_ENABLED==='1';
 const hyperframesApproved=c.env.HYPERFRAMES_RENDER_APPROVED==='1';
 const hyperframesCredentialPresent=Boolean(c.env.HF_HEADER_VALUE);
 const enabled=remotion?remotionEnabled&&remotionApproved&&remotionCredentialPresent:hyperframesEnabled&&hyperframesApproved&&hyperframesCredentialPresent;
 const base=baseUrl(remotion?c.env.REMOTION_BASE_URL:c.env.HYPERFRAMES_BASE_URL);
 if(!enabled||!base)return c.json(errorBody('RENDER_PROVIDER_DISABLED',remotion?'Remotion default-off: konfigurasi base URL, access code dan approval server-side belum lengkap.':'HyperFrames default-off: base URL harus diverifikasi dan API key serta approval server-side harus dikonfigurasi.'),503);
 if(remotion&&(!/export\s+default/.test(source)||source.length>100000))return c.json(errorBody('SOURCE_INVALID','Remotion CustomCode wajib memiliki export default dan maksimal 100.000 karakter.'),400);
 if(!remotion&&new TextEncoder().encode(source).byteLength>256*1024)return c.json(errorBody('SOURCE_INVALID','HTML melebihi batas 256 KiB.'),413);
 const props=body.props&&typeof body.props==='object'&&!Array.isArray(body.props)?body.props as Record<string,unknown>:{};
 if(JSON.stringify(props).length>20000)return c.json(errorBody('PROPS_TOO_LARGE','Props melebihi 20.000 karakter.'),413);
 const id=makeId(),created=now(),input={compositionId,version,ratio,quality,props};
 await db.prepare('INSERT INTO jobs (id,project_id,engine,operation,state,input_json,output_json,error,provider_job_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id,composition.project_id,composition.engine,'video-render','submitted',JSON.stringify(input),null,null,null,created,created).run();
 let upstream:Response;
 try{
  const endpoint=remotion?base+'/api/render':base+'/render';
  const payload=remotion?{template:'CustomCode',ratio,props,accessCode:c.env.REMOTION_ACCESS_CODE,code:source}:{id,composition:compositionId,quality,html:source};
  upstream=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',accept:'application/json',...(remotion?{}:{'x-api-key':c.env.HF_HEADER_VALUE!})},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});
 }catch{
  return c.json({error:{code:'RENDER_SUBMISSION_AMBIGUOUS',message:'Koneksi terputus saat submit. Job tetap submitted; periksa riwayat provider sebelum mencoba ulang.',jobId:id}},502);
 }
 if(!upstream.ok){
  await db.prepare("UPDATE jobs SET state='failed',error=?,updated_at=? WHERE id=? AND state='submitted'").bind('Provider menolak render (HTTP '+upstream.status+').',now(),id).run();
  return c.json(errorBody('RENDER_SUBMISSION_FAILED','Provider menolak render. Periksa konfigurasi dan status job.'),502);
 }
 let result:Record<string,unknown>;try{result=await upstream.json() as Record<string,unknown>;}catch{result={};}
 const providerId=remotion?String(result.jobId??''):String(result.id??id);
 if(!providerId||providerId==='undefined')return c.json({error:{code:'RENDER_SUBMISSION_AMBIGUOUS',message:'Provider merespons tanpa job ID yang dapat diverifikasi. Jangan kirim ulang otomatis.',jobId:id}},502);
 await db.prepare("UPDATE jobs SET state='queued',provider_job_id=?,updated_at=? WHERE id=? AND state='submitted'").bind(providerId,now(),id).run();
 const row=await readRow(db,id);
 return c.json(row?asJob(row):{id,projectId:composition.project_id,engine:composition.engine,state:'queued',providerJobId:providerId},202);
});
routes.get('/renders',async c=>{
 const db=c.env.DB;if(!db)return c.json(errorBody('D1_NOT_CONFIGURED','Database D1 belum tersedia.'),503);
 const projectId=c.req.query('projectId');
 const query=projectId?"SELECT id,project_id,engine,operation,state,input_json,output_json,error,provider_job_id,created_at,updated_at FROM jobs WHERE operation='video-render' AND project_id=? ORDER BY created_at DESC LIMIT 100":"SELECT id,project_id,engine,operation,state,input_json,output_json,error,provider_job_id,created_at,updated_at FROM jobs WHERE operation='video-render' ORDER BY created_at DESC LIMIT 100";
 const result=projectId?await db.prepare(query).bind(projectId).all<Row>():await db.prepare(query).all<Row>();
 return c.json(result.results.map(asJob));
});
routes.get('/jobs/:id/render-status',async c=>{
 const db=c.env.DB;if(!db)return c.json(errorBody('D1_NOT_CONFIGURED','Database D1 belum tersedia.'),503);
 const row=await readRow(db,c.req.param('id'));if(!row)return c.json(errorBody('JOB_NOT_FOUND','Render job tidak ditemukan.'),404);
 const base=baseUrl(row.engine==='remotion'?c.env.REMOTION_BASE_URL:c.env.HYPERFRAMES_BASE_URL);
 return c.json(base?await refreshStatus(db,row,base):asJob(row));
});
async function proxy(c:Ctx,kind:'video'|'thumbnail'){
 const db=c.env.DB;if(!db)return c.json(errorBody('D1_NOT_CONFIGURED','Database D1 belum tersedia.'),503);
 const row=await db.prepare("SELECT id,engine,state,provider_job_id,output_json FROM jobs WHERE id=? AND operation='video-render'").bind(c.req.param('id')).first<{id:string;engine:string;state:string;provider_job_id:string|null;output_json:string|null}>();
 if(!row||row.state!=='succeeded'||!row.provider_job_id||!row.output_json)return c.json(errorBody('RENDER_OUTPUT_NOT_READY','Media render belum tersedia.'),409);
 if(kind==='thumbnail'&&row.engine!=='remotion')return c.json(errorBody('THUMBNAIL_NOT_AVAILABLE','Thumbnail tidak tersedia untuk engine ini.'),404);
 const base=baseUrl(row.engine==='remotion'?c.env.REMOTION_BASE_URL:c.env.HYPERFRAMES_BASE_URL);
 if(!base)return c.json(errorBody('PROVIDER_NOT_CONFIGURED','Provider base URL belum dikonfigurasi.'),503);
 const path=kind==='thumbnail'?'/thumbs/'+encodeURIComponent(row.provider_job_id)+'.jpg':row.engine==='remotion'?'/files/'+encodeURIComponent(row.provider_job_id)+'.mp4':'/video/'+encodeURIComponent(row.provider_job_id);
 let upstream:Response;
 try{upstream=await fetch(base+path,{headers:{...(kind==='video'&&c.req.header('range')?{range:c.req.header('range')!}:{})},signal:AbortSignal.timeout(30000)});}catch{return c.json(errorBody('PROVIDER_MEDIA_UNAVAILABLE','Provider media tidak dapat dijangkau.'),502);}
 if(upstream.status!==200&&upstream.status!==206)return c.json(errorBody('PROVIDER_MEDIA_UNAVAILABLE','Media belum tersedia dari provider.'),upstream.status===404?404:502);
 const headers=new Headers({'content-type':kind==='thumbnail'?'image/jpeg':'video/mp4','cache-control':'private, no-store','x-content-type-options':'nosniff','content-disposition':kind==='video'?'inline; filename="byga-'+row.id+'.mp4"':'inline'});
 for(const name of ['content-length','content-range','accept-ranges']){const value=upstream.headers.get(name);if(value)headers.set(name,value);}
 return new Response(upstream.body,{status:upstream.status,headers});
}
routes.get('/jobs/:id/video',c=>proxy(c,'video'));
routes.get('/jobs/:id/thumbnail',c=>proxy(c,'thumbnail'));
export {routes as renderRoutes};
