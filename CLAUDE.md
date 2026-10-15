# ordenalink-back

REST API for OrdenaLink (digital menu, QR orders and loyalty for restaurants). NestJS 12 + MongoDB 8 (Mongoose 9) + JWT, pnpm, Docker. Consumed by the SPA in `../ordenalink-front`.

## Language

- **Code is in English**: identifiers, file names, comments, log messages, commit messages and this file.
- User-facing API messages (exception messages the front shows) are in **Spanish**, as today.
- `README.md` and `make help` descriptions are for the team and stay in Spanish.

## Documentation

- All docs live in the parent repo: `../docs/` (index `../docs/README.md`). This repo has no `docs/` folder; don't create one. Follow the standard in `../CLAUDE.md`.
- Read before designing: `../docs/architecture/backend-y-datos.md` (data model, endpoints), `../docs/architecture/seguridad.md` (multi-tenancy, controls), `../docs/decisions/README.md` (ADRs).
- A change to an endpoint, DTO, schema or business rule needs a docs PR in the parent repo (and `src/types` + `src/services` in the front). A change that contradicts an ADR needs a new ADR (`propuesta`) first.

## Commands (everything runs in Docker)

Never install anything on the host. The stack must be up (`make up-d`).

| Command | What it does |
| --- | --- |
| `make up-d` / `make down` | Start / stop API + local Mongo (replica set) + DbGate |
| `make check` | **Lint + typecheck + unit + e2e tests. Run before saying a change is done; never claim done if it fails.** |
| `make lint` · `make typecheck` · `make test` · `make test-e2e` | Each check on its own |
| `make format` | Prettier |
| `make add pkg=name [dev=1]` | Add a dependency (**ask first**, see AI rules) |
| `make bash` · `make mongo-shell` | Shell in the API / Mongo container |

## Architecture

**Pragmatic clean architecture inside feature modules.** Dependencies point inward: HTTP → application → domain. No generic layers for their own sake.

```
src/modules/<feature>/
  <feature>.module.ts
  <feature>.controller.ts       # HTTP only: route, guards, DTO in, DTO out
  <feature>.service.ts          # Application: orchestrates a use case (load, call domain, persist, emit)
  domain/                       # Pure TypeScript: rules, state machines, calculations. No Nest, no Mongoose
  dto/                          # Input DTOs (class-validator) and response DTOs
  schemas/                      # Mongoose schemas (persistence only)
  ports/ + adapters/            # Only for external systems (payments, billing, email, Google)
  <name>.spec.ts                # Unit tests next to the code
```

- **Controllers are thin**: no business logic, no model access. They map DTO → service call → response DTO.
- **Business rules go in `domain/`** as pure functions or small classes (order state machine, price and tax calculation, loyalty rules, plan limits). They are the most valuable code to unit test, and they never import from `@nestjs/*` or `mongoose`.
- **Services inject Mongoose models directly** (`@InjectModel`). Don't wrap every model in a generic repository: it adds a layer without benefit while we stay on MongoDB (ADR 0016). Extract a query into a dedicated provider only when it is reused by several services or is complex.
- **Ports and adapters for external systems**: an interface + injection token in `ports/`, the implementation in `adapters/` (e.g. `PaymentProvider` with `ManualPaymentProvider`, ADR 0002; `BillingProvider` for Stripe, ADR 0003). The domain and services depend on the interface, never on the SDK.
- Modules expose only what others need (`exports`); a module never reaches into another module's schemas.
- Dependency injection through the constructor only. Never `new` a provider inside another, never `moduleRef.get` as a service locator.

### Multi-tenancy (non-negotiable)

- Every query on tenant data filters by the tenant id **taken from the authenticated context** (today `businessId` from the JWT; `organizationId`/`branchId` after ADR 0019). Never from the body, query string or URL.
- A resource from another tenant answers **404**, not 403.
- Never spread a DTO into an update (`$set: { ...dto }`): list the allowed fields. Fields like `slug`, `businessId` or `role` are never mass-assignable.
- Public endpoints return explicit public DTOs (no `ownerId`, `stock`, internal config).

## Principles

- **SOLID**, applied as Nest does it: one reason to change per class (S); extend via new providers/strategies instead of growing `switch`es (O); implementations honor their interface contracts (L); small, focused interfaces for ports (I); depend on interfaces/tokens for external systems (D).
- **KISS** and **YAGNI**: the simplest code that solves today's requirement. Don't build fase 2 features "just in case"; ADRs say what must be prepared (e.g. `PaymentProvider`) and nothing more.
- **DRY with the rule of three**: duplicate once, extract on the third occurrence. Wrong abstractions cost more than duplication.
- **Early return**: validate and exit first, keep the happy path unindented. No `else` after `return`/`throw`.
- Composition over inheritance. No base service classes.

## Design patterns (use when they fit, not by default)

| Pattern | When | How in this codebase |
| --- | --- | --- |
| **Strategy** | Behavior that varies by configuration | `prepFlow` SIMPLE/KITCHEN (ADR 0012), `paymentFlow` PAY_AT_END/PAY_FIRST (ADR 0010), loyalty `ruleType` PER_VISIT/PER_ITEM. One class per variant behind a shared interface |
| **Registry** | Pick a strategy or adapter by key at runtime | A provider holding `Map<key, Strategy>` (e.g. payment providers by `provider` name). Replaces `switch` on type strings |
| **Factory** | Object creation with logic or config | Nest `useFactory` providers for configured clients; plain factory functions in domain; test data factories (`buildOrder({ ...overrides })`) |
| **Adapter / Port** | Any external system | See Architecture. Lets tests use fakes and keeps SDKs out of the domain |
| **State machine** | Entities with a lifecycle | Order and check status as an explicit transition table (from, to, allowed roles, guards) in `domain/`, validated in one place (research `2026-10-03-analisis-critico.md` §1) |
| **Observer / domain events** | A side effect owned by another module | e.g. `check.paid` → loyalty stamp. Emit an event instead of calling the other module's service. Needs `@nestjs/event-emitter`: ask before adding |
| **Unit of Work** | Several writes that must succeed together | Mongo session + `withTransaction`, already used in business registration. Pass the session explicitly |
| **Decorator** | Cross-cutting HTTP concerns | Nest guards, interceptors, pipes and custom decorators (`@StaffRoles`), not ad-hoc checks in each handler |

Avoid: manual singletons, service locators, god services (> ~300 lines or many unrelated methods → split by use case), generic `BaseRepository<T>`, patterns added "for the future".

## TypeScript

- `strict` plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch` (`tsconfig.json`). `make typecheck` must pass with 0 errors.
- **No `any`** (oxlint error). External or unknown data is `unknown` and gets narrowed or validated.
- **No `as` casts** except `as const` or with a comment explaining why the compiler can't know it. No non-null `!` except on DTO and schema properties.
- Explicit return types on exported functions and on every public service/controller method.
- `interface` for object contracts and ports; `type` for unions, mapped and derived types.
- String enums (`export enum OrderStatus { PENDING = 'PENDING' }`) for values persisted or exposed in the API, as the code already does (they work with `@IsEnum` and Mongoose `enum`). No numeric enums.
- Derive instead of duplicating: `PartialType`, `PickType`, `OmitType` from `@nestjs/mapped-types` for DTOs; `Pick`/`Omit` for plain types.
- `import type` for type-only imports, **except** classes used in constructor injection or as DTO/param types of decorated methods: those need a value import so `emitDecoratorMetadata` works. Breaking this fails at runtime with an undefined provider.
- `const` and `readonly` by default; don't mutate inputs.
- Always `await` promises or return them; no floating promises (oxlint type-aware error). Fire-and-forget only with `void` and a comment.

## Validation at the edges

- Every input is a DTO validated by the global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform` in `main.ts`). Put limits on every field (`@MaxLength`, `@Max`, `@ArrayMaxSize`).
- Separate input and response DTOs. Never return a Mongoose document or schema class directly from a controller.
- Environment variables: read through `ConfigService` (`getOrThrow` for required ones). Adding a variable means adding it to `.env.example`.
- Money is integer cents (`priceInCents`), dates are UTC, times shown in the branch timezone (front side).

## Errors

- Services throw Nest HTTP exceptions (`NotFoundException`, `ConflictException`, …) with a Spanish message for the user, as the existing code does.
- Code in `domain/` doesn't know HTTP: it throws domain errors (`class InvalidOrderTransitionError extends DomainError`). When the first one is added, add a global exception filter that maps `DomainError` subclasses to HTTP status codes.
- Never an empty `catch`. Catch only to add context, translate or recover, and rethrow otherwise.
- Use Nest's `Logger` (`private readonly logger = new Logger(X.name)`), never `console.log`. No passwords, tokens or personal data in logs.

## Security

- Secrets only in environment variables, never in code, fixtures or commits.
- Authorization = guard (role) **plus** ownership/tenant check in the query. "Is logged in" is never enough.
- Passwords hashed with bcrypt (cost 12, existing). Login errors are generic.
- Rate limiting, helmet and configurable CORS are pending (`../docs/architecture/seguridad.md`); don't add public endpoints that make that worse.

## Tests

Every change ships with tests. Test pyramid: many unit, some integration/e2e, few full flows.

- Runner: **Vitest** with SWC (`vitest.config.mts`, `vitest.config.e2e.mts`); `describe`/`it`/`expect`/`vi` are globals. SWC is required because Nest's DI needs decorator metadata.
- **Unit** (`src/**/*.spec.ts`, next to the code): all `domain/` logic, and services with mocked dependencies (`getModelToken(Model.name)` + `Test.createTestingModule`, `vi.fn()`).
- **E2E** (`test/**/*.e2e-spec.ts`, supertest): boot the app with `createTestApp()` / `closeTestApp()` from `test/support/test-app.ts`. Each file gets a throwaway database on the local compose Mongo, dropped at the end; the helper refuses to run against Atlas. Never touch the dev database.
- Mongoose props typed with an enum need an explicit `type: String` next to `enum`: SWC emits the enum object as design type and Mongoose would read it as a nested schema.
- **Tenant isolation**: every route with `:id` gets a test that uses tenant A's token on tenant B's id and expects 404.
- Build test data through the API with `test/support/fixtures.ts` (`registerBusiness`, `createCategory`, `createProduct`, `dineInOrder`, `http`). Use services or the raw connection only for what has no endpoint yet (e.g. creating an EMPLOYEE).
- A known gap or bug gets an `it.todo('<expected behavior>')` with a comment pointing to the doc or issue, never a test that asserts the wrong behavior.
- Arrange / Act / Assert. Names describe behavior: `it('returns 404 when the order belongs to another business')`.
- Tests are independent: no shared mutable state, no order dependence, build data with factories.
- **A bug fix starts with a test that reproduces the bug.**
- Coverage target: ≥ 80 % on domain logic (orders, loyalty, billing). Don't chase a global percentage with trivial tests.

## Git

- Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`), in English.
- Short-lived branches (`feat/…`, `fix/…`) and PRs; nothing goes straight to `main`.
- No pre-commit hooks (they would need Node on the host); `make check` and CI are the gate.

## Rules for the AI

- Before writing code, read the relevant docs in `../docs/` and the neighboring module; copy its structure and style.
- Make minimal, focused changes. Don't refactor or "improve" code that wasn't part of the request; mention it instead.
- Don't add dependencies without asking.
- If something is ambiguous or contradicts an ADR or spec, ask before assuming.
- Write or update tests with every change, then run `make check`. Report failures as they are; never call a change done while it fails.
- Record important decisions as an ADR `propuesta` in `../docs/decisions/` (never mark it `aceptada`).
- Don't commit or push unless asked.

## Known issues

- 5 `no-misused-spread` lint warnings: services spread DTOs into `create`/update data (`categories.service.ts`, `products.service.ts`). That's the mass-assignment risk in `../docs/architecture/seguridad.md`; fix by listing the allowed fields when touching those services. Warnings don't fail `make lint`; errors do.
- The codebase isn't Prettier-formatted yet. Format only the files you change (`pnpm exec prettier --write <files>` via `make bash`); a repo-wide `make format` belongs in its own commit.
- `AppController`/`AppService` are scaffold leftovers, not registered in `AppModule`.
- `proyecto.zip` is tracked in git and contains a `.env`: review and rotate secrets (backlog #1).
