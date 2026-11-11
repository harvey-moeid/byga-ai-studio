import {afterEach,describe,expect,it,vi} from 'vitest';
import {SuaraAdapter} from './suara';

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
afterEach(()=>vi.unstubAllGlobals());

describe('Suara adapter',()=>{
  it('is disabled by default and performs no network request',async()=>{
    const fetcher=vi.fn<typeof fetch>();
    const adapter=new SuaraAdapter({fetcher});
    expect(adapter.configured).toBe(false);
    expect(await adapter.healthCheck()).toEqual({status:'disabled',reason:'feature-flag-off'});
    await expect(adapter.submitJob({text:'Halo',mode:'auto',language:'id',numStep:16,speed:1})).rejects.toMatchObject({status:503});
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fails closed for invalid or non-HTTPS provider URLs',async()=>{
    const fetcher=vi.fn<typeof fetch>();
    for(const baseUrl of ['http://example.com','https://user:pass@example.com','https://example.com/path?token=x','not-a-url']){
      const adapter=new SuaraAdapter({enabled:true,baseUrl,passcode:'secret',fetcher});
      expect(adapter.configured).toBe(false);
      expect((await adapter.healthCheck()).status).toBe('disabled');
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('checks the protected metadata endpoint without exposing the passcode',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(json({quotaUsed:0,quotaMax:20,maxChars:1500,rtfByStep:{}}));
    const adapter=new SuaraAdapter({enabled:true,baseUrl:'https://suara.example/',passcode:'server-secret',fetcher});
    expect(await adapter.healthCheck()).toMatchObject({status:'configured'});
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://suara.example/api/meta');
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get('x-passcode')).toBe('server-secret');
  });

  it('submits a multipart job and returns the provider id',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(json({job_id:'123e4567-e89b-12d3-a456-426614174000'},201));
    const adapter=new SuaraAdapter({enabled:true,baseUrl:'https://suara.example',passcode:'secret',fetcher});
    const result=await adapter.submitJob({text:'Halo dunia',mode:'design',language:'id',numStep:16,speed:1,instruct:'female, young adult'});
    expect(result.providerJobId).toBe('123e4567-e89b-12d3-a456-426614174000');
    const init=fetcher.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('content-type')).toBeNull();
    const form=init?.body as FormData;
    expect(form.get('text')).toBe('Halo dunia');
    expect(form.get('mode')).toBe('design');
  });

  it('rejects malformed provider ids and statuses',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(json({status:'mystery'}));
    const adapter=new SuaraAdapter({enabled:true,baseUrl:'https://suara.example',passcode:'secret',fetcher});
    await expect(adapter.getJob('../other')).rejects.toMatchObject({status:400});
    await expect(adapter.getJob('123e4567-e89b-12d3-a456-426614174000')).rejects.toMatchObject({status:502});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('maps provider status and audio metadata',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(json({id:'123e4567-e89b-12d3-a456-426614174000',status:'done',mode:'auto',progress:{done:2,total:2},audioSec:12.5,elapsedSec:4,rtf:0.32}));
    const adapter=new SuaraAdapter({enabled:true,baseUrl:'https://suara.example',passcode:'secret',fetcher});
    await expect(adapter.getJob('123e4567-e89b-12d3-a456-426614174000')).resolves.toMatchObject({status:'done',audioSec:12.5,progress:{done:2,total:2}});
  });

  it('streams audio response and rejects provider errors',async()=>{
    const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(new Uint8Array([1,2,3]),{status:200})).mockResolvedValueOnce(json({error:'missing'},404));
    const adapter=new SuaraAdapter({enabled:true,baseUrl:'https://suara.example',passcode:'secret',fetcher});
    const audio=await adapter.getAudio('123e4567-e89b-12d3-a456-426614174000','mp3');
    expect(new Uint8Array(await audio.arrayBuffer())).toEqual(new Uint8Array([1,2,3]));
    await expect(adapter.getAudio('123e4567-e89b-12d3-a456-426614174000','wav')).rejects.toMatchObject({status:404});
  });
});
