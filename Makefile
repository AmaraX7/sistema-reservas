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