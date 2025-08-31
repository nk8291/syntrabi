# 🚀 PowerBI Web Replica - Complete Setup Guide

## 📋 Overview
PowerBI Web Replica is an advanced, open-source business intelligence platform that rivals Power BI and Tableau. This guide will help you set up and run the complete system on your local machine.

## 🎯 What You'll Get
- **Web-based BI Platform** - No desktop app required
- **Multiple Data Sources** - CSV, Excel, JSON, PostgreSQL, MySQL, BigQuery, Snowflake
- **Advanced Visualizations** - ECharts-powered with professional styling
- **Import & DirectQuery Modes** - Like Power BI!
- **Modern UI/UX** - Clean, responsive design
- **Docker-based** - Easy deployment and scaling

---

## ⚡ Quick Start (Recommended)

### Prerequisites
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download here](https://git-scm.com/)
- **8GB RAM minimum** (16GB recommended)
- **10GB free disk space**

### 1️⃣ Clone the Repository
```bash
git clone <repository-url>
cd powerbi_web_replica
```

### 2️⃣ Start All Services
```bash
# Start all services in the background
docker-compose up -d

# Check status (all containers should be healthy)
docker-compose ps
```

### 3️⃣ Access the Application
- **🌍 Frontend (Main App)**: http://localhost:3000
- **⚙️ Backend API**: http://localhost:8000
- **📊 API Documentation**: http://localhost:8000/docs
- **🗄️ MinIO Console**: http://localhost:9001
- **📂 Database**: PostgreSQL on localhost:5432
- **🚀 Redis**: localhost:6379

### 4️⃣ Verify Installation
1. Open http://localhost:3000
2. Click "Create Report"
3. You should see the report designer interface

---

## 🛠️ Manual Setup (Advanced)

If you prefer to run components individually or need custom configuration:

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# Runs on http://localhost:8000
```

### Database Setup
```bash
# Start PostgreSQL
docker run -d --name powerbi_postgres \
  -e POSTGRES_DB=powerbi \
  -e POSTGRES_USER=powerbi \
  -e POSTGRES_PASSWORD=powerbi123 \
  -p 5432:5432 \
  postgres:15-alpine

# Start Redis
docker run -d --name powerbi_redis \
  -p 6379:6379 \
  redis:7-alpine

# Start MinIO
docker run -d --name powerbi_minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -p 9000:9000 -p 9001:9001 \
  minio/minio server /data --console-address ":9001"
```

---

## 🔧 Configuration

### Environment Variables

#### Backend (.env file)
```env
# Database
DATABASE_URL=postgresql://powerbi:powerbi123@postgres:5432/powerbi
REDIS_URL=redis://redis:6379

# Authentication
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Object Storage
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=powerbi-data

# Application
ENVIRONMENT=development
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### Frontend (.env file)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws
VITE_ENVIRONMENT=development
```

---

## 🐳 Docker Services Breakdown

### Core Services
- **Frontend** - React + TypeScript + ECharts + TailwindCSS
- **Backend** - FastAPI + PostgreSQL + Redis + MinIO
- **Database** - PostgreSQL for metadata and user data
- **Cache** - Redis for session management and caching
- **Storage** - MinIO for file storage (S3-compatible)

### Service Ports
| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Main web application |
| Backend | 8000 | API and WebSocket server |
| PostgreSQL | 5432 | Primary database |
| Redis | 6379 | Cache and sessions |
| MinIO API | 9000 | Object storage API |
| MinIO Console | 9001 | MinIO web interface |

---

## 📊 Getting Started Guide

### 1. Create Your First Report
1. Go to http://localhost:3000
2. Click "Create Report"
3. You'll see the report designer with:
   - **Data Panel** (left) - Manage datasets and fields
   - **Canvas** (center) - Design your report
   - **Visualizations** (left-center) - Chart types
   - **Properties** (right) - Customize selected visuals

### 2. Add Data Sources

#### Upload CSV/Excel Files
1. In the Data panel, click "Manage"
2. Click "Upload Data"
3. Drag & drop your CSV/Excel/JSON file
4. Choose "Import Mode" for fast access
5. Click "Upload Dataset"

#### Connect to Database
1. In the Data panel, click "Manage"
2. Click "Connect Database"
3. Choose your database type (PostgreSQL, MySQL, etc.)
4. Enter connection details
5. Choose mode:
   - **Import Mode** - Copy data for fast access
   - **DirectQuery Mode** - Live connection to source

### 3. Build Visualizations
1. Select a visual type from the gallery
2. Drag fields from the Data panel to field wells
3. Customize with the Properties panel:
   - Titles and formatting
   - Colors and styling
   - Axes configuration
4. Right-click charts for export options

### 4. Export & Share
- **Export Charts** - Right-click → Export as PNG/SVG
- **Download Data** - Right-click → Download as CSV/JSON
- **Print** - Right-click → Print
- **Focus Mode** - Right-click → Focus Mode

---

## 🔍 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check which service is using the port
netstat -tulpn | grep :3000

# Stop the service or change ports in docker-compose.yml
```

#### Containers Not Starting
```bash
# Check logs for specific service
docker-compose logs frontend
docker-compose logs backend

# Restart specific service
docker-compose restart frontend
```

#### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Connect to database directly
docker-compose exec postgres psql -U powerbi -d powerbi
```

#### Frontend Build Errors
```bash
# Rebuild frontend with no cache
docker-compose build --no-cache frontend
docker-compose up -d
```

### Performance Tuning

#### Increase Memory Limits
```yaml
# In docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

#### Enable Production Mode
```bash
# Set environment variables
export ENVIRONMENT=production
export LOG_LEVEL=WARNING
```

---

## 🚀 Advanced Features

### Custom Database Connections
Supports connecting to:
- **PostgreSQL** - Full support with Import/DirectQuery
- **MySQL** - Full support with Import/DirectQuery  
- **Google BigQuery** - DirectQuery mode
- **Snowflake** - DirectQuery mode
- **Custom APIs** - Via REST connectors

### Advanced Visualizations
- **Column Charts** - Clustered, stacked, 100% stacked
- **Line Charts** - Multi-series with forecasting
- **Pie Charts** - Donut and pie variations
- **Scatter Plots** - Bubble charts with size encoding
- **Area Charts** - Stacked and overlapping
- **Tables** - Sortable with conditional formatting

### Data Processing
- **Import Mode** - Data copied and optimized
- **DirectQuery Mode** - Live queries to source
- **Incremental Refresh** - Update only changed data
- **Data Modeling** - Relationships and calculated fields

---

## 🎯 Production Deployment

### Using Docker Compose Production
```bash
# Use production profile
docker-compose --profile production up -d

# This includes:
# - Nginx reverse proxy
# - SSL termination
# - Celery workers for background tasks
# - Redis clustering
```

### Using Kubernetes
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Scale services
kubectl scale deployment frontend --replicas=3
kubectl scale deployment backend --replicas=2
```

### Cloud Deployment
- **AWS** - ECS, RDS, ElastiCache, S3
- **Google Cloud** - Cloud Run, Cloud SQL, Memorystore, Cloud Storage
- **Azure** - Container Instances, PostgreSQL, Redis, Blob Storage

---

## 🔒 Security Considerations

### Authentication
- JWT-based authentication
- Configurable session timeout
- Role-based access control

### Database Security
- Encrypted connections (SSL/TLS)
- Environment-based secrets
- Connection pooling limits

### API Security
- CORS configuration
- Rate limiting
- Input validation
- SQL injection protection

---

## 📈 Monitoring & Maintenance

### Health Checks
```bash
# Check all services
docker-compose ps

# Health check endpoints
curl http://localhost:8000/health
curl http://localhost:3000/
```

### Logs Management
```bash
# View logs
docker-compose logs -f

# Log rotation
docker-compose logs --tail=100 frontend
```

### Backup & Recovery
```bash
# Backup database
docker-compose exec postgres pg_dump -U powerbi powerbi > backup.sql

# Backup MinIO data
docker-compose exec minio mc mirror /data /backup
```

---

## 🤝 Support & Development

### Development Setup
```bash
# Install dependencies
cd frontend && npm install
cd backend && pip install -r requirements-dev.txt

# Run tests
npm test
pytest

# Code formatting
npm run format
black backend/
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Getting Help
- **Issues** - GitHub Issues
- **Discussions** - GitHub Discussions
- **Documentation** - Wiki

---

## 🎉 You're All Set!

The PowerBI Web Replica is now running and ready for use! 

**🌟 Key URLs to Remember:**
- **Main App**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

**🚀 Next Steps:**
1. Upload your first dataset
2. Create beautiful visualizations
3. Build comprehensive dashboards
4. Share insights with your team

Enjoy your new advanced BI platform! 🎊