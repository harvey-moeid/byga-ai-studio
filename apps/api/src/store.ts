import {AssetSchema,JobSchema,ProjectSchema,type Asset,type Job,type JobState,type Project} from '@byga/contracts';
import type {Bindings} from './env';

export const LIST_LIMIT=1000;
export type Counts={projects:number;activeProjects:number;assets:number;jobs:number;runningJobs:number;succeededJobs:number;failedJobs:number};

export interface Store{
readonly kind:'memory'|'d1';
listProjects():Promise<Project[]>;
getProject(id:string):Promise<Project|null>;
getAsset(id:string):Promise<Asset|null>;
createProject(project:Project):Promise<void>;
updateProject(project:Project):Promise<void>;
listAssets(projectId?:string):Promise<Asset[]>;
createAsset(asset:Asset):Promise<void>;
deleteAsset(id:string):Promise<Asset|null>;
listJobs(projectId?:string):Promise<Job[]>;
getJob(id:string):Promise<Job|null>;
createJob(job:Job):Promise<void>;
updateJob(job:Job,expected:JobState):Promise<boolean>;
updateProviderJobId(id:string,providerJobId:string):Promise<boolean>;
counts():Promise<Counts>;
}

export class MemoryStore implements Store{
readonly kind='memory' as const;
private readonly projects=new Map<string,Project>();
private readonly assets=new Map<string,Asset>();
private readonly jobs=new Map<string,Job>();
async listProjects(){return [...this.projects.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,LIST_LIMIT);}
async getProject(id:string){return this.projects.get(id)??null;}
async createProject(project:Project){this.projects.set(project.id,project);}
async updateProject(project:Project){this.projects.set(project.id,project);}
async getAsset(id:string){return this.assets.get(id)??null;}
async listAssets(projectId?:string){return [...this.assets.values()].filter(a=>!projectId||a.projectId===projectId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,LIST_LIMIT);}
async createAsset(asset:Asset){this.assets.set(asset.id,asset);}
async deleteAsset(id:string){const asset=this.assets.get(id)??null;if(asset)this.assets.delete(id);return asset;}
async listJobs(projectId?:string){return [...this.jobs.values()].filter(j=>!projectId||j.projectId===projectId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,LIST_LIMIT);}
async getJob(id:string){return this.jobs.get(id)??null;}
async createJob(job:Job){this.jobs.set(job.id,job);}
async updateJob(job:Job,expected:JobState){const current=this.jobs.get(job.id);if(!current||current.state!==expected)return false;this.jobs.set(job.id,job);return true;}
async updateProviderJobId(id:string,providerJobId:string){const current=this.jobs.get(id);if(!current)return false;this.jobs.set(id,{...current,providerJobId});return true;}
async counts():Promise<Counts>{const p=[...this.projects.values()],j=[...this.jobs.values()];return{projects:p.length,activeProjects:p.filter(x=>!x.archived).length,assets:this.assets.size,jobs:j.length,runningJobs:j.filter(x=>x.state==='running'||x.state==='queued').length,succeededJobs:j.filter(x=>x.state==='succeeded').length,failedJobs:j.filter(x=>x.state==='failed').length};}
}

type ProjectRow={id:string;name:string;archived:number;created_at:string;updated_at:string};
type AssetRow={id:string;project_id:string;name:string;mime_type:string;size:number;type:string;checksum:string|null;object_key:string|null;created_at:string};
type JobRow={id:string;project_id:string;engine:string;operation:string;state:string;input_json:string;output_json:string|null;error:string|null;provider_job_id:string|null;created_at:string;updated_at:string};
const PROJECT_COLS='id,name,archived,created_at,updated_at',ASSET_COLS='id,project_id,name,mime_type,size,type,checksum,object_key,created_at',JOB_COLS='id,project_id,engine,operation,state,input_json,output_json,error,provider_job_id,created_at,updated_at';
const toProject=(r:ProjectRow):Project=>ProjectSchema.parse({id:r.id,name:r.name,archived:r.archived===1,createdAt:r.created_at,updatedAt:r.updated_at});
const toAsset=(r:AssetRow):Asset=>AssetSchema.parse({id:r.id,projectId:r.project_id,name:r.name,mimeType:r.mime_type,size:r.size,type:r.type,createdAt:r.created_at,storage:r.object_key===null?'metadata-only':'r2',...(r.object_key===null?{}:{objectKey:r.object_key}),...(r.checksum===null?{}:{checksum:r.checksum})});
const toJob=(r:JobRow):Job=>JobSchema.parse({id:r.id,projectId:r.project_id,engine:r.engine,operation:r.operation,state:r.state,createdAt:r.created_at,updatedAt:r.updated_at,input:JSON.parse(r.input_json) as unknown,providerJobId:r.provider_job_id,...(r.output_json===null?{}:{output:JSON.parse(r.output_json) as unknown}),...(r.error===null?{}:{error:r.error})});

export class D1Store implements Store{
readonly kind='d1' as const;
private readonly db:D1Database;
constructor(db:D1Database){this.db=db;}
async listProjects(){const{results}=await this.db.prepare(`SELECT ${PROJECT_COLS} FROM projects ORDER BY updated_at DESC LIMIT ${LIST_LIMIT}`).all<ProjectRow>();return results.map(toProject);}
async getProject(id:string){const row=await this.db.prepare(`SELECT ${PROJECT_COLS} FROM projects WHERE id=?`).bind(id).first<ProjectRow>();return row?toProject(row):null;}
async createProject(p:Project){await this.db.prepare('INSERT INTO projects (id,name,archived,created_at,updated_at) VALUES (?,?,?,?,?)').bind(p.id,p.name,p.archived?1:0,p.createdAt,p.updatedAt).run();}
async updateProject(p:Project){await this.db.prepare('UPDATE projects SET name=?,archived=?,updated_at=? WHERE id=?').bind(p.name,p.archived?1:0,p.updatedAt,p.id).run();}
async getAsset(id:string){const row=await this.db.prepare(`SELECT ${ASSET_COLS} FROM assets WHERE id=?`).bind(id).first<AssetRow>();return row?toAsset(row):null;}
async listAssets(projectId?:string){const stmt=projectId?this.db.prepare(`SELECT ${ASSET_COLS} FROM assets WHERE project_id=? ORDER BY created_at DESC LIMIT ${LIST_LIMIT}`).bind(projectId):this.db.prepare(`SELECT ${ASSET_COLS} FROM assets ORDER BY created_at DESC LIMIT ${LIST_LIMIT}`);const{results}=await stmt.all<AssetRow>();return results.map(toAsset);}
async createAsset(a:Asset){await this.db.prepare('INSERT INTO assets (id,project_id,name,mime_type,size,type,checksum,object_key,created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(a.id,a.projectId,a.name,a.mimeType,a.size,a.type,a.checksum??null,a.objectKey??null,a.createdAt).run();}
async deleteAsset(id:string){const asset=await this.getAsset(id);if(!asset)return null;const r=await this.db.prepare('DELETE FROM assets WHERE id=?').bind(id).run();return(r.meta.changes??0)>0?asset:null;}
async listJobs(projectId?:string){const stmt=projectId?this.db.prepare(`SELECT ${JOB_COLS} FROM jobs WHERE project_id=? ORDER BY created_at DESC LIMIT ${LIST_LIMIT}`).bind(projectId):this.db.prepare(`SELECT ${JOB_COLS} FROM jobs ORDER BY created_at DESC LIMIT ${LIST_LIMIT}`);const{results}=await stmt.all<JobRow>();return results.map(toJob);}
async getJob(id:string){const row=await this.db.prepare(`SELECT ${JOB_COLS} FROM jobs WHERE id=?`).bind(id).first<JobRow>();return row?toJob(row):null;}
async createJob(j:Job){await this.db.prepare('INSERT INTO jobs (id,project_id,engine,operation,state,input_json,output_json,error,provider_job_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(j.id,j.projectId,j.engine,j.operation,j.state,JSON.stringify(j.input),j.output?JSON.stringify(j.output):null,j.error??null,j.providerJobId,j.createdAt,j.updatedAt).run();}
async updateJob(j:Job,expected:JobState){const r=await this.db.prepare('UPDATE jobs SET state=?,output_json=?,error=?,updated_at=? WHERE id=? AND state=?').bind(j.state,j.output?JSON.stringify(j.output):null,j.error??null,j.updatedAt,j.id,expected).run();return(r.meta.changes??0)>0;}
async updateProviderJobId(id:string,providerJobId:string){const r=await this.db.prepare('UPDATE jobs SET provider_job_id=? WHERE id=?').bind(providerJobId,id).run();return(r.meta.changes??0)>0;}
async counts():Promise<Counts>{
const[p,a,j]=await Promise.all([
this.db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN archived=0 THEN 1 ELSE 0 END),0) AS active FROM projects').first<{total:number;active:number}>(),
this.db.prepare('SELECT COUNT(*) AS total FROM assets').first<{total:number}>(),
this.db.prepare("SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN state IN ('queued','running') THEN 1 ELSE 0 END),0) AS running, COALESCE(SUM(CASE WHEN state='succeeded' THEN 1 ELSE 0 END),0) AS succeeded, COALESCE(SUM(CASE WHEN state='failed' THEN 1 ELSE 0 END),0) AS failed FROM jobs").first<{total:number;running:number;succeeded:number;failed:number}>()]);
return{projects:p?.total??0,activeProjects:p?.active??0,assets:a?.total??0,jobs:j?.total??0,runningJobs:j?.running??0,succeededJobs:j?.succeeded??0,failedJobs:j?.failed??0};}
}

const memory=new MemoryStore();
export function getStore(env:Bindings|undefined):Store{return env?.DB?new D1Store(env.DB):memory;}