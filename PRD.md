# BYGA AI Studio — PRD

Version 1.2.0 | Phase 2 core platform baseline  
Language: Indonesian-first | Deployment: Production only

## Overview

BYGA AI Studio is a unified workspace for creating, orchestrating, monitoring and managing AI-assisted audio/video production. It connects MCPNEW, HyperFrames, Remotion and Suara through isolated adapters, not by merging their codebases.

## Non-negotiable principles

- All new platform code belongs only in harvey-moeid/byga-ai-studio.
- Do not modify legacy repositories, branches, files, Actions, secrets, databases, buckets, KV namespaces, deployments or domains without separate explicit approval.
- Verify every API route, auth mechanism, schema, timeout, job lifecycle and output flow before implementing an adapter.
- Each adapter is isolated, independently health-checked and feature-flagged.
- Existing standalone apps remain usable if this studio is offline.
- Heavy rendering stays on authorized runners or existing engine infrastructure, not Worker CPU.
- Secrets remain server-side and never enter browser bundles or source control.
- Production-only deployment. No preview/staging. No production release without explicit approval.

## Goals

- One dashboard for projects, assets, workflows, jobs and engine status.
- Mobile-friendly audio/video creation workflows.
- Route work through stable adapters after verification.
- Track job state, errors and output references.
- Preserve standalone functionality of all legacy systems.

## Non-goals

- Rewriting/merging legacy codebases.
- Replacing legacy databases, buckets, auth or deployments.
- Heavy media rendering inside Workers.
- Billing/multi-tenant SaaS before core workflows are proven.
- Automatically changing legacy infrastructure.

## Phase 2 functional baseline

- Dashboard with project/asset/job counts, recent activity and engine registry.
- Project create, rename, archive and association with records.
- Asset metadata validation, association and listing; actual upload is deferred.
- Normalized job center with mock lifecycle.
- Engine registry with mock-ready, blocked and unverified statuses.
- Mobile-responsive interface.

## Non-functional requirements

Security: server-side credentials, least privilege, validation, safe logging and rate limits. Reliability: bounded retries, timeouts, idempotency and graceful degradation. Accessibility: keyboard support and readable contrast. Mobile: usable from 360px width. Observability: structured logs and correlation IDs.

## Phase 2 mock-only note

Phase 2 is a non-persistent prototype. Project/job/asset metadata resides only in Worker memory; asset bytes are not accepted; generated output references are simulated. No provider calls or production deployment are enabled. Authentication, durable persistence, real uploads and provider integrations remain gated by verified contracts and explicit decisions.

## Delivery phases

0 Discovery and contract verification.  
1 Repository foundation, tooling, design system, CI and security baseline.  
2 Core platform: dashboard, projects, assets, normalized job center and mock adapters.  
3 Engine adapters, one at a time after verification.  
4 Unified creation workflows and output visibility.  
5 Security, reliability, accessibility, operations and approved production launch.

## Open decisions

Authentication/user model; exact API contracts/auth; webhook vs polling; canonical asset storage; persistence choice; upload/retention limits; model/voice/font licensing; production domain and Cloudflare resource mapping. Do not silently turn open decisions into assumptions.
