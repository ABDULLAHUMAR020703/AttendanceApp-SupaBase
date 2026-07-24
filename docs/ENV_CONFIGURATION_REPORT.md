# Environment configuration audit report

**Branch:** `feature/coolify-production`  
**Scope:** Coolify / Docker Compose backend + alignment of `.env.example` files  
**Constraint:** No application behavior changes; no unused renames in source code

## Summary

Environment configuration is now centered on a single root [`.env.example`](../.env.example).  
`docker-compose.yml` shares common variables via YAML anchors and injects only what each service needs. Coolify must supply a minimal set of secrets; wiring (`PORT`, service URLs, `NODE_ENV`, `HOST`) stays in Compose.

---

## Variables still required (Coolify)

| Variable | Notes |
|----------|--------|
| `SUPABASE_URL` | Required (`:?` in compose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Required (`:?` in compose) |
| `SMTP_USER` / `SMTP_PASS` | Required for email delivery (optional for container start) |
| `COMPANY_ONBOARDING_SECRET` | Required after the first company exists |

Optional Coolify: `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM`, `GIT_COMMIT_SHA`.

---

## Variables grouped (canonical root `.env.example`)

| Section | Variables |
|---------|-----------|
| Application | _(none for Coolify — set in compose)_ |
| Supabase | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| JWT / Authentication | _(none — JWTs from Supabase Auth)_ |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |
| Reporting | `EMAIL_FROM` |
| Company Onboarding | `COMPANY_ONBOARDING_SECRET` |
| Logging | `GIT_COMMIT_SHA` |
| Optional Development | `GATEWAY_PUBLISH_PORT` |

Frontend-only (not Coolify): `VITE_*`, `NEXT_PUBLIC_API_URL`, `EXPO_PUBLIC_*`.

---

## Variables removed (from Coolify / compose templates)

| Variable | Reason |
|----------|--------|
| `REPORT_RECIPIENT_EMAIL` | Unused; intentionally rejected (DB-driven recipients) |
| `SUPER_ADMIN_EMAIL` | Unused; intentionally rejected |
| `RENDER_GIT_COMMIT` | Legacy Render alias — not documented or required (code still accepts it as a fallback so old injectors keep working) |
| `JWT_SECRET` | Never existed in this codebase |
| `LOG_LEVEL` | Never used |
| `CORS_*` | Never used (gateway uses default `cors()`) |
| Duplicated `SUPABASE_*` / `SMTP_*` / `GIT_COMMIT_SHA` blocks in compose | Defined once via anchors / single Coolify key |

Compose no longer asks Coolify for: `NODE_ENV`, `HOST`, `PORT`, `AUTH_SERVICE_URL`, `REPORTING_SERVICE_URL` (fixed in `docker-compose.yml`).

---

## Variables merged (duplicate elimination)

| Before | After |
|--------|--------|
| `SUPABASE_URL` repeated on auth + reporting env blocks | `x-supabase-env` anchor + one Coolify value |
| `SUPABASE_SERVICE_ROLE_KEY` repeated | same |
| `NODE_ENV` / `HOST` / `GIT_COMMIT_SHA` on all three services | `x-app-env` anchor |
| Root + three service `.env.example` overlapping Coolify docs | Root is canonical; service files are local-npm only |
| Web `VITE_API_GATEWAY_URL` + `NEXT_PUBLIC_API_URL` both documented as primary | Prefer `VITE_*`; `NEXT_PUBLIC_*` kept as alternate (still read in code) |

---

## Variables renamed

Application source already used `SMTP_*` only. Local `services/reporting-service/.env` was migrated from obsolete transport key names to `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` (values preserved). `EMAIL_FROM` is unchanged (From-address override, not a transport credential).

For new setups prefer `GIT_COMMIT_SHA` over the legacy Render injector name.

---

## Per-service injection (compose)

| Service | Receives | Does not receive |
|---------|----------|------------------|
| **gateway** | `NODE_ENV`, `HOST`, `PORT=80`, `AUTH_SERVICE_URL`, `REPORTING_SERVICE_URL`, `GIT_COMMIT_SHA` | Supabase, SMTP, onboarding |
| **auth-service** | `NODE_ENV`, `HOST`, `PORT=3001`, `SUPABASE_*`, `COMPANY_ONBOARDING_SECRET`, `GIT_COMMIT_SHA` | SMTP, gateway URLs |
| **reporting-service** | `NODE_ENV`, `HOST`, `PORT=3002`, `SUPABASE_*`, `SMTP_*`, `EMAIL_FROM`, `GIT_COMMIT_SHA` | Onboarding, gateway URLs |

---

## Duplicate variables eliminated

- Identical `SUPABASE_*` map entries: 2 → 1 shared anchor  
- Identical `NODE_ENV` / `HOST` / `GIT_COMMIT_SHA`: 3 → 1 shared anchor  
- Coolify operator surface: one value per name (no per-service copies)

---

## Verification

| Check | Result |
|-------|--------|
| `docker compose config` with dummy required env | Expected pass after change |
| Coolify | Same required secrets; no compose API change beyond anchors |
| Local npm | Unchanged — still `services/*/.env` + dotenv in auth/reporting |
| Functionality | No source code env renames |
| Missing required vars | Compose fails fast on missing `SUPABASE_*` |

### Local `.env` note (operator action)

If `services/api-gateway/.env` still points at Render URLs, either delete it (defaults are localhost) or set localhost URLs — the gateway does not load dotenv today, so OS/shell exports are what matter for npm.

---

## Files touched

- `docker-compose.yml` — anchors + lean per-service `environment`
- `.env.example` — canonical Coolify template (sectioned)
- `services/*/ .env.example` — local npm only
- `apps/web/.env.example`, `apps/mobile/.env.example` — clarified, non-Coolify
- `README.md` — environment variable tables
- `docs/ENV_CONFIGURATION_REPORT.md` — this report
