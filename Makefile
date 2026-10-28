.PHONY: dev up down migrate seed test test-backend test-frontend e2e evals lint typecheck load-test screenshots audit

dev:
	@echo "Starting development servers..."
	@powershell -Command "Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd backend; uvicorn app.main:app --reload --port 8000'; cd frontend; npm run dev"

up:
	docker compose up -d

down:
	docker compose down

migrate:
	cd backend && python -m alembic upgrade head

seed:
	cd backend && python -m app.data.demo_seed

test: test-backend test-frontend

test-backend:
	cd backend && python -m pytest -v

test-frontend:
	cd frontend && npm run test

e2e:
	cd frontend && npx playwright test

evals:
	cd backend && python -m app.evals.run_evals

lint:
	cd backend && ruff check .
	cd frontend && npm run lint

typecheck:
	cd backend && mypy app
	cd frontend && npm run typecheck

load-test:
	cd backend && python -m tests.load_test_500k

screenshots:
	cd frontend && npx playwright test tests/visual.spec.ts

audit:
	cd backend && pip-audit
	cd frontend && npm audit
