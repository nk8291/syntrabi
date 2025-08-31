# PowerBI Web Replica - Data Visualization Platform

A production-quality, web-based data visualization platform that recreates core Power BI Desktop functionality with select Tableau features. Build interactive reports and dashboards with drag-and-drop interfaces, connect to multiple data sources, and work in both online and offline modes.

## Features

### MVP (Current Version)
- 📊 **Interactive Report Designer**: Drag-and-drop canvas with visual gallery
- 📁 **Data Source Connectors**: CSV upload and PostgreSQL database connections
- 🎨 **Visualization Types**: Bar, line, area, scatter, pie, table charts with Vega-Lite rendering
- 💾 **Local & Cloud Storage**: Save/load reports with offline IndexedDB support
- 🔐 **Authentication**: JWT-based auth with workspace permissions
- 📤 **Export Capabilities**: PNG export with server-side rendering
- 🌐 **Offline Mode**: Work with cached data when disconnected

### Planned Features (v1 & v2)
- 📊 Advanced Tableau-like features (small multiples, table calculations)
- 🗺️ Interactive maps with Leaflet integration  
- 🔄 Data refresh scheduling and ETL pipelines
- 👥 Real-time collaboration and sharing
- 📈 Performance optimization for large datasets
- 🔌 Marketplace for custom visualizations

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Run with Docker (Recommended)

1. **Clone and start the application:**
```bash
git clone <repository-url>
cd powerbi_web_replica
docker-compose up --build
```

2. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

3. **Default login credentials:**
- Email: `admin@example.com`
- Password: `admin123`

### Local Development Setup

1. **Install dependencies:**
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend  
cd ../frontend
npm install
```

2. **Environment setup:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start services:**
```bash
# Start PostgreSQL and Redis
docker-compose up postgres redis minio -d

# Start backend (in backend/ directory)
uvicorn main:app --reload --port 8000

# Start frontend (in frontend/ directory)  
npm run dev
```

## API Endpoints

### Authentication
```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}'

# Get current user
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### Workspaces
```bash
# List workspaces
curl -X GET http://localhost:8000/api/workspaces \
  -H "Authorization: Bearer <token>"

# Create workspace
curl -X POST http://localhost:8000/api/workspaces \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Workspace", "description": "Test workspace"}'
```

### Datasets
```bash
# Upload CSV dataset
curl -X POST http://localhost:8000/api/workspaces/{workspace_id}/datasets \
  -H "Authorization: Bearer <token>" \
  -F "file=@data.csv" \
  -F "name=Sales Data"

# Connect PostgreSQL database
curl -X POST http://localhost:8000/api/workspaces/{workspace_id}/datasets \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "PostgreSQL Data",
    "connector_type": "postgresql", 
    "connector_config": {
      "host": "localhost",
      "port": 5432,
      "database": "mydb",
      "username": "user",
      "password": "pass"
    }
  }'

# Query dataset
curl -X POST http://localhost:8000/api/datasets/{dataset_id}/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "columns": ["name", "value"],
    "filters": [],
    "limit": 100
  }'
```

### Reports
```bash
# Create report
curl -X POST http://localhost:8000/api/reports \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "uuid",
    "name": "Sales Dashboard",
    "report_json": {...}
  }'

# Render report to Vega-Lite spec
curl -X POST http://localhost:8000/api/reports/{report_id}/render \
  -H "Authorization: Bearer <token>"

# Export report as PNG
curl -X POST http://localhost:8000/api/reports/{report_id}/export \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"format": "png", "width": 800, "height": 600}'
```

## Project Structure

```
powerbi_web_replica/
├── architecture.md              # System architecture documentation
├── README.md                   # This file
├── docker-compose.yml          # Docker services configuration
├── openapi.yml                # API specification
├── .env.example               # Environment variables template
├── backend/                   # FastAPI backend
│   ├── main.py               # Application entry point
│   ├── requirements.txt      # Python dependencies
│   ├── alembic.ini          # Database migration config
│   ├── app/
│   │   ├── models/          # SQLAlchemy models
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic
│   │   ├── connectors/      # Data source connectors
│   │   └── core/           # Core utilities
│   ├── tests/              # Backend tests
│   └── migrations/         # Database migrations
├── frontend/                 # React frontend
│   ├── package.json        # Node.js dependencies
│   ├── vite.config.ts     # Vite configuration
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client services
│   │   ├── stores/       # Zustand state stores
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Utility functions
│   └── tests/           # Frontend tests
├── examples/               # Sample datasets and reports
│   ├── datasets/          # Sample CSV files
│   └── reports/           # Example report JSON files
└── docs/                  # Additional documentation
    ├── dev-plan.md       # Development roadmap
    └── security.md       # Security considerations
```

## Data Model

The system uses PostgreSQL to store metadata and user information:

- **users**: User accounts and authentication
- **workspaces**: Logical containers for projects  
- **datasets**: Data source connections and schemas
- **models**: Data modeling definitions (joins, measures)
- **reports**: Report definitions with visualization specs
- **dashboards**: Dashboard layouts and tiles
- **permissions**: Role-based access control

See `backend/app/models/` for complete SQLAlchemy model definitions.

## Visualization Engine

Reports are defined using a declarative JSON model that gets translated to Vega-Lite specifications:

```json
{
  "id": "report-1",
  "name": "Sales Dashboard", 
  "pages": [{
    "id": "page-1",
    "name": "Overview",
    "visuals": [{
      "id": "chart-1",
      "type": "bar",
      "title": "Sales by Category",
      "dataset_id": "dataset-1",
      "encoding": {
        "x": {"field": "category", "type": "ordinal"},
        "y": {"field": "sales", "type": "quantitative"}
      },
      "position": {"x": 0, "y": 0, "width": 400, "height": 300}
    }]
  }]
}
```

## Testing

### Run Backend Tests
```bash
cd backend
pytest tests/ -v
```

### Run Frontend Tests  
```bash
cd frontend
npm run test
```

### Run E2E Tests
```bash
# Start application first
docker-compose up -d

# Run Playwright tests
cd frontend
npx playwright test
```

### Manual Acceptance Test
1. Upload CSV dataset from `examples/datasets/sales.csv`
2. Create new report and drag fields to canvas
3. Configure bar chart with category (x-axis) and sales (y-axis)
4. Save report and verify it reloads correctly
5. Export report as PNG
6. Test offline mode by disconnecting network

## Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost/powerbi
REDIS_URL=redis://localhost:6379

# Authentication  
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Object Storage
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=powerbi-data

# Frontend
VITE_API_BASE_URL=http://localhost:8000
```

## Development Commands

```bash
# Start development servers
make dev

# Run linting and formatting
make lint
make format

# Run tests
make test

# Build for production
make build

# Database migrations
cd backend
alembic revision --autogenerate -m "Migration name"
alembic upgrade head
```

## Troubleshooting

### Common Issues

**Port conflicts:** Change ports in docker-compose.yml if 3000/8000/5432 are in use

**Database connection errors:** Ensure PostgreSQL is running and credentials are correct

**File upload issues:** Check S3/MinIO configuration and bucket permissions

**CORS errors:** Verify frontend URL is in backend CORS settings

### Debug Mode

Enable debug logging by setting environment variables:
```bash
LOG_LEVEL=DEBUG
BACKEND_DEBUG=true
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`) 
5. Open Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Roadmap

See `docs/dev-plan.md` for detailed development milestones and feature priorities.