PROD_HOST=aws-1-eu-central-1.pooler.supabase.com
PROD_DB=postgres
PROD_PORT=5432


# ─── Dev ───────────────────────────────────────────────────────────────────────
dev:
	npm run start:dev

seed:
	npx ts-node src/seed.ts

# ─── Migrations ────────────────────────────────────────────────────────────────
migration-generate:
	npx typeorm-ts-node-commonjs migration:generate -d src/data-source.ts src/migrations/$(name)

migration-run:
	npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts

migration-revert:
	npx typeorm-ts-node-commonjs migration:revert -d src/data-source.ts

# ─── Docker ────────────────────────────────────────────────────────────────────
up:
	docker-compose up --build

down:
	docker-compose down

down-v:
	docker-compose down -v

logs:
	docker-compose logs -f

seed-docker:
	docker exec -it sistema-reservas-app-1 npx ts-node src/seed.ts

migration-run-docker:
	docker exec -it sistema-reservas-app-1 npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts


# ─── Production ────────────────────────────────────────────────────────────────
migration-run-prod:
	npx cross-env DB_HOST=$(PROD_HOST) DB_PORT=$(PROD_PORT) DB_USERNAME=$(PROD_USER) DB_PASSWORD=$(PROD_PASSWORD) DB_NAME=$(PROD_DB) npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts

migration-revert-prod:
	npx cross-env DB_HOST=$(PROD_HOST) DB_PORT=$(PROD_PORT) DB_USERNAME=$(PROD_USER) DB_PASSWORD=$(PROD_PASSWORD) DB_NAME=$(PROD_DB) npx typeorm-ts-node-commonjs migration:revert -d src/data-source.ts

seed-prod:
	npx cross-env DB_HOST=$(PROD_HOST) DB_PORT=$(PROD_PORT) DB_USERNAME=$(PROD_USER) DB_PASSWORD=$(PROD_PASSWORD) DB_NAME=$(PROD_DB) npx ts-node src/seed.ts