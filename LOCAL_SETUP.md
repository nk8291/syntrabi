# Syntra Local Development Setup

## PostgreSQL Local Setup

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
fix e
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

### PostgreSQL Connection Issues
- Ensure PostgreSQL service is running
- Check Windows Services for "postgresql-x64-xx"
- Verify firewall allows port 5432
- Check pg_hba.conf for authentication settings

### Backend Issues
- Verify all dependencies installed: `pip install -r requirements.txt`
- Check database connection string
- Ensure database and user exist