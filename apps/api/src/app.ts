import {Hono,type Context} from 'hono';
import {deleteCookie,getCookie,setCookie} from 'hono/cookie';
import type {ZodType} from 'zod';
import {ApiErrorSchema,CreateAssetInputSchema,CreateJobInputSchema,CreateProjectInputSchema,DashboardSummarySchema,EngineInfoSchema,HealthResponseSchema,LoginInputSchema,SessionResponseSchema,UpdateProjectInputSchema,type Asset,type EngineInfo,type Job,type Project} from '@byga/contracts';
import {SESSION_COOKIE,SESSION_TTL_SECONDS,clearFailures,configuredToken,issueSession,recordFailure,throttleWait,tokenMatches,verifySession} from './auth';
import type {Bindings} from './env';
import {getStore,type Store} from './store';
import {SuaraAdapter,SuaraAdapterError,type SuaraMode} from './adapters/suara';
type Variables={requestId:string};type Env={Variables:Variables;Bindings:Bindings};type AppContext=Context<Env>;
export const app=new Hono<Env>();
const MAX_JOB_INPUT_BYTES=64*1024;
const now=()=>new Date().toISOString(),makeId=(p:string)=>p+crypto.randomUUID().replace(/-/g,'').slice(0,20);
const engines:EngineInfo[]=[
{key:'hyperframes',name:'HyperFrames',status:'mock-ready',mode:'mock',description:'Simulasi komposisi dan render video.',capabilities:['mock-render']},
{key:'remotion',name:'Remotion',status:'mock-ready',mode:'mock',description:'Simulasi job render React.',capabilities:['mock-render']},
{key:'suara',name:'Suara',status:'disabled',mode:'provider',description:'TTS pribadi non-komersial melalui OmniVoice; aktifkan konfigurasi server.',capabilities:['text-to-speech','voice-design','voice-clone','mp3','wav','async-jobs']},
{key:'mcpnew',name:'MCPNEW',status:'unverified',mode:'inactive',description:'MCP/OAuth runtime belum diverifikasi.',capabilities:[]}];
function fail(c:AppContext,status:400|401|403|404|409|413|429|502|503,code:string,message:string){return c.json(ApiErrorSchema.parse({error:{code,message,requestId:c.get('requestId')}}),status);}
async function readBody<T>(request:Request,schema:ZodType<T>):Promise<{ok:true;data:T}|{ok:false}>{try{const p=schema.safeParse(await request.json());return p.success?{ok:true,data:p.data}:{ok:false};}catch{return{ok:false};}}
async function activeProject(store:Store,id:string){const p=await store.getProject(id);return p!==null&&!p.archived;}
const suaraAdapter=(env:Bindings)=>new SuaraAdapter({enabled:env.SUARA_ENABLED==='true',baseUrl:env.SUARA_BASE_URL,passcode:env.SUARA_APP_PASSCODE});
const suaraState=(status:string)=>status==='done'?'succeeded':status==='failed'?'failed':status==='running'?'running':'queued';
async function syncSuaraJob(store:Store,old:Job,adapter:SuaraAdapter):Promise<Job>{
if(old.engine!=='suara'||!old.providerJobId||['succeeded','failed','cancelled'].includes(old.state))return old;
try{
const provider=await adapter.getJob(old.providerJobId),state=suaraState(provider.status);
const updated:Job={...old,state:state as Job['state'],updatedAt:now(),...(provider.status==='done'?{output:{kind:'audio',provider:'suara',formats:['mp3','wav'],...(provider.audioSec===null?{}:{durationSeconds:provider.audioSec})}}:{}),...(provider.status==='failed'?{error:provider.error??'Suara render failed.'}:{})};
if(state!==old.state||JSON.stringify(updated.output)!==JSON.stringify(old.output)||updated.error!==old.error)await store.updateJob(updated,old.state);
return updated;
}catch{return old;}
}
app.use('*',async(c,next)=>{const id='req_'+crypto.randomUUID();c.set('requestId',id);c.header('X-Request-Id',id);c.header('X-Content-Type-Options','nosniff');c.header('Referrer-Policy','strict-origin-when-cross-origin');c.header('X-Frame-Options','DENY');c.header('Cache-Control','no-store');await next();});

// --- Authentication (single operator, server-side secret; see docs/PHASE-3-AUTH.md) ---
const SAFE_METHODS=new Set(['GET','HEAD','OPTIONS']);
const PUBLIC_PATHS=new Set(['/api/v1/health','/api/v1/auth/login','/api/v1/auth/logout','/api/v1/auth/session']);
async function sessionInfo(c:AppContext){const token=configuredToken(c.env);const exp=token?await verifySession(getCookie(c,SESSION_COOKIE),token):null;return SessionResponseSchema.parse({authenticated:exp!==null,configured:token!==null,expiresAt:exp===null?null:new Date(exp*1000).toISOString()});}
app.use('/api/v1/*',async(c,next)=>{
if(PUBLIC_PATHS.has(c.req.path)){await next();return;}
const token=configuredToken(c.env);
if(!token)return fail(c,503,'AUTH_NOT_CONFIGURED','Autentikasi Studio belum dikonfigurasi di server.');
const bearer=/^Bearer\s+(\S+)$/i.exec(c.req.header('authorization')??'')?.[1];
if(bearer&&await tokenMatches(bearer,token)){await next();return;}
if(await verifySession(getCookie(c,SESSION_COOKIE),token)!==null){
if(!SAFE_METHODS.has(c.req.method)&&c.req.header('sec-fetch-site')!=='same-origin')return fail(c,403,'CSRF_REJECTED','Permintaan lintas-origin ditolak.');
await next();return;}
c.header('WWW-Authenticate','Bearer');
return fail(c,401,'UNAUTHENTICATED','Autentikasi diperlukan.');});
app.get('/api/v1/auth/session',async c=>c.json(await sessionInfo(c)));
app.post('/api/v1/auth/login',async c=>{
const token=configuredToken(c.env);
if(!token)return fail(c,503,'AUTH_NOT_CONFIGURED','Autentikasi Studio belum dikonfigurasi di server.');
const key=c.req.header('cf-connecting-ip')??'unknown';
const wait=throttleWait(key);
if(wait>0){c.header('Retry-After',String(wait));return fail(c,429,'TOO_MANY_ATTEMPTS','Terlalu banyak percobaan. Coba lagi nanti.');}
const p=await readBody(c.req.raw,LoginInputSchema);
if(!p.ok||!(await tokenMatches(p.data.token,token))){recordFailure(key);return fail(c,401,'INVALID_CREDENTIALS','Token akses tidak valid.');}
clearFailures(key);
const session=await issueSession(token);
setCookie(c,SESSION_COOKIE,session.value,{httpOnly:true,secure:true,sameSite:'Strict',path:'/',maxAge:SESSION_TTL_SECONDS});
return c.json(SessionResponseSchema.parse({authenticated:true,configured:true,expiresAt:new Date(session.exp*1000).toISOString()}));});
app.post('/api/v1/auth/logout',c=>{deleteCookie(c,SESSION_COOKIE,{path:'/',secure:true});return c.json(SessionResponseSchema.parse({authenticated:false,configured:configuredToken(c.env)!==null,expiresAt:null}));});

// --- Platform routes (storage via getStore: D1 when bound, otherwise in-memory) ---
app.get('/api/v1/health',c=>c.json(HealthResponseSchema.parse({service:'byga-ai-studio-api',status:'ok',version:'0.2.0',persistence:getStore(c.env).kind,checkedAt:now()})));
app.get('/api/v1/dashboard',async c=>c.json(DashboardSummarySchema.parse({...await getStore(c.env).counts(),mode:'mock'})));
app.get('/api/v1/engines',c=>{const adapter=suaraAdapter(c.env),configured=adapter.configured;const suara:EngineInfo={...engines.find(e=>e.key==='suara')!,status:configured?'configured':'disabled',description:configured?'Konfigurasi server Suara tersedia. Konektivitas API dan runner CPU belum diuji.':'Integrasi Suara belum diaktifkan atau konfigurasi server belum lengkap.',capabilities:configured?['text-to-speech','voice-design','voice-clone','mp3','wav','async-jobs']:[]};return c.json([...engines.filter(e=>e.key!=='suara'),EngineInfoSchema.parse(suara)]);});
app.get('/api/v1/engines/suara/health',async c=>{const health=await suaraAdapter(c.env).healthCheck();return c.json(health,health.status==='unreachable'?502:200);});
app.get('/api/v1/projects',async c=>c.json(await getStore(c.env).listProjects()));
app.post('/api/v1/projects',async c=>{const store=getStore(c.env);const p=await readBody(c.req.raw,CreateProjectInputSchema);if(!p.ok)return fail(c,400,'VALIDATION_ERROR','Nama project tidak valid.');const t=now();const item:Project={id:makeId('prj_'),name:p.data.name,archived:false,createdAt:t,updatedAt:t};await store.createProject(item);return c.json(item,201);});
app.get('/api/v1/projects/:id',async c=>{const p=await getStore(c.env).getProject(c.req.param('id'));return p?c.json(p):fail(c,404,'PROJECT_NOT_FOUND','Project tidak ditemukan.');});
app.patch('/api/v1/projects/:id',async c=>{const store=getStore(c.env);const old=await store.getProject(c.req.param('id'));if(!old)return fail(c,404,'PROJECT_NOT_FOUND','Project tidak ditemukan.');const p=await readBody(c.req.raw,UpdateProjectInputSchema);if(!p.ok)return fail(c,400,'VALIDATION_ERROR','Perubahan project tidak valid.');const item:Project={...old,...p.data,updatedAt:now()};await store.updateProject(item);return c.json(item);});
app.delete('/api/v1/projects/:id',async c=>{const store=getStore(c.env);const old=await store.getProject(c.req.param('id'));if(!old)return fail(c,404,'PROJECT_NOT_FOUND','Project tidak ditemukan.');const item:Project={...old,archived:true,updatedAt:now()};await store.updateProject(item);return c.json(item);});
app.get('/api/v1/assets',async c=>c.json(await getStore(c.env).listAssets(c.req.query('projectId')||undefined)));
app.post('/api/v1/assets',async c=>{const store=getStore(c.env);const p=await readBody(c.req.raw,CreateAssetInputSchema);if(!p.ok)return fail(c,400,'VALIDATION_ERROR','Metadata asset tidak valid atau ukuran melebihi 25 MiB.');if(!await activeProject(store,p.data.projectId))return fail(c,404,'PROJECT_NOT_FOUND','Project aktif tidak ditemukan.');const item:Asset={id:makeId('ast_'),...p.data,createdAt:now(),storage:'metadata-only'};await store.createAsset(item);return c.json(item,201);});
app.delete('/api/v1/assets/:id',async c=>{const id=c.req.param('id');if(!await getStore(c.env).deleteAsset(id))return fail(c,404,'ASSET_NOT_FOUND','Asset tidak ditemukan.');return c.json({deleted:true,id});});
app.post('/api/v1/suara/jobs',async c=>{
const store=getStore(c.env),adapter=suaraAdapter(c.env);
if(!adapter.configured)return fail(c,503,'SUARA_NOT_CONFIGURED','Integrasi Suara belum diaktifkan atau konfigurasi server belum lengkap.');
const length=Number(c.req.header('content-length')??0);
if(length>11*1024*1024)return fail(c,413,'SUARA_INPUT_TOO_LARGE','Permintaan melebihi batas 11 MiB.');
let form:FormData;try{form=await c.req.formData();}catch{return fail(c,400,'VALIDATION_ERROR','Form audio tidak valid.');}
const projectId=String(form.get('projectId')??'');
if(!await activeProject(store,projectId))return fail(c,404,'PROJECT_NOT_FOUND','Project aktif tidak ditemukan.');
const text=String(form.get('text')??'').trim(),mode=String(form.get('mode')??'auto') as SuaraMode,language=String(form.get('language')??'id').trim(),numStep=Number(form.get('numStep')??16),speed=Number(form.get('speed')??1),instruct=String(form.get('instruct')??'').trim(),refText=String(form.get('refText')??'').trim(),consent=form.get('consent')==='true',refValue=form.get('ref');
if(!text||text.length>1500)return fail(c,400,'VALIDATION_ERROR','Teks wajib diisi dan maksimal 1500 karakter.');
if(!['auto','clone','design'].includes(mode))return fail(c,400,'VALIDATION_ERROR','Mode Suara tidak valid.');
if(!/^[a-z]{2,3}$/.test(language))return fail(c,400,'VALIDATION_ERROR','Kode bahasa tidak valid.');
if(![8,16,32].includes(numStep)||!(speed>=0.5&&speed<=2)||!Number.isFinite(speed))return fail(c,400,'VALIDATION_ERROR','Pengaturan langkah atau kecepatan tidak valid.');
if(refText.length>500)return fail(c,400,'VALIDATION_ERROR','Transkrip referensi maksimal 500 karakter.');
let ref:File|undefined;
if(mode==='clone'){if(!consent)return fail(c,400,'VOICE_CONSENT_REQUIRED','Konfirmasi izin penggunaan suara referensi wajib diaktifkan.');if(!(refValue instanceof File)||refValue.size===0)return fail(c,400,'REFERENCE_AUDIO_REQUIRED','Audio referensi wajib diunggah untuk mode clone.');if(refValue.size>10*1024*1024)return fail(c,413,'REFERENCE_AUDIO_TOO_LARGE','Audio referensi maksimal 10 MiB.');ref=refValue;}
if(mode==='design'&&!instruct)return fail(c,400,'VOICE_DESIGN_REQUIRED','Deskripsi karakter suara wajib diisi untuk mode design.');
const nowAt=now(),id=makeId('job_'),input={text,mode,language,numStep,speed,instruct,refText,hasReferenceAudio:Boolean(ref),personalNonCommercial:true};
const item:Job={id,projectId,engine:'suara',operation:'text-to-speech',state:'submitted',createdAt:nowAt,updatedAt:nowAt,input,providerJobId:null};
await store.createJob(item);
try{
const submitted=await adapter.submitJob({text,mode,language,numStep:numStep as 8|16|32,speed,instruct,refText,consent,ref});
await store.updateProviderJobId(id,submitted.providerJobId);
const queued:Job={...item,state:'queued',providerJobId:submitted.providerJobId,updatedAt:now()};
await store.updateJob(queued,'submitted');
return c.json(queued,201);
}catch(error){
const failed:Job={...item,state:'failed',error:error instanceof SuaraAdapterError?error.message:'Suara submission failed.',updatedAt:now()};
await store.updateJob(failed,'submitted');
return fail(c,502,'SUARA_SUBMISSION_FAILED','Suara tidak menerima job. Periksa status job sebelum mengirim ulang.');
}
});
app.get('/api/v1/jobs/:id',async c=>{
const store=getStore(c.env),old=await store.getJob(c.req.param('id'));
if(!old)return fail(c,404,'JOB_NOT_FOUND','Job tidak ditemukan.');
return c.json(await syncSuaraJob(store,old,suaraAdapter(c.env)));
});
app.get('/api/v1/jobs/:id/audio',async c=>{
const job=await getStore(c.env).getJob(c.req.param('id'));
if(!job)return fail(c,404,'JOB_NOT_FOUND','Job tidak ditemukan.');
if(job.engine!=='suara'||job.state!=='succeeded'||!job.providerJobId)return fail(c,409,'AUDIO_NOT_READY','Audio belum selesai dibuat.');
const format=c.req.query('format')==='wav'?'wav':'mp3';
try{const audio=await suaraAdapter(c.env).getAudio(job.providerJobId,format);return new Response(audio.body,{status:200,headers:{'content-type':format==='mp3'?'audio/mpeg':'audio/wav','cache-control':'private, no-store','x-content-type-options':'nosniff',...(format==='wav'?{'content-disposition':`attachment; filename="byga-${job.id}.wav"`}:{})}});}
catch(error){const status=error instanceof SuaraAdapterError?error.status:502;return fail(c,status===404?404:502,'SUARA_AUDIO_UNAVAILABLE','File audio belum tersedia dari Suara.');}
});
app.get('/api/v1/jobs',async c=>{
const store=getStore(c.env),items=await store.listJobs(c.req.query('projectId')||undefined),adapter=suaraAdapter(c.env);
return c.json(await Promise.all(items.map(job=>syncSuaraJob(store,job,adapter))));
});
app.post('/api/v1/jobs',async c=>{const store=getStore(c.env);const p=await readBody(c.req.raw,CreateJobInputSchema);if(!p.ok)return fail(c,400,'VALIDATION_ERROR','Input job tidak valid.');if(JSON.stringify(p.data.input).length>MAX_JOB_INPUT_BYTES)return fail(c,400,'VALIDATION_ERROR','Input job terlalu besar (maks 64 KiB).');if(!await activeProject(store,p.data.projectId))return fail(c,404,'PROJECT_NOT_FOUND','Project aktif tidak ditemukan.');const engine=engines.find(e=>e.key===p.data.engine);if(!engine||engine.status!=='mock-ready')return fail(c,409,'ENGINE_DISABLED','Engine ini belum tersedia untuk simulasi.');const t=now();const item:Job={id:makeId('job_'),...p.data,state:'queued',createdAt:t,updatedAt:t,providerJobId:null};await store.createJob(item);return c.json(item,201);});
app.post('/api/v1/jobs/:id/advance',async c=>{const store=getStore(c.env);const old=await store.getJob(c.req.param('id'));if(!old)return fail(c,404,'JOB_NOT_FOUND','Job tidak ditemukan.');if(old.engine==='suara')return fail(c,409,'PROVIDER_JOB_MANAGED','Status job Suara dikelola oleh provider dan tidak dapat dimajukan secara manual.');if(['succeeded','failed','cancelled'].includes(old.state))return fail(c,409,'JOB_TERMINAL','Job sudah berada pada status akhir.');const item:Job=old.state==='queued'?{...old,state:'running',updatedAt:now()}:{...old,state:'succeeded',updatedAt:now(),output:{kind:'mock',reference:'mock://'+old.projectId+'/'+old.id}};if(!await store.updateJob(item,old.state))return fail(c,409,'JOB_CONFLICT','Job diubah oleh permintaan lain. Muat ulang lalu coba lagi.');return c.json(item);});
app.notFound(c=>c.json({error:{code:'NOT_FOUND',message:'Endpoint tidak ditemukan.',requestId:c.get('requestId')}},404));
app.onError((_e,c)=>c.json({error:{code:'INTERNAL_ERROR',message:'Terjadi kesalahan internal.',requestId:c.get('requestId')}},500));
