# Syntra Local Development Setup

## Quick Start (TL;DR)

```bash
# Clone and setup
git clone <repository-url>
cd syntrabi

# Start everything with Docker
docker-compose build
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Docker Setup (Recommended)

### Prerequisites
- Docker Desktop installed and running
- Docker Compose v2 or higher

### Docker Commands Reference

#### Build Commands

```bash
# Build all containers
docker-compose build

# Build all containers without cache (force rebuild)
docker-compose build --no-cache

# Build specific container
docker-compose build backend
docker-compose build frontend
docker-compose build db

# Build with progress output
docker-compose build --progress=plain
```

#### Start/Stop Commands

```bash
# Start all containers (builds if needed)
docker-compose up

# Start all containers in detached mode (background)
docker-compose up -d

# Start specific container
docker-compose up backend
docker-compose up frontend
docker-compose up db

# Start and rebuild containers
docker-compose up --build

# Stop all containers
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v

# Stop specific container
docker-compose stop backend
docker-compose stop frontend
docker-compose stop db
```

#### Restart Commands

```bash
# Restart all containers
docker-compose restart

# Restart specific container
docker-compose restart backend
docker-compose restart frontend
docker-compose restart db
```

#### View Logs

```bash
# View logs for all containers
docker-compose logs

# View logs for specific container
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Follow logs (live tail)
docker-compose logs -f
docker-compose logs -f backend

# View last N lines
docker-compose logs --tail=100 backend
```

#### Container Management

```bash
# List running containers
docker-compose ps

# View container status
docker ps

# Execute command in running container
docker-compose exec backend bash
docker-compose exec db psql -U syntra -d syntra

# View container resource usage
docker stats
```

#### Cleanup Commands

```bash
# Remove stopped containers
docker-compose rm

# Prune unused Docker resources
docker system prune

# Prune with volumes (WARNING: deletes data)
docker system prune -a --volumes

# Remove specific container
docker-compose rm backend
```

#### Common Development Workflows

```bash
# First time setup
docker-compose build
docker-compose up -d

# After code changes (backend)
docker-compose restart backend

# After dependency changes (requires rebuild)
docker-compose build backend
docker-compose up -d

# View backend logs while developing
docker-compose logs -f backend

# Access database CLI
docker-compose exec db psql -U syntra -d syntra

# Full rebuild (when things break)
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check if containers are healthy
docker-compose ps
```

### Container Details

The docker-compose setup includes three services:

1. **backend** - FastAPI Python backend (Port 8000)
   - Auto-reloads on code changes
   - Connected to PostgreSQL database
   - Runs database migrations on startup

2. **frontend** - React TypeScript frontend (Port 3000)
   - Hot module replacement enabled
   - Proxies API requests to backend

3. **db** - PostgreSQL 15 database (Port 5432)
   - Data persisted in Docker volume
   - Accessible at localhost:5432
   - Credentials: syntra/syntra123

### Environment Variables

Create a `.env` file in the root directory (if not exists):

```env
# Database
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=syntra
POSTGRES_USER=syntra
POSTGRES_PASSWORD=syntra123
DATABASE_URL=postgresql://syntra:syntra123@db:5432/syntra

# Backend
BACKEND_PORT=8000
ENVIRONMENT=development

# Frontend
FRONTEND_PORT=3000
VITE_API_URL=http://localhost:8000
```

## PostgreSQL Local Setup (Alternative to Docker)

### 1. Install PostgreSQL
Download and install PostgreSQL from: https://www.postgresql.org/download/windows/

During installation:
- Set password for postgres user (remember this password)
- Default port: 5432
- Default locale: [Default locale]

### 2. Create Syntra Database and User

Open Command Prompt as Administrator and run:

```bash
# Connect to PostgreSQL
psql -U postgres -h localhost

# Create database and user
CREATE DATABASE syntra;
CREATE USER syntra WITH ENCRYPTED PASSWORD 'syntra123';
GRANT ALL PRIVILEGES ON DATABASE syntra TO syntra;
ALTER USER syntra CREATEDB;

# Connect to syntra database
\c syntra

# Grant schema permissions
GRANT ALL ON SCHEMA public TO syntra;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO syntra;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO syntra;

# Exit psql
\q
```

### 3. Run Database Initialization Script

```bash
psql -U syntra -d syntra -h localhost -f backend/init.sql
```

### 4. Update Environment Configuration

Update your `.env` file or environment variables:

```env
DATABASE_URL=postgresql://syntra:syntra123@localhost:5432/syntra
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=syntra
POSTGRES_USER=syntra
POSTGRES_PASSWORD=syntra123
```

### 5. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 6. Run Backend Locally

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 7. Frontend Setup (if not using Docker)

```bash
cd frontend
npm install
npm run dev
```

## Services URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Database: localhost:5432

## Troubleshooting

### Docker Issues

#### Containers won't start
```bash
# Check container logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs db

# Check if ports are already in use
netstat -ano | findstr :3000
netstat -ano | findstr :8000
netstat -ano | findstr :5432

# Kill process using port (Windows)
taskkill /PID <process_id> /F
```

#### Containers are slow or unresponsive
```bash
# Restart Docker Desktop
# Or restart specific containers
docker-compose restart

# Check resource usage
docker stats
```

#### Database connection fails in Docker
```bash
# Ensure db container is running
docker-compose ps

# Check database logs
docker-compose logs db

# Verify database is ready
docker-compose exec db psql -U syntra -d syntra -c "\dt"

# Recreate database volume (WARNING: deletes data)
docker-compose down -v
docker-compose up -d
```

#### Code changes not reflecting
```bash
# For backend changes (Python)
docker-compose restart backend

# For frontend changes (React)
# Should auto-reload, if not:
docker-compose restart frontend

# For dependency changes
docker-compose build backend
docker-compose up -d

# Nuclear option (full rebuild)
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### "Error response from daemon" messages
```bash
# Clean up Docker resources
docker system prune

# Restart Docker Desktop
# Check Docker Desktop settings (memory, CPU allocation)
```

#### Can't access containers from host
```bash
# Check if containers are running
docker-compose ps

# Check if ports are properly mapped
docker ps

# Try accessing via container IP
docker inspect syntra_backend | findstr IPAddress
```

### PostgreSQL Connection Issues (Local Setup)
- Ensure PostgreSQL service is running
- Check Windows Services for "postgresql-x64-xx"
- Verify firewall allows port 5432
- Check pg_hba.conf for authentication settings

### Backend Issues (Local Setup)
- Verify all dependencies installed: `pip install -r requirements.txt`
- Check database connection string in .env
- Ensure database and user exist
- Check if port 8000 is available

### Frontend Issues (Local Setup)
- Verify Node.js and npm are installed
- Run `npm install` in frontend directory
- Check if port 3000 is available
- Verify VITE_API_URL points to correct backend URL