import {afterEach,describe,expect,it,vi} from 'vitest';
import {app} from './app';

const TOKEN='s'.repeat(40);
const env={STUDIO_ACCESS_TOKEN:TOKEN,SUARA_ENABLED:'true',SUARA_BASE_URL:'https://suara.example',SUARA_APP_PASSCODE:'server-only-passcode'};
const headers={authorization:'Bearer '+TOKEN};
const send=(path:string,init:RequestInit={})=>{const merged=new Headers(headers);new Headers(init.headers).forEach((value,key)=>merged.set(key,value));return app.request(path,{...init,headers:merged},env);};

afterEach(()=>vi.unstubAllGlobals());

describe('Suara API integration',()=>{
  it('submits a personal TTS job, reconciles provider status and proxies audio',async()=>{
    const providerId='123e4567-e89b-12d3-a456-426614174000';
    const fetcher=vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({job_id:providerId}),{status:201,headers:{'content-type':'application/json'}}))
      .mockResolvedValueOnce(new Response(JSON.stringify({id:providerId,status:'done',mode:'auto',progress:{done:1,total:1},audioSec:3.5}),{status:200,headers:{'content-type':'application/json'}}))
      .mockResolvedValueOnce(new Response(new Uint8Array([1,2,3]),{status:200}))
      .mockResolvedValueOnce(new Response(new Uint8Array([4,5,6]),{status:200}));
    vi.stubGlobal('fetch',fetcher);
    const projectRes=await send('/api/v1/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Suara integration test'})});
    expect(projectRes.status).toBe(201);
    const project=await projectRes.json() as {id:string};
    const form=new FormData();
    form.set('projectId',project.id);form.set('text','Halo dari BYGA');form.set('mode','auto');form.set('language','id');form.set('numStep','16');form.set('speed','1');
    const created=await send('/api/v1/suara/jobs',{method:'POST',body:form});
    expect(created.status).toBe(201);
    const job=await created.json() as {id:string;state:string;providerJobId:string};
    expect(job.state).toBe('queued');
    expect(job.providerJobId).toBe(providerId);
    const manual=await send('/api/v1/jobs/'+job.id+'/advance',{method:'POST'});
    expect(manual.status).toBe(409);
    const synced=await send('/api/v1/jobs');
    expect(synced.status).toBe(200);
    const listed=await synced.json() as Array<{id:string;state:string;output:{kind:string;provider:string;formats:string[]}} >;
    const completed=listed.find(item=>item.id===job.id)!;
    expect(completed.state).toBe('succeeded');
    expect(completed.output).toMatchObject({kind:'audio',provider:'suara',formats:['mp3','wav']});
    const audio=await send('/api/v1/jobs/'+job.id+'/audio?format=mp3');
    expect(audio.status).toBe(200);
    expect(audio.headers.get('content-type')).toBe('audio/mpeg');
    expect(new Uint8Array(await audio.arrayBuffer())).toEqual(new Uint8Array([1,2,3]));
    const wav=await send('/api/v1/jobs/'+job.id+'/audio?format=wav');
    expect(wav.headers.get('content-type')).toBe('audio/wav');
    expect(wav.headers.get('content-disposition')).toContain('.wav');
    expect(new Uint8Array(await wav.arrayBuffer())).toEqual(new Uint8Array([4,5,6]));
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get('x-passcode')).toBe('server-only-passcode');
  });

  it('requires consent and reference audio for voice cloning',async()=>{
    const fetcher=vi.fn<typeof fetch>();vi.stubGlobal('fetch',fetcher);
    const projectRes=await send('/api/v1/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Clone consent test'})});
    const project=await projectRes.json() as {id:string};
    const form=new FormData();form.set('projectId',project.id);form.set('text','Halo');form.set('mode','clone');form.set('language','id');form.set('numStep','16');form.set('speed','1');
    const response=await send('/api/v1/suara/jobs',{method:'POST',body:form});
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    form.set('consent','true');
    const noFile=await send('/api/v1/suara/jobs',{method:'POST',body:form});
    expect(noFile.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not expose Suara configuration details or credentials in engine status',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({quotaUsed:0,quotaMax:20,maxChars:1500,rtfByStep:{}}),{status:200,headers:{'content-type':'application/json'}}));
    vi.stubGlobal('fetch',fetcher);
    const response=await send('/api/v1/engines');
    const engines=await response.json() as Array<{key:string;status:string;description:string}>;
    const suara=engines.find(e=>e.key==='suara');
    expect(suara?.status).toBe('configured');
    expect(JSON.stringify(suara)).not.toContain('server-only-passcode');
  });
});
