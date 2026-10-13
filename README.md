# ShughuliFlow — Backend

Clean Architecture backend for [solis-filed-tracker-ui](../solis-filed-tracker-ui), the UI for
ShughuliFlow by SOLis Group — field activity, team tasks and operations automation. NestJS + MongoDB,
multi-tenant (shared collections scoped by `orgId`).

## Architecture

Modular monolith — one NestJS module per bounded context, each internally split into four rings:

```
src/
  shared/                    # cross-cutting kernel (every module depends on this, never the reverse)
    domain/                  # Entity/AggregateRoot base classes, Result, domain error hierarchy
    application/             # UseCase interface, EventBus port
    infrastructure/
      database/              # MongooseModule setup, BaseMongoRepository (auto orgId scoping), base schema
      tenancy/                # AsyncLocalStorage TenantContext + middleware, JWT payload, auth cookies
      events/                 # in-memory EventBus implementation
      filters/                # global exception filter (DomainError -> HTTP)
      logging/                # pino config
    interface/
      guards/                 # JwtAuthGuard, RolesGuard, RequireOrgGuard
      decorators/              # @CurrentUser, @Roles
  modules/
    iam/          # Organization, User, Auth (signup/login/refresh/logout/profile), onboarding
    clients/       # "Stop" in the UI — client offices agents visit
    activities/    # visit logs
    issues/
    tasks/
    flags/
    analytics/     # read-only aggregations over the other modules' repository ports
```

Each domain module (`clients`, `activities`, `issues`, `tasks`, `flags`) follows the same shape:

```
<module>/
  domain/entities/, domain/repositories/ (port interfaces)
  application/use-cases/
  infrastructure/schemas/ (Mongoose), infrastructure/repositories/ (implements the port)
  interface/controllers/, interface/dto/ (class-validator)
  <module>.module.ts
```

Controllers depend only on use-cases; use-cases depend only on repository **ports** (interfaces
defined in `domain/`), never on Mongoose directly — infrastructure is swappable without touching
business logic.

### Multi-tenancy

Tenant isolation is structural, not a per-query convention:

1. `TenantContextMiddleware` runs on every request, verifies the access-token cookie, and — if
   valid — runs the rest of the request inside `AsyncLocalStorage.run({ orgId, userId, role })`.
2. `BaseMongoRepository` (used by every domain-module repository) reads `TenantContext.get()` and
   folds `orgId` into every query/insert automatically, **throwing if no tenant context exists**.
   A subclass has no code path to issue an unscoped query.
3. `IamModule`'s `Organization` and `User` repositories deliberately do **not** extend
   `BaseMongoRepository` — organizations are the tenant boundary itself, and users must be
   resolvable by email alone before they have an `orgId` (pre-onboarding).
4. `RequireOrgGuard` blocks every domain-module route until onboarding (`POST /v1/org`) completes.

### Auth

JWT access token (15m, httpOnly cookie) + rotating refresh token (7d, httpOnly cookie, scoped to
`/v1/auth/refresh`). Passwords hashed with argon2. Roles: `org_admin`, `manager`, `agent` — the
account that signs up first becomes `org_admin` (there's no invite flow in the UI yet).

### Domain events

`Issue.resolve()`, `Task.complete()`, and `Flag.resolve()` emit domain events through the
`EVENT_BUS` port (`shared/application/ports/event-bus.port.ts`), currently bound to an in-process
`InMemoryEventBus`. No subscribers are wired yet — this exists so a future integration (Slack
notification, webhook, real broker) can subscribe without touching any use-case.

## Getting started

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI and generate JWT secrets (see comments in the file)
npm run start:dev
```

- API: `http://localhost:3000/v1/...`
- Swagger docs: `http://localhost:3000/docs`
- Health check: `http://localhost:3000/health` (verifies Mongo connectivity)

## Testing

```bash
npm test          # unit tests — use-cases and domain entities against in-memory fakes, no DB needed
npm run test:e2e   # full HTTP flow against mongodb-memory-server, including a tenant-isolation test
```

## Deploying (manual)

No Docker/Kubernetes — this ships as a plain Node process, e.g. under PM2:

```bash
npm run build
pm2 start ecosystem.config.js --env production
```

Make sure the real `.env` (or your process manager's env injection) provides `MONGODB_URI`,
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `CORS_ORIGIN` matching the deployed UI's origin.
PM2 does not read `.env` files itself — load it via your shell profile, `dotenv-cli`, or a systemd
`EnvironmentFile` before starting PM2.

## API surface

All routes are versioned under `/v1`. Auth is cookie-based (`withCredentials: true` on the client).

| Module | Routes |
| --- | --- |
| auth | `POST /v1/auth/{signup,login,logout,refresh,profile}` |
| org | `POST /v1/org` (onboarding) |
| clients | `GET/POST /v1/clients`, `GET/PATCH/DELETE /v1/clients/:id` |
| activities | `GET/POST /v1/activities` |
| issues | `GET/POST /v1/issues`, `POST /v1/issues/:id/resolve` |
| tasks | `GET/POST /v1/tasks`, `POST /v1/tasks/:id/complete` |
| flags | `GET/POST /v1/flags`, `POST /v1/flags/:id/resolve` |
| analytics | `GET /v1/analytics/summary` |

`list`/`resolve`/`complete` on issues, tasks, and flags are restricted to `org_admin`/`manager`
(matches the UI's "Tasks & Issues" page being admin/manager-only); raising them is open to any
authenticated, onboarded user (an agent creates them while logging a visit).
