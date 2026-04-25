# Proyecto: Unibook API — Sistema de Reservas Universitario

## Que es esto
API REST para gestionar la reserva de recursos universitarios (salas, portátiles, material de laboratorio, etc.).
Los usuarios pueden ver qué recursos hay disponibles, hacer una reserva por franja horaria, y el sistema detecta conflictos de solapamiento automáticamente.

## Stack
- **Framework**: NestJS (Node.js + TypeScript)
- **Base de datos**: PostgreSQL con TypeORM
- **Auth**: JWT con Passport + Refresh tokens
- **Validacion**: class-validator + class-transformer
- **Documentacion**: Swagger automatico (@nestjs/swagger)
- **Rate limiting**: @nestjs/throttler
- **Tests**: Jest
- **Despliegue**: Docker + Render + Supabase

## Contexto del desarrollador
- Estudiante de ultimo ano de ingenieria informatica (mencion software)
- Buena base en C++, Java, algo de Python/Django
- Conoce conceptos de arquitectura de software, REST, OpenAPI, diagramas UML
- Familiarizado con PostgreSQL y Docker
- Es su primer proyecto real con NestJS y TypeScript - priorizar claridad sobre elegancia

## URLs
- **Produccion**: https://unibook-api.onrender.com
- **Swagger**: https://unibook-api.onrender.com/api

## Estructura de modulos

```text
src/
|-- app.module.ts
|-- main.ts
|-- auth/
|   |-- auth.module.ts
|   |-- auth.controller.ts
|   |-- auth.service.ts
|   |-- jwt.strategy.ts
|   |-- jwt-auth.guard.ts
|   |-- roles.guard.ts
|   |-- roles.decorator.ts
|   \-- dto/
|       |-- register.dto.ts
|       |-- login.dto.ts
|       \-- refresh.dto.ts
|-- companies/
|   |-- companies.module.ts
|   |-- companies.controller.ts
|   |-- companies.service.ts
|   |-- entities/
|   |   \-- company.entity.ts
|   \-- dto/
|       |-- create-company.dto.ts
|       \-- update-company.dto.ts
|-- users/
|   |-- users.module.ts
|   |-- users.controller.ts
|   |-- users.service.ts
|   |-- entities/
|   |   \-- user.entity.ts
|   \-- dto/
|       |-- create-user.dto.ts
|       \-- update-role.dto.ts
|-- resources/
|   |-- resources.module.ts
|   |-- resources.controller.ts
|   |-- resources.service.ts
|   |-- entities/
|   |   \-- resource.entity.ts
|   \-- dto/
|       |-- create-resource.dto.ts
|       \-- update-resource.dto.ts
|-- reservations/
|   |-- reservations.module.ts
|   |-- reservations.controller.ts
|   |-- reservations.service.ts
|   |-- entities/
|   |   \-- reservation.entity.ts
|   \-- dto/
|       |-- create-reservation.dto.ts
|       \-- update-reservation.dto.ts
|-- common/
|   |-- filters/
|   |   \-- http-exception.filter.ts
|   \-- dto/
|       \-- pagination.dto.ts
|-- migrations/
\-- seed.ts
```

## Entidades principales

### Company
- id, name, description, createdAt
- Relacion: tiene muchas Resources, tiene muchos Users

### Resource
- id, name, description, location, status, type, capacity (nullable), companyId, createdAt
- status enum: AVAILABLE | UNAVAILABLE | MAINTENANCE
- type: string libre (desk, meeting_room, phone_booth, lounge, parking)
- Relacion: tiene muchas Reservations, pertenece a una Company

### User
- id, email, password, role (USER | COMPANY_ADMIN | SUPER_ADMIN), companyId (nullable), createdAt
- Relacion: tiene muchas Reservations, pertenece a una Company (nullable)

### Reservation (tabla asociativa entre User y Resource)
- id, userId, resourceId, startTime, endTime, status, createdAt
- status enum: CONFIRMED | CANCELLED | COMPLETED
- Se confirma automaticamente si no hay solapamiento

## Decisiones de arquitectura

- **Una sola entidad Resource con campo type** — se descartaron subclases porque si todo se reserva igual, no son clases distintas, son el mismo objeto con tipo diferente. Mas simple y extensible
- **JWT stateless con refresh tokens** — access token de vida corta, refresh token de vida larga. POST /auth/refresh renueva el access token sin requerir login. El token contiene id, email y role
- **RolesGuard + @Roles decorator** — el decorador guarda el rol requerido como metadata, el guard lo lee con Reflector y compara con req.user.role
- **Deteccion de solapamiento con bloqueo pesimista** — query con LessThan/MoreThan sobre reservas CONFIRMED del mismo recurso, dentro de una transaccion con pessimistic_write lock para evitar race conditions
- **QueryRunner para reservas** — el metodo create usa transaccion manual (connect, startTransaction, commit, rollback, release) para garantizar atomicidad
- **Paginacion con findAndCount** — GET /resources y GET /reservations/all aceptan ?page y ?limit, devuelven { data, total }
- **Migraciones con synchronize: false en produccion** — las migraciones corren automaticamente en el CMD del Dockerfile al desplegar
- **Filtro global de excepciones** — todas las respuestas de error tienen el mismo formato: statusCode, message, timestamp, path
- **Rate limiting** — @nestjs/throttler limita requests por IP
- **Multi-tenancy con Company** — cada Resource pertenece a una Company. COMPANY_ADMIN solo puede gestionar resources y usuarios de su empresa. SUPER_ADMIN gestiona todo. La jerarquía se aplica en el Service con ForbiddenException
- **companyId en JWT** — el token incluye id, email, role y companyId para que los guards puedan filtrar por empresa sin consultar la BD
- **Chatbot con Gemini 2.5 Flash** — integración con @google/generative-ai.
  Se descartó generateContent en favor de startChat para mantener historial
  de conversación por sesión. Cada usuario tiene su propio sessionId.

- **SessionId como clave de conversación** — el cliente genera un sessionId
  (UUID o id de Telegram) y lo manda en cada request. El backend guarda
  las sesiones en un Map<string, any> en memoria. No persiste entre reinicios
  del servidor, suficiente para MVP.

- **System prompt dinámico con datos reales** — en vez de un prompt estático,
  se consulta la BD antes de cada nueva sesión y se inyecta el contexto
  de recursos y disponibilidad en el systemInstruction de Gemini.

- **Caché en memoria para el chatbot** — para evitar abusos y reducir carga
  en la BD, los recursos se cachean 5 minutos y la disponibilidad 1 minuto.
  Se implementó con un objeto privado { data, expiresAt } y Date.now().
  Sin Redis, solución simple suficiente para el volumen actual.

- **Disponibilidad calculada por recurso** — se llama a getAvailability()
  para cada recurso con Promise.all() para que las queries sean paralelas
  en vez de secuenciales. La fecha es siempre la del día actual.

- **Bot de Telegram con Telegraf** — TelegramModule con TelegramService
  que implementa OnModuleInit para lanzar el bot al arrancar la app.
  Usa el id de Telegram del usuario (ctx.from.id) como sessionId,
  conectando directamente con ChatbotService. Sin controller porque
  Telegram funciona con polling, no con endpoints REST.

- **Rate limiting del chatbot** — protegido por el throttler global
  (20 req/60s por IP) más la caché en memoria que evita consultas
  repetidas a la BD.

## Endpoints principales

### Auth
- POST /auth/register - crear cuenta → { access_token, refresh_token }
- POST /auth/login - obtener JWT → { access_token, refresh_token }
- POST /auth/refresh - renovar access token con refresh token

### Users (todos protegidos, admin)
- GET /users/by-email/:email - buscar usuario por email
- PATCH /users/:id/role - cambiar rol de usuario
- DELETE /users/:id - eliminar usuario

### Resources (publico para GET, admin para mutaciones)
- GET /resources?page=1&limit=10 - listar recursos paginados
- GET /resources/:id - detalle de un recurso
- POST /resources - crear recurso
- PATCH /resources/:id - actualizar recurso
- DELETE /resources/:id - eliminar recurso

### Reservations (todos protegidos con JWT)
- POST /reservations - crear reserva (verifica solapamiento, confirma automaticamente)
- GET /reservations/my - reservas del usuario autenticado
- GET /reservations/:id - detalle de una reserva
- PATCH /reservations/:id/status - actualizar estado
- GET /reservations/all?page=1&limit=10 - todas las reservas (admin)

### Companies (todos SUPER_ADMIN)
- POST /companies
- GET /companies
- GET /companies/:id
- PATCH /companies/:id
- DELETE /companies/:id

## Logica de negocio importante

### Al crear una reserva
1. Verificar que el recurso existe (dentro de la transaccion)
2. Verificar que startTime < endTime
3. Verificar solapamiento con lock pesimista (pessimistic_write): startTime < otraReserva.endTime AND endTime > otraReserva.startTime
4. Si ok → status CONFIRMED automaticamente + commit
5. Si solapamiento → BadRequestException + rollback

### Al actualizar estado
- CANCELLED → solo el propio usuario sobre su reserva
- COMPLETED → solo admin
- CONFIRMED → no se puede cambiar manualmente

### Refresh tokens
- access_token: vida corta (JWT_EXPIRES_IN)
- refresh_token: vida larga (JWT_REFRESH_EXPIRES_IN), secret distinto (JWT_REFRESH_SECRET)
- POST /auth/refresh verifica el refresh token y devuelve tokens nuevos sin necesidad de login

### Roles
- USER → puede crear reservas, ver las suyas, cancelar las suyas
- COMPANY_ADMIN → gestiona resources y usuarios de su empresa, ve reservas de su empresa
- SUPER_ADMIN → gestiona todo, incluyendo empresas y usuarios de cualquier empresa

## Estado actual actualizado
- ✅ Auth completo (register, login, JWT, guards, roles, refresh tokens)
- ✅ Users (entidad, servicio, controller, roles)
- ✅ Resources (CRUD completo, paginacion)
- ✅ Reservations (crear, cancelar, completar, solapamiento, bloqueo pesimista, paginacion)
- ✅ Filtro global de excepciones
- ✅ Swagger
- ✅ Rate limiting
- ✅ Logs (middleware y servicios)
- ✅ Docker + despliegue en Render + Supabase
- ✅ Migraciones con TypeORM
- ✅ README
- ✅ Seed script
- ✅ Companies (CRUD completo, solo SUPER_ADMIN)
- ✅ Multi-tenancy (Company → Resource, Company → User)
- ✅ GET/PATCH/DELETE /users/me
- ✅ Makefile (dev, seed, migrations, docker)
- ✅ Pivot a dominio coworking
- ✅ Tests Jest E2E
- ✅ Chatbot IA con Gemini 2.5 Flash
- ✅ Historial de conversación con startChat
- ✅ Caché en memoria para recursos y disponibilidad
- ✅ Bot de Telegram con Telegraf

## Pendiente
- [ ] Frontend Next.js
- [ ] WebSockets para notificaciones en tiempo real
- [ ] Tests unitarios ReservationsService
## Roadmap

### Fase 2 — Backend production-ready (completada)
- ✅ Rate limiting con @nestjs/throttler
- ✅ Logs estructurados con NestJS Logger
- ✅ Refresh tokens — POST /auth/refresh
- ✅ Paginacion — GET /resources?page=1&limit=10
- [ ] Tests unitarios Jest del ReservationsService

### Fase 3 — Chatbot IA
- Integracion con API de Gemini o Claude
- Asistente en lenguaje natural: "me voy de vacaciones con 4 personas, que me recomiendas?"
- El chatbot entiende el contexto y llama a los endpoints internamente

### Fase 4 — Bot Telegram
- Bot de Telegram conectado al backend
- Los usuarios pueden hacer reservas desde Telegram
- Notificaciones de cambio de estado en tiempo real

### Fase 5 — Frontend
- React frontend
- WebSockets para notificaciones en tiempo real

## Reglas de desarrollo
- Usar DTOs con validadores en todos los endpoints
- Nunca exponer password en ninguna respuesta
- Manejar errores con excepciones de NestJS
- Separar logica de negocio en el Service
- Variables de entorno en .env
- Swagger en todos los endpoints
- Migraciones para cualquier cambio de esquema en produccion

## Variables de entorno (.env)

```env
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_NAME=university_reservations
JWT_SECRET=una_clave_secreta_larga
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=otro_secret_diferente_largo
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
```

## Como pedir ayuda
- En que fase/tarea estas
- Que estas intentando hacer
- El error exacto
- El codigo relevante