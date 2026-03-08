install: ## Initialize the project and install dependencies
	@echo "🔧 Initializing the project..."
	bun install

install-frozen: ## Initialize the project and install dependencies with frozen lockfile for CI/CD
	@echo "🔧 Initializing the project..."
	bun install --frozen-lockfile

update: ## Update dependencies to their latest versions
	@echo "🔄 Updating dependencies..."
	bun update

check: ## Check the codebase using Biome
	@echo "🔍 Checking codebase..."
	bun run check

dev: ## Start the development server
	@echo "💻 Starting development server..."
	bun run dev

check-types: ## Check TypeScript types
	@echo "🔍 Checking TypeScript types..."
	bun run check-types

format: ## Format the codebase using Biome
	@echo "📝 Formatting code..."
	bun run format

lint: ## Lint the codebase using Biome
	@echo "🔍 Running code analysis..."
	bun run lint
