# License Manager

English | [简体中文](README.zh-CN.md)

A lightweight, self-hostable, multi-tenant software licensing system for independent software, desktop tools, plugins, scripts, and internal systems. It covers the full workflow from application onboarding and batch issuance to device activation, verification, controlled transfer, and audit trails.

The backend and database run on Cloudflare Workers and D1. APIs are built with Hono, and the admin console is built with React, Vite, and Ant Design Pro. The Worker serves both the backend API and the admin static assets, so the system can be deployed to the Cloudflare edge with low operational overhead.

## Online Demo

- URL: [https://license.udook.com](https://license.udook.com)
- Tenant: `test`
- Username: `test`
- Password: `test123456`

These credentials are public and intended only for the online demo. Do not reuse the password elsewhere; demo data may be reset periodically.

## Business Highlights

- **License time starts when the customer starts using it:** Weekly, monthly, quarterly, and yearly licenses begin at first activation, so generating or distributing keys early does not consume the customer's license period.
- **One key per device without making device changes painful:** Activation is device-bound and idempotent on the same device. Users can self-unbind within transfer and cooldown limits, while administrators can handle eligible exceptions.
- **Operate multiple tenants from one deployment:** Super administrators manage tenants and explicitly switch business context; tenant administrators can access only the data assigned to their tenant.
- **Minimize stored credential exposure:** Full license keys and application secrets are shown only once, device fingerprints are never persisted, and long-term storage contains only HMAC values or key suffixes.
- **Observe and audit the licensing lifecycle:** The dashboard surfaces license inventory, activation trends, and client failures. Searchable logs cover important admin actions and client authorization outcomes, while soft deletion preserves history.
- **Move from API exploration to integration in one console:** Built-in API docs, workflow guidance, copyable examples, multi-framework SDK/component samples, and a live API Playground shorten the path from application creation to client integration.

## Use Cases

- Issue license keys for one or more applications.
- Separate licenses by platform, such as Windows, macOS, Linux, iOS, Android, or Web.
- Let clients activate and verify licenses with `app_id`, `app_secret`, a license key, and a device fingerprint.
- Enforce one license per device while allowing controlled self-service device transfers.
- Operate licenses for multiple customers or business units while isolating tenant data and administrative access.
- Manage license states, filters, disable/enable/delete actions, and audit logs from an admin console.
- Use dashboard metrics, audit logs, and stable failure codes to understand license usage and troubleshoot client issues.
- Self-host the licensing service without retaining full plaintext license keys, application secrets, or device fingerprints.

## Feature Overview

### Multi-Tenancy and Administration

- Applications, generation batches, license keys, and logs are isolated by tenant, with tenant constraints enforced for every server-side resource access.
- Super administrators can create, enable, disable, and delete eligible tenants, reset tenant administrator passwords, and explicitly switch tenant context for business operations.
- Tenant administrators remain scoped to their assigned tenant. Disabling a tenant blocks its admin sessions and client authorization requests without rewriting existing license state.
- Administrators have login, 8-hour JWT sessions, password changes, and bootstrap-key password recovery.

### Application Licensing

- Multi-application and multi-platform license management.
- Applications support descriptions and purchase links, and can be enabled, disabled, conditionally deleted, or have their secrets rotated.
- Disabling an application immediately blocks its client authorization operations while preserving the original state of its license keys.
- Application secrets are shown only once on creation or rotation; the database stores only HMAC hashes.

### License Keys

- Batch license key generation with server-side generation limits.
- Built-in weekly, monthly, quarterly, and yearly plans.
- Plaintext license keys are shown only once in the generation response; full plaintext keys are never stored.
- Filter by status, application, platform, plan, keyword, and other conditions.
- Disable, enable, or soft delete individual keys or batches; bulk operations report both requested and updated counts.
- Deleted state takes precedence over disabled, expired, and active display states, keeping the lifecycle explicit and irreversible.

### Activation, Verification, and Device Transfer

- Expiration time is calculated from first activation, not from generation time.
- Weekly plans use 7 days; monthly, quarterly, and yearly plans use calendar months or years.
- One license key is bound to one device by default, and verification requires a matching device fingerprint.
- Re-activating the same license key on the same device returns the current license information.
- Supports up to 3 self-service unbind transfers, with at least 24 hours between valid unbinds.
- Unbinding releases only the device relationship and never recalculates activation or expiration; the new device rebinds through the activation endpoint.
- Admins can manually unbind eligible activated licenses without consuming the user's self-service transfer allowance.

### Operations, Audit, and Developer Support

- The dashboard shows application and license totals, activation rate, status and plan distributions, 7-day license trends, application ranking, and client failure counts.
- Operation logs can be searched by application, action, result, and keyword, covering important admin actions plus activation, verification, and unbind outcomes once a license key is identified.
- Integration docs include client API references, workflow diagrams, TypeScript/JavaScript SDKs, cURL examples, and an HTML demo.
- The SDK page provides React, Vue, React Native, Angular, Svelte, Electron, Flutter/Dart, and TypeScript Core samples.
- The Playground previews requests and calls the real client APIs for activation, verification, and unbind testing.

### Security and Audit

- `/api/admin/*` endpoints require Bearer Token authentication except login.
- Client APIs validate both `app_id` and `app_secret`.
- License keys, application secrets, and device fingerprints are stored using separate HMAC secrets.
- APIs use a unified response shape and do not expose SQL errors, raw exceptions, or secret-related details.
- License key deletion is soft deletion, preserving auditability and historical records.

## Tech Stack

| Area | Technology |
| --- | --- |
| Backend | Cloudflare Workers, Hono, TypeScript |
| Database | Cloudflare D1, SQL migrations |
| Admin console | React, Vite, Ant Design Pro |
| Package management | pnpm workspace |
| Deployment | Wrangler, Worker assets |
| Testing | Vitest |

## Project Structure

```text
.
├── admin/        # React + Vite + Ant Design Pro admin console
├── docs/         # Architecture, API, business rules, security, deployment docs
├── migrations/   # Cloudflare D1 migrations
├── worker/       # Cloudflare Workers + Hono API
├── AGENTS.md     # Coding agent development rules
└── pnpm-workspace.yaml
```

Request flow:

```text
Browser/Admin
  -> Cloudflare Worker
  -> Hono routes
  -> service business rules
  -> repository D1 queries
  -> unified JSON response
```

Non-`/api/*` requests fall back to admin static assets served by Worker assets.

## Local Development

Requirements:

- Node.js `>=20.11.0`
- pnpm `>=11.7.0`
- Cloudflare Wrangler, managed by `worker/package.json`

Install dependencies and prepare local secrets:

```bash
pnpm install
pnpm env:init
```

Initialize local D1 and start the development environment:

```bash
pnpm db:migrate:local
pnpm dev
```

Open the admin console at `http://localhost:5173`. Vite provides hot reload, and API requests are proxied to the local Worker.

The local Worker listens on `http://localhost:8787` by default. To verify Worker static asset hosting, run `pnpm build` first, then start the Worker separately.

The default bootstrap admin is controlled by `worker/.dev.vars` and `worker/wrangler.toml`:

- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`

If the admin account does not exist on first login, the Worker creates it automatically.

Local development reads the public top-level configuration in `worker/wrangler.toml`. Production deployment reads the uncommitted `worker/wrangler.production.toml` and manages secrets with `wrangler secret put --config wrangler.production.toml --env production`.

## Common Commands

```bash
pnpm dev               # Start Worker and admin console together
pnpm env:init          # Generate local Worker secrets
pnpm env:check:production # Check production secret names
pnpm build             # Build admin console and Worker
pnpm type-check        # Run backend and frontend type checks
pnpm test              # Run Worker tests
pnpm db:migrate:local  # Apply local D1 migrations
pnpm db:migrate:remote # Apply production D1 migrations
pnpm deploy            # Build and deploy the production Worker
```

## Verification

```bash
pnpm build
pnpm type-check
pnpm test
```

Documentation-only changes usually do not require tests. Code, API, database, or deployment changes should run the relevant verification commands for their impact area.

## Deployment

The deployment target is Cloudflare Workers + D1 + Worker assets.

Before the first deployment:

1. Create the production D1 database.
2. Copy `worker/wrangler.production.example.toml` to the local private `worker/wrangler.production.toml`.
3. Fill in the Worker name, custom domain, production D1 `database_id`, and bootstrap username in the production config.
4. Use Wrangler secrets to set `JWT_SECRET`, `CODE_HMAC_SECRET`, `APP_SECRET_HMAC_SECRET`, `DEVICE_HMAC_SECRET`, and `ADMIN_BOOTSTRAP_PASSWORD`.
5. Check production secret names.
6. Apply remote D1 migrations.
7. Build and deploy.

```bash
pnpm env:check:production
pnpm db:migrate:remote
pnpm deploy
```

Production D1, production domain, and bootstrap username are configured in `env.production` inside the local private `worker/wrangler.production.toml`. See the [deployment guide](docs/DEPLOYMENT.md) for details.

After deployment, check:

- `/api/health` returns successfully.
- The admin console loads and login works.
- `app_secret` is shown only once after application creation.
- Plaintext `codes` are shown only once after license key generation.
- Client activation, verification, and unbind APIs return as expected.

## Open Source and Security

- This project is licensed under the [MIT License](LICENSE).
- See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.
- See [SECURITY.md](SECURITY.md) for vulnerability reporting.
- Do not commit `worker/.dev.vars`, `worker/wrangler.production.toml`, real secrets, production D1 IDs, or build artifacts.
- Copy `worker/wrangler.production.example.toml` to the uncommitted `worker/wrangler.production.toml` before filling in real production values.

## Documentation

More detailed design, API, and maintenance rules are split into topic documents:

- [Documentation index](docs/README.md)
- [Development guide](docs/DEVELOPMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Business rules](docs/BUSINESS_RULES.md)
- [Frontend rules](docs/FRONTEND.md)
- [API reference](docs/API.md)
- [Security rules](docs/SECURITY.md)
- [Database rules](docs/DATABASE.md)
- [Deployment guide](docs/DEPLOYMENT.md)
