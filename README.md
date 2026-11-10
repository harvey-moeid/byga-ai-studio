# BYGA AI Studio

Unified workspace for AI-assisted audio and video production.

> **Status:** Discovery / foundation phase  
> **Visibility:** This repository is currently public; repository owner may switch it to private.  
> **Deployment policy:** Production only. No preview or staging deployments.

## Product direction

BYGA AI Studio brings four existing systems into one workspace through isolated, API-first adapters:

| System | Responsibility |
|---|---|
| MCPNEW | Tool connectivity and orchestration |
| HyperFrames | HTML/CSS/GSAP video rendering |
| Remotion | React-based video rendering |
| Suara | Audio, speech and voice generation |

The four existing repositories remain independent and must not be modified by work in this repository.

## Non-negotiable integration rules

- All new platform code and documentation live in this repository.
- Do not commit, open PRs, dispatch workflows, edit secrets, change configuration, or deploy to the four legacy repositories without separate explicit approval.
- Integrate through verified API contracts; do not assume undocumented routes or payloads.
- Keep adapters isolated and independently feature-flagged.
- Existing standalone applications must remain usable if this studio is unavailable.
- Heavy rendering stays on GitHub Actions runners or the engine's existing rendering infrastructure, not Cloudflare Worker CPU.
- Never expose credentials to the browser or commit secrets.
- Deploy only to production after explicit release approval.

## Documentation

- [Product requirements](PRD.md)
- [Implementation plan](docs/IMPLEMENTATION-PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Integration matrix](docs/INTEGRATION-MATRIX.md)
- [API contract status](docs/API-CONTRACT.md)
- [Security policy](SECURITY.md)

## Current stage

Phase 0 — discovery and contract verification. No production integrations or deployments are authorized by this documentation commit.

## License

Not yet selected. All rights reserved unless a license is added by the repository owner.
