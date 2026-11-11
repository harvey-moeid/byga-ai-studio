// D1Store tests run the real migration SQL and the real store against SQLite (node:sqlite),
// with a thin shim for the D1 prepare/bind/run/all/first surface.
// This file lives outside src/ on purpose: apps/api type-checks with workers-types only.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import type {Asset,Job,Project} from '@byga/contracts';
import {app} from '../src/app';
import {D1Store} from '../src/store';

type Statement={run(...v:unknown[]):{changes:number|bigint};all(...v:unknown[]):unknown[];get(...v:unknown[]):unknown};
type Sqlite={exec(sql:string):void;prepare(sql:string):Statement};
type SqliteCtor=new(path:string)=>Sqlite;

let DatabaseSync:SqliteCtor|null=null;
try{DatabaseSync=(createRequire(import.meta.url)('node:sqlite') as {DatabaseSync:SqliteCtor}).DatabaseSync;}
catch(error){if(process.env.CI)throw error;/* local Node without node:sqlite: skip */}

const MIGRATION_1=readFileSync(new URL('../migrations/0001_init.sql',import.meta.url),'utf8');
const MIGRATION_2=readFileSync(new URL('../migrations/0002_job_provider_id.sql',import.meta.url),'utf8');
const MIGRATION_3=readFileSync(new URL('../migrations/0003_asset_object_key.sql',import.meta.url),'utf8');
function makeDb(){
  const sqlite=new (DatabaseSync as SqliteCtor)(':memory:');
  sqlite.exec(MIGRATION_1);
  sqlite.exec(MIGRATION_2);
  sqlite.exec(MIGRATION_3);
  const bound=(sql:string,values:unknown[])=>({
    run:async()=>({success:true,results:[],meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}}),
    all:async()=>({success:true,results:sqlite.prepare(sql).all(...values),meta:{}}),
    first:async()=>sqlite.prepare(sql).get(...values)??null
  });
  return{prepare:(sql:string)=>({...bound(sql,[]),bind:(...values:unknown[])=>bound(sql,values)})};
}

const TS='2026-11-11T00:00:00.000Z',LATER='2026-11-11T00:05:00.000Z';
const project=(over:Partial<Project>={}):Project=>({id:'prj_alpha0001',name:'Alpha',archived:false,createdAt:TS,updatedAt:TS,...over});
const asset=(over:Partial<Asset>={}):Asset=>({id:'ast_asset00001',projectId:'prj_alpha0001',name:'cover.png',mimeType:'image/png',size:1024,type:'image',createdAt:TS,storage:'metadata-only',...over});
const job=(over:Partial<Job>={}):Job=>({id:'job_job0000001',projectId:'prj_alpha0001',engine:'remotion',operation:'render',state:'queued',createdAt:TS,updatedAt:TS,input:{source:'x',n:1},providerJobId:null,...over});

describe.skipIf(DatabaseSync===null)('D1Store against the real migrations',()=>{
  it('creates, lists, renames and archives projects',async()=>{
    const store=new D1Store(makeDb() as never);
    await store.createProject(project());
    await store.createProject(project({id:'prj_beta00002',name:'Beta',updatedAt:LATER}));
    expect((await store.listProjects()).map(p=>p.id)).toEqual(['prj_beta00002','prj_alpha0001']);
    await store.updateProject(project({name:'Renamed',archived:true,updatedAt:LATER}));
    expect(await store.getProject('prj_alpha0001')).toEqual(project({name:'Renamed',archived:true,updatedAt:LATER}));
    expect(await store.getProject('prj_missing0000')).toBeNull();
  });
  it('stores asset metadata, filters by project and reports deletes',async()=>{
    const store=new D1Store(makeDb() as never);
    await store.createProject(project());
    await store.createProject(project({id:'prj_beta00002'}));
    await store.createAsset(asset());
    await store.createAsset(asset({id:'ast_asset00002',projectId:'prj_beta00002',checksum:'sha256:abcdef12'}));
    expect(await store.listAssets()).toHaveLength(2);
    expect(await store.listAssets('prj_beta00002')).toEqual([asset({id:'ast_asset00002',projectId:'prj_beta00002',checksum:'sha256:abcdef12'})]);
    expect(await store.deleteAsset('ast_asset00001')).toEqual(asset());
    expect(await store.deleteAsset('ast_asset00001')).toBeNull();
  });
  it('enforces foreign keys and check constraints',async()=>{
    const store=new D1Store(makeDb() as never);
    await expect(store.createAsset(asset({projectId:'prj_missing0000'}))).rejects.toThrow();
    await store.createProject(project());
    await expect(store.createAsset(asset({size:26214401}))).rejects.toThrow();
  });
  it('round-trips jobs, provider identifiers and compare-and-swap state changes',async()=>{
    const store=new D1Store(makeDb() as never);
    await store.createProject(project());
    await store.createJob(job());
    expect(await store.getJob('job_job0000001')).toEqual(job());
    expect(await store.updateProviderJobId('job_job0000001','remotion_123')).toBe(true);
    expect(await store.updateProviderJobId('job_missing00001','remotion_456')).toBe(false);
    expect(await store.getJob('job_job0000001')).toEqual(job({providerJobId:'remotion_123'}));
    const running=job({state:'running',updatedAt:LATER,providerJobId:'remotion_123'});
    expect(await store.updateJob(running,'queued')).toBe(true);
    expect(await store.updateJob(job({state:'succeeded',updatedAt:LATER}),'queued')).toBe(false);
    expect((await store.getJob('job_job0000001'))?.state).toBe('running');
    const done=job({state:'succeeded',updatedAt:LATER,providerJobId:'remotion_123',output:{kind:'mock',reference:'mock://prj_alpha0001/job_job0000001'}});
    expect(await store.updateJob(done,'running')).toBe(true);
    expect(await store.getJob('job_job0000001')).toEqual(done);
    expect(await store.listJobs('prj_alpha0001')).toEqual([done]);
    expect(await store.listJobs('prj_other00001')).toEqual([]);
  });
  it('computes dashboard counts in SQL',async()=>{
    const store=new D1Store(makeDb() as never);
    expect(await store.counts()).toEqual({projects:0,activeProjects:0,assets:0,jobs:0,runningJobs:0,succeededJobs:0,failedJobs:0});
    await store.createProject(project());
    await store.createProject(project({id:'prj_beta00002',archived:true}));
    await store.createAsset(asset());
    await store.createJob(job());
    await store.createJob(job({id:'job_job0000002',state:'running'}));
    await store.createJob(job({id:'job_job0000003',state:'succeeded'}));
    await store.createJob(job({id:'job_job0000004',state:'failed'}));
    expect(await store.counts()).toEqual({projects:2,activeProjects:1,assets:1,jobs:4,runningJobs:2,succeededJobs:1,failedJobs:1});
  });
  it('serves the HTTP API from D1 when the DB binding is present',async()=>{
    const TOKEN='a'.repeat(40),db=makeDb();
    const env={STUDIO_ACCESS_TOKEN:TOKEN,DB:db};
    const headers={'content-type':'application/json',authorization:'Bearer '+TOKEN};
    const send=(path:string,init:{method?:string;body?:string}={},bindings:object=env)=>app.request(path,{...init,headers},bindings);
    const health=await (await send('/api/v1/health')).json() as {persistence?:string};
    expect(health.persistence).toBe('d1');
    const created=await send('/api/v1/projects',{method:'POST',body:JSON.stringify({name:'Durable'})});
    expect(created.status).toBe(201);
    const p=await created.json() as {id:string};
    const j=await (await send('/api/v1/jobs',{method:'POST',body:JSON.stringify({projectId:p.id,engine:'remotion',operation:'render'})})).json() as {id:string;state:string};
    expect(j.state).toBe('queued');
    expect(((await (await send('/api/v1/jobs/'+j.id+'/advance',{method:'POST'})).json()) as {state:string}).state).toBe('running');
    expect(((await (await send('/api/v1/jobs/'+j.id+'/advance',{method:'POST'})).json()) as {state:string}).state).toBe('succeeded');
    expect((await send('/api/v1/jobs/'+j.id+'/advance',{method:'POST'})).status).toBe(409);
    const dash=await (await send('/api/v1/dashboard')).json() as {projects:number;succeededJobs:number};
    expect(dash.projects).toBe(1);
    expect(dash.succeededJobs).toBe(1);
    const listed=await (await send('/api/v1/projects')).json() as {id:string}[];
    expect(listed.map(x=>x.id)).toEqual([p.id]);
    const memoryList=await (await send('/api/v1/projects',{},{STUDIO_ACCESS_TOKEN:TOKEN})).json() as {id:string}[];
    expect(memoryList.map(x=>x.id)).not.toContain(p.id);
  });
});