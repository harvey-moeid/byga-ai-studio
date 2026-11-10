# Security Policy

## Scope
Applies to BYGA AI Studio and its new infrastructure. The four legacy repositories remain independently owned and are not modified by this project.

## Secrets
Never commit API keys, GitHub/Cloudflare tokens, passwords or .env files. Keep provider credentials server-side. Never return secrets to frontend responses or include them in logs/traces/errors. Use least privilege and rotate credentials after suspected exposure. Do not reuse legacy secrets/resources without explicit approval.

## Application and API security
Authenticate users and authorize every project/job/asset operation. Validate request and provider-response schemas. Rate-limit uploads and generation. Enforce upload size, MIME and file-signature checks. Restrict outbound requests to approved provider hosts to mitigate SSRF. Render user text safely. Use secure session/cookie settings and CSRF protections where applicable.

## Logging and data handling
Use correlation IDs and structured operational metadata. Do not log authorization headers, tokens, sensitive prompts or uploaded media. Define asset retention/deletion before production. Keep audit events useful but free of secrets and sensitive payloads.

## Supply chain
Commit lockfiles. Run dependency vulnerability checks and secret scanning in CI. Review model, voice, font and media dependency licenses before commercial use. Pin critical GitHub Actions to reviewed versions or immutable SHAs where practical.

## Reporting
Report suspected vulnerabilities privately to the repository owner. Do not publish exploit details or credentials in public issues.
