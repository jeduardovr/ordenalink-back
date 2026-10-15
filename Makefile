.NOTPARALLEL:
.DEFAULT_GOAL := help

COMPOSE      := docker compose
COMPOSE_DB   := $(COMPOSE) --profile localdb
COMPOSE_ATLAS := $(COMPOSE) -f docker-compose.yml -f docker-compose.atlas.yml
COMPOSE_PROD := docker compose -f docker-compose.prod.yml
API          := api
# Store the image installed node_modules from (Dockerfile cache mount); pnpm
# refuses to add packages when the store differs.
PNPM_STORE   := /pnpm/store

.PHONY: help setup build up up-d up-atlas up-atlas-d down restart reset logs logs-db bash mongo-shell ps \
        install add test test-e2e lint typecheck check format prod-build prod-up prod-down prod-logs

help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Crea .env a partir de .env.example (si no existe)
	@test -f .env && echo ".env ya existe" || (cp .env.example .env && echo ".env creado, revisa sus valores")

build: ## Construye las imágenes de desarrollo
	$(COMPOSE_DB) build

up: ## Levanta API + MongoDB local + DbGate (localhost:8081) en primer plano (Ctrl+C para detener)
	$(COMPOSE_DB) up

up-d: ## Igual que up, pero en segundo plano
	$(COMPOSE_DB) up -d

up-atlas: ## Levanta API + DbGate contra Atlas (MONGODB_URI del .env) en primer plano
	$(COMPOSE_ATLAS) up $(API) dbgate

up-atlas-d: ## Igual que up-atlas, pero en segundo plano
	$(COMPOSE_ATLAS) up -d $(API) dbgate

down: ## Detiene y elimina los contenedores
	$(COMPOSE_DB) down

restart: down up ## Reinicia los contenedores

reset: ## Borra contenedores, volúmenes (datos de Mongo) y reconstruye desde cero
	$(COMPOSE_DB) down -v --remove-orphans
	$(COMPOSE_DB) build --no-cache
	$(COMPOSE_DB) up

logs: ## Logs de la API en vivo
	$(COMPOSE) logs -f $(API)

logs-db: ## Logs de MongoDB en vivo
	$(COMPOSE_DB) logs -f mongo

bash: ## Abre una shell en el contenedor de la API
	$(COMPOSE) exec $(API) bash

mongo-shell: ## Abre mongosh en el contenedor de MongoDB
	$(COMPOSE_DB) exec mongo mongosh ordenalink

ps: ## Estado de los contenedores
	$(COMPOSE_DB) ps

install: ## pnpm install dentro del contenedor
	$(COMPOSE) exec $(API) pnpm install --store-dir $(PNPM_STORE)

add: ## Añade una dependencia: make add pkg=nombre [dev=1]
	@test -n "$(pkg)" || (echo "Uso: make add pkg=nombre [dev=1]" && exit 1)
	$(COMPOSE) exec $(API) pnpm add --store-dir $(PNPM_STORE) $(if $(dev),-D) $(pkg)

test: ## Tests unitarios
	$(COMPOSE) exec $(API) pnpm test

test-e2e: ## Tests e2e
	$(COMPOSE) exec $(API) pnpm test:e2e

lint: ## Linter (oxlint)
	$(COMPOSE) exec $(API) pnpm lint

typecheck: ## Verificación de tipos (tsc --noEmit)
	$(COMPOSE) exec $(API) pnpm typecheck

check: lint typecheck test test-e2e ## Lint + tipos + tests unitarios y e2e (antes de dar un cambio por terminado)

format: ## Formatea el código (prettier)
	$(COMPOSE) exec $(API) pnpm format

prod-build: ## Construye la imagen de producción
	$(COMPOSE_PROD) build

prod-up: ## Levanta la API en modo producción
	$(COMPOSE_PROD) up -d

prod-down: ## Detiene la API de producción
	$(COMPOSE_PROD) down

prod-logs: ## Logs de la API de producción
	$(COMPOSE_PROD) logs -f
