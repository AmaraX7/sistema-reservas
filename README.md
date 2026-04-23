# Unibook API

REST API for managing university resource reservations — classrooms, laptops, and lab equipment. Built with NestJS, PostgreSQL, and deployed on Render.

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

**Single resource entity** — all resource types (classroom, laptop, lab equipment) share a single `Resource` entity with a `type` field. Subclasses were considered but discarded: if everything is reserved the same way, they are not different classes — they are the same object with a different type. This keeps the design simple and extensible: adding a new resource type requires zero code changes.

**JWT authentication with refresh tokens** — stateless auth with short-lived access tokens (configurable via `JWT_EXPIRES_IN`) and long-lived refresh tokens (`JWT_REFRESH_EXPIRES_IN`). When the access token expires, the client calls `POST /auth/refresh` to get a new one without requiring the user to log in again. Guards and roles are applied at the controller level, keeping business logic clean in services.

**Role-based access control** — custom `RolesGuard` reads metadata set by the `@Roles()` decorator. Admins manage resources and see all reservations; users manage their own.

**Overlap detection with pessimistic locking** — when creating a reservation, the system queries for any CONFIRMED reservation on the same resource where `startTime < other.endTime AND endTime > other.startTime`. The check runs inside a database transaction with a `pessimistic_write` lock, preventing race conditions where two concurrent requests could both pass the overlap check and create conflicting reservations.

**Pagination** — `GET /resources` and `GET /reservations/all` accept `?page` and `?limit` query parameters. Results are returned as `{ data: [...], total }` so clients can calculate page counts.

**Database migrations** — `synchronize: false` in production. Migrations run automatically on deploy via the Dockerfile CMD.

**Global exception filter** — all errors return a consistent JSON format with `statusCode`, `message`, `timestamp`, and `path`.

---

## Endpoints

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Create a new account | Public |
| POST | /auth/login | Login and get tokens | Public |
| POST | /auth/refresh | Get new access token | Public |

### Resources

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /resources?page=1&limit=10 | List resources (paginated) | Public |
| GET | /resources/:id | Get resource detail | Public |
| POST | /resources | Create a resource | Admin |
| PATCH | /resources/:id | Update a resource | Admin |
| DELETE | /resources/:id | Delete a resource | Admin |

### Reservations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /reservations | Create a reservation | User |
| GET | /reservations/my | Get my reservations | User |
| GET | /reservations/:id | Get reservation detail | User |
| PATCH | /reservations/:id/status | Update reservation status | User/Admin |
| GET | /reservations/all?page=1&limit=10 | Get all reservations (paginated) | Admin |

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /users/by-email/:email | Find user by email | Admin |
| PATCH | /users/:id/role | Update user role | Admin |
| DELETE | /users/:id | Delete user | Admin |

---

## Business logic

### Creating a reservation

1. Verify the resource exists
2. Verify `startTime < endTime`
3. Acquire a pessimistic write lock and check for overlapping CONFIRMED reservations on the same resource
4. If no conflict → status set to CONFIRMED automatically, transaction committed
5. If conflict → 400 Bad Request, transaction rolled back

### Updating reservation status

- `CANCELLED` → only the reservation owner
- `COMPLETED` → admin only
- `CONFIRMED` → cannot be set manually; assigned automatically on creation

### Token flow

- `POST /auth/login` returns `{ access_token, refresh_token }`
- Use `access_token` in the `Authorization: Bearer` header for all protected routes
- When `access_token` expires, send `refresh_token` to `POST /auth/refresh` to get new tokens without logging in again

---

## Run locally

### With Docker

```bash
git clone https://github.com/your-username/unibook-api
cd unibook-api
cp .env.example .env   # fill in your values
docker-compose up --build
```

### Without Docker

```bash
npm install
npm run start:dev
```

### Seed the database

```bash
npx ts-node src/seed.ts
```

Inserts 10 resources, 5 users, and 5 reservations for local testing. All users have password `password123`.

---

## Environment variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=university_reservations
JWT_SECRET=a_long_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=a_different_long_secret_key
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
```

---

## Run migrations

```bash
npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
```

---

## Project structure

```
src/
├── auth/           # JWT auth, guards, roles decorator, refresh token logic
├── users/          # User entity, service, controller
├── resources/      # Resource entity, service, controller
├── reservations/   # Reservation entity, overlap logic, pessimistic locking, service, controller
├── common/         # Global exception filter, pagination DTO
├── migrations/     # TypeORM migrations
└── seed.ts         # Database seeder for local development
```