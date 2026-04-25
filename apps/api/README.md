# Unibook API

REST API for managing coworking space reservations. Companies manage their own spaces and users; end users discover and book available resources by time slot. Built with NestJS, PostgreSQL, and deployed on Render + Supabase.

**Production**: https://unibook-api.onrender.com  
**Swagger docs**: https://unibook-api.onrender.com/api

---

## Stack

- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL + TypeORM
- **Auth**: JWT with Passport (access token + refresh token)
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger (@nestjs/swagger)
- **Rate limiting**: @nestjs/throttler
- **Deployment**: Docker + Render + Supabase

---

## Architecture decisions

**Multi-tenant company model** — each `Resource` and `User` belongs to a `Company`. A `COMPANY_ADMIN` can only manage resources and users within their own company. A `SUPER_ADMIN` manages everything across all companies. Tenant isolation is enforced at the service layer using `ForbiddenException`, not at the database level.

**Single resource entity** — all resource types (desk, meeting room, phone booth, lounge, parking) share a single `Resource` entity with a `type` field. Subclasses were considered and discarded: if everything is reserved the same way, they are not different classes — they are the same object with a different type. Adding a new resource type requires zero code changes.

**JWT authentication with refresh tokens** — stateless auth with short-lived access tokens (`JWT_EXPIRES_IN`) and long-lived refresh tokens (`JWT_REFRESH_EXPIRES_IN`). The token payload includes `userId`, `email`, `role`, and `companyId` so tenant filtering requires no extra database lookups. When the access token expires, the client calls `POST /auth/refresh` to get a new pair without requiring the user to log in again.

**Role-based access control** — custom `RolesGuard` reads metadata set by the `@Roles()` decorator via `Reflector`. Three roles exist: `USER`, `COMPANY_ADMIN`, and `SUPER_ADMIN`. The guard compares `req.user.role` against the required roles; if none are defined, the route is public.

**Overlap detection with pessimistic locking** — when creating a reservation, the system queries for any `CONFIRMED` reservation on the same resource where `startTime < other.endTime AND endTime > other.startTime`. The check runs inside a database transaction with a `pessimistic_write` lock, preventing race conditions where two concurrent requests could both pass the overlap check and create conflicting reservations.

**Manual transaction management** — reservation creation uses `QueryRunner` directly (`connect → startTransaction → commit/rollback → release`) to guarantee atomicity across the overlap check and the insert.

**Pagination** — `GET /resources` and `GET /reservations/all` accept `?page` and `?limit` query parameters. Results are returned as `{ data: [...], total }` so clients can calculate page counts client-side.

**Database migrations** — `synchronize: false` in production. Migrations run automatically on deploy via the Dockerfile `CMD`.

**Global exception filter** — all errors return a consistent JSON format: `statusCode`, `message`, `timestamp`, `path`.

**Rate limiting** — `@nestjs/throttler` limits requests per IP across all endpoints. The `/health` route is excluded via `@SkipThrottle()`.

---

## Roles

| Role | Permissions |
|------|-------------|
| `USER` | Register, login, create reservations, view and cancel own reservations, manage own account |
| `COMPANY_ADMIN` | Everything USER can do + manage resources and users within their company, view reservations for their company's resources |
| `SUPER_ADMIN` | Full access — manage all companies, users, resources, and reservations |

---

## Endpoints

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Create a new account | Public |
| POST | /auth/login | Login and get tokens | Public |
| POST | /auth/refresh | Refresh access token | Public |

### Companies

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /companies | Create a company | SUPER_ADMIN |
| GET | /companies | List all companies | SUPER_ADMIN |
| GET | /companies/:id | Get company detail | SUPER_ADMIN |
| PATCH | /companies/:id | Update a company | SUPER_ADMIN |
| DELETE | /companies/:id | Delete a company | SUPER_ADMIN |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /users/me | Get own profile | User |
| PATCH | /users/me | Update own profile | User |
| DELETE | /users/me | Delete own account | User |
| GET | /users | List users (SUPER_ADMIN: all, COMPANY_ADMIN: own company) | SUPER_ADMIN / COMPANY_ADMIN |
| GET | /users?email= | Find user by email | SUPER_ADMIN |
| PATCH | /users/:id/role | Update user role | SUPER_ADMIN / COMPANY_ADMIN |
| DELETE | /users/:id | Delete a user | SUPER_ADMIN / COMPANY_ADMIN |

### Resources

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /resources?page=1&limit=10 | List resources, filter by ?companyId | Public |
| GET | /resources/:id | Get resource detail | Public |
| POST | /resources | Create a resource | SUPER_ADMIN / COMPANY_ADMIN |
| PATCH | /resources/:id | Update a resource | SUPER_ADMIN / COMPANY_ADMIN |
| DELETE | /resources/:id | Delete a resource | SUPER_ADMIN / COMPANY_ADMIN |

### Reservations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /reservations | Create a reservation | User |
| GET | /reservations/me | Get own reservations | User |
| GET | /reservations/:id | Get reservation detail | User |
| PATCH | /reservations/:id/status | Update reservation status | User / COMPANY_ADMIN |
| GET | /reservations/all?page=1&limit=10 | Get all reservations | SUPER_ADMIN / COMPANY_ADMIN |

---

## Business logic

### Creating a reservation

1. Verify the resource exists (inside the transaction)
2. Verify `startTime < endTime`
3. Acquire a pessimistic write lock and check for overlapping `CONFIRMED` reservations on the same resource
4. If no conflict → status set to `CONFIRMED` automatically, transaction committed
5. If conflict → `400 Bad Request`, transaction rolled back

### Updating reservation status

- `CANCELLED` → only the reservation owner
- `COMPLETED` → `COMPANY_ADMIN` or `SUPER_ADMIN` only
- `CONFIRMED` → cannot be set manually; assigned automatically on creation

### Company admin isolation

- `COMPANY_ADMIN` creating a resource always has `companyId` forced from their JWT — the request body value is ignored
- `COMPANY_ADMIN` updating or deleting a resource from another company receives `403 Forbidden`
- `COMPANY_ADMIN` managing users outside their company receives `403 Forbidden`
- `COMPANY_ADMIN` cannot assign the `SUPER_ADMIN` role to any user

### Token flow

1. `POST /auth/login` returns `{ access_token, refresh_token }`
2. Use `access_token` in the `Authorization: Bearer` header for all protected routes
3. When `access_token` expires and a `401` is received, send `refresh_token` to `POST /auth/refresh`
4. Store the new token pair and retry the original request — the user never notices

---

## Run locally

### With Docker (recommended)

```bash
git clone https://github.com/your-username/unibook-api
cd unibook-api
cp .env.example .env   # fill in your values
make up
```

### Without Docker

```bash
npm install
npm run start:dev
```

### Useful Makefile commands

```bash
make up                # docker-compose up --build
make down              # docker-compose down
make down-v            # docker-compose down -v (wipes database)
make logs              # docker-compose logs -f
make dev               # npm run start:dev
make migration-generate name=MigrationName
make migration-run
make migration-revert
make seed              # seed local database
make seed-docker       # seed database running in Docker
```

---

## Seed

Inserts 3 companies, 9 users (1 super admin, 3 company admins, 5 regular users), 15 resources, and 8 reservations for local testing. All passwords are `password123`.

| Email | Role | Company |
|-------|------|---------|
| super@admin.com | SUPER_ADMIN | — |
| admin@wework.com | COMPANY_ADMIN | WeWork Barcelona |
| admin@spaces.com | COMPANY_ADMIN | Spaces Diagonal |
| admin@mob.com | COMPANY_ADMIN | MOB Makers |
| alice@gmail.com | USER | — |
| bob@gmail.com | USER | — |

---

## Environment variables

```env
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=your_db_name
JWT_SECRET=a_long_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=a_different_long_secret_key
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
```

---

## Run migrations

```bash
make migration-run
# or directly:
npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
```

---

## Project structure

```
src/
├── auth/           # JWT auth, guards, roles decorator, refresh token logic
├── companies/      # Company entity, service, controller (SUPER_ADMIN only)
├── users/          # User entity, service, controller, /me endpoints
├── resources/      # Resource entity, service, controller, company isolation
├── reservations/   # Reservation entity, overlap logic, pessimistic locking
├── common/         # Global exception filter, pagination DTO
├── migrations/     # TypeORM migrations
├── data-source.ts  # TypeORM DataSource config
└── seed.ts         # Database seeder for local development
```