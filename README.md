# Unibook API

REST API for managing university resource reservations — classrooms, laptops, and lab equipment. Built with NestJS, PostgreSQL, and deployed on Render.

🔗 **Production**: https://unibook-api.onrender.com  
📖 **Swagger docs**: https://unibook-api.onrender.com/api

---

## Stack

- **Framework**: NestJS (Node.js + TypeScript)
- **Database**: PostgreSQL + TypeORM
- **Auth**: JWT with Passport
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger (@nestjs/swagger)
- **Deployment**: Docker + Render + Supabase

---

## Architecture decisions

- **Single resource entity** — all resource types (classroom, laptop, lab equipment) share a single `Resource` entity with a `type` field. Subclasses were considered but discarded: if everything is reserved the same way, they are not different classes — they are the same object with a different type. This keeps the design simple and extensible: adding a new resource type requires zero code changes.
- **JWT authentication** — stateless auth with access tokens. Guards and roles are applied at the controller level, keeping business logic clean in services.
- **Role-based access control** — custom `RolesGuard` reads metadata set by `@Roles()` decorator. Admins manage resources and see all reservations; users manage their own.
- **Overlap detection** — when creating a reservation, the system queries for any CONFIRMED reservation on the same resource where `startTime < other.endTime AND endTime > other.startTime`. Conflict returns a 400.
- **Database migrations** — `synchronize: false` in production. Migrations run automatically on deploy via the Dockerfile CMD.
- **Global exception filter** — all errors return a consistent JSON format with `statusCode`, `message`, `timestamp`, and `path`.

---

## Endpoints

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /auth/register | Create a new account | Public |
| POST | /auth/login | Login and get JWT token | Public |

### Resources
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /resources | List all resources | Public |
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
| GET | /reservations/all | Get all reservations | Admin |

### Users
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /users/by-email/:email | Find user by email | Admin |
| PATCH | /users/:id/role | Update user role | Admin |
| DELETE | /users/:id | Delete user | Admin |

---

## Business logic

### Creating a reservation
1. Verify the resource exists and is AVAILABLE
2. Verify `startTime < endTime`
3. Check for overlapping CONFIRMED reservations on the same resource
4. If no conflict → status set to CONFIRMED automatically
5. If conflict → 400 Bad Request

### Updating reservation status
- `CANCELLED` → only the reservation owner
- `COMPLETED` → admin only
- `CONFIRMED` → not allowed manually, set automatically on creation

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

---

## Environment variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=university_reservations
JWT_SECRET=a_long_secret_key
JWT_EXPIRES_IN=7d
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
├── auth/           # JWT auth, guards, roles decorator
├── users/          # User entity, service, controller
├── resources/      # Resource entity (STI), service, controller
├── reservations/   # Reservation entity, overlap logic, service, controller
├── common/         # Global exception filter
└── migrations/     # TypeORM migrations
```