import {Hono,type Context} from 'hono';
import {deleteCookie,getCookie,setCookie} from 'hono/cookie';
import type {ZodType} from 'zod';
import {ApiErrorSchema,CreateAssetInputSchema,CreateJobInputSchema,CreateProjectInputSchema,DashboardSummarySchema,EngineInfoSchema,HealthResponseSchema,LoginInputSchema,SessionResponseSchema,UpdateProjectInputSchema,type Asset,type EngineInfo,type Job,type Project} from '@byga/contracts';
import {SESSION_COOKIE,SESSION_TTL_SECONDS,clearFailures,configuredToken,issueSession,recordFailure,throttleWait,tokenMatches,verifySession,type Bindings} from './auth';
type Variables={requestId:string};type Env={Variables:Variables;Bindings:Bindings};type AppContext=Context<Env>;
export const app=new Hono<Env>();
const projects=new Map<string,Project>(),assets=new Map<string,Asset>(),jobs=new Map<string,Job>();
const now=()=>new Date().toISOString(),makeId=(p:string)=>p+crypto.randomUUID().replace(/-/g,'').slice(0,20);
const engines:EngineInfo[]=[
{key:'hyperframes',name:'HyperFrames',status:'mock-ready',mode:'mock',description:'Simulasi komposisi dan render video.',capabilities:['mock-render']},
{key:'remotion',name:'Remotion',status:'mock-ready',mode:'mock',description:'Simulasi job render React.',capabilities:['mock-render']},
{key:'suara',name:'Suara',status:'blocked',mode:'inactive',description:'Menunggu verifikasi lisensi model dan kontrak runtime.',capabilities:[]},
{key:'mcpnew',name:'MCPNEW',status:'unverified',mode:'inactive',description:'MCP/OAuth runtime belum diverifikasi.',capabilities:[]}];
function fail(c:AppContext,status:400|401|403|404|409|429|503,code:string,message:string){return c.json(ApiErrorSchema.parse({error:{code,message,requestId:c.get('requestId')}}),status);}
async function readBody<T>(request:Request,schema:ZodType<T>):Promise<{ok:true;data:T}|{ok:false}>{try{const p=schema.safeParse(await request.json());return p.success?{ok:true,data:p.data}:{ok:false};}catch{return{ok:false};}}
function activeProject(id:string){return projects.has(id)&&!projects.get(id)?.archived;}
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

app.get('/api/v1/health',c=>c.json(HealthResponseSchema.parse({service:'byga-ai-studio-api',status:'ok',version:'0.2.0',checkedAt:now()})));
app.get('/api/v1/dashboard',c=>c.json(DashboardSummarySchema.parse({projects:projects.size,activeProjects:[...projects.values()].filter(p=>!p.archived).length,assets:assets.size,jobs:jobs.size,runningJobs:[...jobs.values()].filter(j=>j.state==='running'||j.state==='queued').length,succeededJobs:[...jobs.values()].filter(j=>j.state==='succeeded').length,failedJobs:[...jobs.values()].filter(j=>j.state==='failed').length,mode:'mock'})));
app.get('/api/v1/engines',c=>c.json(engines.map(e=>EngineInfoSchema.parse(e))));
app.get('/api/v1/projects',c=>c.json([...projects.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))));
app.post('/api/v1/projects',async c=>{const p=await readBody(c.req.raw,CreateProjectInputSchema);if(!p.ok)return fail(c,400,'VALIDATION_ERROR','Nama project tidak valid.');const t=now();const item:Project={id:makeId('prj_'),name:p.data.name,archived:false,createdAt:t,updatedAt:t};projects.set(item.id,item);return c.json(item,201);});
app.get('/api/v1/projects/:id',c=>{const p=projects.get(c.req.param('id'));return p?c.json(p):fail(c,404,'PROJECT_NOT_FOUND','Project tidak ditemukan.');});
app.patch('/api/v1/projects/:id',async c=>{const old=projects.get(c.req.param('id'));if(!old)return fail(c,404,'PROJECT_NOT_FOUND','Project tidak ditemukan.');const p=await readBody(c.req.raw,UpdateProjectInputSchema);if(!p.ok)return fail(c,400,'VALIDATION_ERROR','Perubahan project tidak valid.');const item={...old,...p.data,updatedAt:now()};projects.set(old.id,item);return c.json(item);});
app.delete('/api/v1/projects/:id',c=>{const old=projects.get(c.req.param('id'));if(!old)return fail(c,404,'PROJECT_NOT_FOUND','Project tidak ditemukan.');const item={...old,archived:true,updatedAt:now()};projects.set(old.id,item);return c.json(item);});
app.get('/api/v1/assets',c=>{const id=c.req.query('projectId');return c.json([...assets.values()].filter(a=>!id||a.projectId===id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));});
app.post('/api/v1/assets',async c=>{const p=await readBody(c.req.raw,CreateAssetInputSchema);if(!p.ok)return fail(c,400,'VALIDATION_ERROR','Metadata asset tidak valid atau ukuran melebihi 25 MiB.');if(!activeProject(p.data.projectId))return fail(c,404,'PROJECT_NOT_FOUND','Project aktif tidak ditemukan.');const item:Asset={id:makeId('ast_'),...p.data,createdAt:now(),storage:'metadata-only'};assets.set(item.id,item);return c.json(item,201);});
app.delete('/api/v1/assets/:id',c=>{const item=assets.get(c.req.param('id'));if(!item)return fail(c,404,'ASSET_NOT_FOUND','Asset tidak ditemukan.');assets.delete(item.id);return c.json({deleted:true,id:item.id});});
app.get('/api/v1/jobs',c=>{const id=c.req.query('projectId');return c.json([...jobs.values()].filter(j=>!id||j.projectId===id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));});
app.post('/api/v1/jobs',async c=>{const p=await readBody(c.req.raw,CreateJobInputSchema);if(!p.ok)return fail(c,400,'VALIDATION_ERROR','Input job tidak valid.');if(!activeProject(p.data.projectId))return fail(c,404,'PROJECT_NOT_FOUND','Project aktif tidak ditemukan.');const engine=engines.find(e=>e.key===p.data.engine);if(!engine||engine.status!=='mock-ready')return fail(c,409,'ENGINE_DISABLED','Engine ini belum tersedia untuk simulasi.');const t=now();const item:Job={id:makeId('job_'),...p.data,state:'queued',createdAt:t,updatedAt:t,providerJobId:null};jobs.set(item.id,item);return c.json(item,201);});
app.post('/api/v1/jobs/:id/advance',c=>{const old=jobs.get(c.req.param('id'));if(!old)return fail(c,404,'JOB_NOT_FOUND','Job tidak ditemukan.');if(['succeeded','failed','cancelled'].includes(old.state))return fail(c,409,'JOB_TERMINAL','Job sudah berada pada status akhir.');const item:Job=old.state==='queued'?{...old,state:'running',updatedAt:now()}:{...old,state:'succeeded',updatedAt:now(),output:{kind:'mock',reference:'mock://'+old.projectId+'/'+old.id}};jobs.set(old.id,item);return c.json(item);});
app.notFound(c=>c.json({error:{code:'NOT_FOUND',message:'Endpoint tidak ditemukan.',requestId:c.get('requestId')}},404));
app.onError((_e,c)=>c.json({error:{code:'INTERNAL_ERROR',message:'Terjadi kesalahan internal.',requestId:c.get('requestId')}},500));
