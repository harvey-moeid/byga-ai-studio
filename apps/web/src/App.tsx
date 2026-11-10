import { useEffect, useState } from 'react';
import { HealthResponseSchema } from '@byga/contracts';

type ApiState = 'checking' | 'online' | 'offline';

const engines = [
  { key: 'hyperframes', name: 'HyperFrames', type: 'HTML · CSS · GSAP', description: 'Komposisi video berbasis web.', status: 'Integrasi belum diaktifkan' },
  { key: 'remotion', name: 'Remotion', type: 'React · Motion', description: 'Video programatik berbasis React.', status: 'Integrasi belum diaktifkan' },
  { key: 'suara', name: 'Suara', type: 'Audio · Voice', description: 'Generasi audio dan suara.', status: 'Menunggu verifikasi lisensi' }
] as const;

export default function App() {
  const [apiState, setApiState] = useState<ApiState>('checking');
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/health', { signal: controller.signal, headers: { accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('API unavailable');
        const payload = HealthResponseSchema.parse(await response.json());
        setCheckedAt(payload.checkedAt);
        setApiState(payload.status === 'ok' ? 'online' : 'offline');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setApiState('offline');
      });
    return () => controller.abort();
  }, []);

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Navigasi utama">
        <a className="brand" href="#home" aria-label="BYGA AI Studio beranda">
          <span className="brand-mark">B</span>
          <span><strong>BYGA<span className="brand-dot">.</span>AI</strong><small>STUDIO</small></span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list">
          <a className="nav-item active" href="#overview"><span>◫</span> Overview</a>
          <span className="nav-item disabled" aria-disabled="true"><span>▦</span> Projects <em>Soon</em></span>
          <span className="nav-item disabled" aria-disabled="true"><span>▧</span> Asset library <em>Soon</em></span>
          <span className="nav-item disabled" aria-disabled="true"><span>◷</span> Job center <em>Soon</em></span>
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-card"><span className="workspace-icon">✳</span><div><strong>Studio workspace</strong><small>Foundation · Phase 1</small></div></div>
          <div className="sidebar-foot">BUILD ANYWHERE <span>·</span> 0.1.0</div>
        </div>
      </aside>

      <section className="main-panel" id="home">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="topbar-right"><span className={\`api-pill \${apiState}\`}><i />{apiState === 'checking' ? 'Checking API' : apiState === 'online' ? 'API connected' : 'API unavailable'}</span><div className="avatar">B</div></div>
        </header>

        <div className="content" id="overview">
          <section className="welcome-row">
            <div><div className="eyebrow"><span className="eyebrow-line" /> YOUR CREATIVE CONTROL ROOM</div><h1>Build something<br /><span>remarkable.</span></h1><p className="intro">Satu ruang kerja untuk mengelola workflow audio dan video berbantuan AI.</p></div>
            <div className="welcome-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="core-mark">B<span>.</span></div><div className="orbit-node node-one" /><div className="orbit-node node-two" /><div className="orbit-node node-three" /></div>
          </section>

          <section className="section-block">
            <div className="section-heading"><div><div className="eyebrow">PLATFORM STATUS</div><h2>Engine connections</h2></div><span className="section-note">Status integrasi aktual</span></div>
            <div className="engine-grid">{engines.map((engine) => <article className="engine-card" key={engine.key}><div className="engine-card-top"><span className={\`engine-symbol \${engine.key}\`}>{engine.key === 'hyperframes' ? 'H' : engine.key === 'remotion' ? 'R' : 'S'}</span><span className="pending-dot" /></div><div className="engine-type">{engine.type}</div><h3>{engine.name}</h3><p>{engine.description}</p><div className="engine-status">{engine.status}</div></article>)}</div>
          </section>

          <section className="foundation-row">
            <article className="foundation-card"><div className="foundation-icon">⌘</div><div><div className="eyebrow">FOUNDATION</div><h3>Control plane is taking shape.</h3><p>Fondasi API, shared contracts, dan quality gates sedang disiapkan sebelum fitur produksi diaktifkan.</p></div><span className="phase-tag">PHASE 1</span></article>
            <article className="health-card"><div className="health-head"><span>API HEALTH</span><span className={\`health-state \${apiState}\`}>{apiState === 'online' ? 'OPERATIONAL' : apiState === 'checking' ? 'CHECKING' : 'UNAVAILABLE'}</span></div><div className="health-value">{apiState === 'online' ? 'Connected' : apiState === 'checking' ? 'Checking…' : 'No connection'}</div><div className="health-foot">{checkedAt ? \`Last checked \${new Date(checkedAt).toLocaleTimeString('id-ID')}\` : 'Live status from Studio API'}</div></article>
          </section>
          <footer className="footer"><span>© 2026 BYGA.AI STUDIO</span><span>BUILD ANYWHERE <b>·</b> BUILT FOR CREATORS</span></footer>
        </div>
      </section>
    </main>
  );
}
