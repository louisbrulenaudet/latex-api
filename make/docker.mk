# make/docker.mk – Docker Compose targets for latex-api

docker-build: ## Build Docker images
	@echo "🏗️ Building Docker images..."
	docker compose build --pull

docker-up: ## Start all containers in detached mode
	@echo "🐳 Starting containers..."
	docker compose up -d

docker-down: ## Stop and remove all containers
	@echo "🛑 Stopping containers..."
	docker compose down

docker-restart: ## Restart all containers
	@echo "🔄 Restarting containers..."
	docker compose restart

docker-logs: ## Tail logs from all containers
	@echo "🔍 Tailing logs from all containers..."
	docker compose logs -f

docker-logs-app: ## Tail logs from the app container

	docker compose logs -f app

docker-logs-tunnel: ## Tail logs from the cloudflared container
	@echo "🔍 Tailing logs from the cloudflared container..."
	docker compose logs -f cloudflared

docker-ps: ## Show running containers
	@echo "🔍 Showing running containers..."
	docker compose ps

docker-clean: ## Remove containers, images, and volumes
	@echo "🧹 Cleaning up containers, images, and volumes..."
	docker compose down -v --rmi local

docker-rebuild: ## Force rebuild and restart containers
	@echo "🔄 Rebuilding and restarting containers..."
	docker compose build --no-cache --pull
	docker compose up -d
