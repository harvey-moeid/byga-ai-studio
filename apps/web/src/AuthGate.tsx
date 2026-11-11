import {useEffect,useState,type CSSProperties,type FormEvent,type ReactNode} from 'react';
import {ApiErrorSchema,SessionResponseSchema,type SessionResponse} from '@byga/contracts';

async function call(path:string,init?:RequestInit):Promise<Response>{return fetch('/api/v1'+path,{...init,credentials:'same-origin',headers:{accept:'application/json',...(init?.body?{'content-type':'application/json'}:{})}});}
async function readSession(response:Response):Promise<SessionResponse>{return SessionResponseSchema.parse(await response.json());}
async function readError(response:Response):Promise<string>{try{const parsed=ApiErrorSchema.safeParse(await response.json());if(parsed.success)return parsed.data.error.message;}catch{/* fall through to the generic message */}return 'Permintaan gagal.';}

const shell:CSSProperties={minHeight:'100vh',display:'grid',placeItems:'center',padding:24};
const card:CSSProperties={width:'100%',maxWidth:420,display:'grid',gap:16};

export default function AuthGate({children}:{children:ReactNode}){
const [session,setSession]=useState<SessionResponse|null>(null),[unreachable,setUnreachable]=useState(false),[token,setToken]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
useEffect(()=>{let live=true;const check=()=>{void call('/auth/session').then(readSession).then(s=>{if(live){setSession(s);setUnreachable(false);}}).catch(()=>{if(live)setUnreachable(true);});};check();const timer=window.setInterval(check,60_000);return()=>{live=false;window.clearInterval(timer);};},[]);
async function login(e:FormEvent){e.preventDefault();if(!token||busy)return;setBusy(true);setError('');try{const r=await call('/auth/login',{method:'POST',body:JSON.stringify({token})});if(!r.ok){setError(await readError(r));return;}setSession(await readSession(r));setToken('');}catch{setError('API tidak dapat dihubungi.');}finally{setBusy(false);}}
async function logout(){setBusy(true);try{const r=await call('/auth/logout',{method:'POST'});if(r.ok)setSession(await readSession(r));}catch{/* keep current state if the request fails */}finally{setBusy(false);}}
const brand=<div className="brand" style={{paddingBottom:8}}><span className="brand-mark">B</span><span><strong>BYGA<span>.</span>AI</strong><small>STUDIO</small></span></div>;
if(!session)return <main style={shell}><div style={card}>{brand}<div className="panel-block" role="status">{unreachable?<><strong>API tidak dapat dihubungi.</strong><p className="intro">Periksa koneksi lalu muat ulang halaman.</p><div className="hero-actions"><button onClick={()=>window.location.reload()}>Muat ulang</button></div></>:<span className="eyebrow">MEMUAT…</span>}</div></div></main>;
if(!session.configured)return <main style={shell}><div style={card}>{brand}<div className="panel-block" role="alert"><div className="eyebrow">AUTENTIKASI BELUM DIKONFIGURASI</div><p className="intro" style={{marginTop:12}}>Server belum memiliki secret <code>STUDIO_ACCESS_TOKEN</code> (minimal 32 karakter). Akses ke API ditolak sampai secret diatur.</p></div></div></main>;
if(!session.authenticated)return <main style={shell}><form style={card} onSubmit={e=>void login(e)}>{brand}<div className="form-panel" style={{gridTemplateColumns:'1fr',marginBottom:0}}><div className="eyebrow">MASUK KE WORKSPACE</div><label>Token akses<input type="password" autoComplete="current-password" value={token} onChange={e=>setToken(e.target.value)} maxLength={256} required autoFocus/></label>{error&&<div className="notice" role="alert" style={{position:'static',marginBottom:0}}>{error}</div>}<button disabled={busy||!token}>{busy?'Memeriksa…':'Masuk'}</button></div></form></main>;
return <>{children}<button className="quiet-button" style={{position:'fixed',right:14,bottom:14,zIndex:5}} disabled={busy} onClick={()=>void logout()}>Keluar</button></>;
}
