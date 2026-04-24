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

### Resource
- id, name, description, location, status, type, createdAt
- status enum: AVAILABLE | UNAVAILABLE | MAINTENANCE
- type: string libre (classroom, laptop, lab, bike, book...) — sin subclases, un solo objeto con tipo
- Relacion: tiene muchas Reservations

### User
- id, email, password, role (USER | ADMIN), createdAt
- Relacion: tiene muchas Reservations

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
- ADMIN → puede hacer todo lo anterior + gestionar recursos + ver todas las reservas + completar reservas + gestionar usuarios

## Estado actual
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
- ✅ GET/PATCH/DELETE /users/me

falta por hacer: 
 
 Tests Jest
 WebSockets
 Chatbot IA
 Bot Telegram
 Frontend React

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