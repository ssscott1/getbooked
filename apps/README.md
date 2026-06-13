# apps/

Application surfaces (brief §4). These are scaffolded with their framework CLIs at
milestone M2 kickoff rather than hand-written boilerplate:

| App | Stack | Generated with |
|---|---|---|
| `web/` | Next.js + TypeScript + Tailwind — consumer marketplace (SSR/SEO) and practice portal | `create-next-app` |
| `api/` | NestJS modular monolith — core API; integration service is a separately deployable entrypoint | `@nestjs/cli` |

Both consume the workspace packages:

- `@getbooked/db` — Prisma data model
- `@getbooked/xestro` — PMS integration layer (`PmsConnector`, slot holds, patient match)
- `@getbooked/ai` — referral extraction + synonym mapping

Module boundaries, the booking path, and degradation rules are specified in
[`docs/architecture.md`](../docs/architecture.md).
