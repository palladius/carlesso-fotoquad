# Carlesso FotoQuad — common tasks

default:
    @just --list

# Install dependencies
install:
    npm install

# Start the dev server on http://localhost:5173
dev:
    npm run dev

# Run unit tests once
test:
    CI=true npm test

# Unit tests with coverage report (80% threshold)
coverage:
    CI=true npm run coverage

# Type-check and build for production
build:
    npm run build

# Run Playwright end-to-end tests
e2e:
    CI=true npm run e2e

# Lint and check formatting
lint:
    npm run lint

# Remove build artefacts and caches
clean:
    rm -rf dist coverage playwright-report test-results dev-dist node_modules/.vite
