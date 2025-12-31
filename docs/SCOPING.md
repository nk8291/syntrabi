# Syntra BI - Project Scoping Document

**Version:** 1.0
**Date:** December 30, 2024
**Document Type:** Project Scope and Phasing Strategy

---

## Executive Summary

Syntra BI is an advanced Business Intelligence platform that provides data visualization, reporting, and analytics capabilities similar to Power BI and Tableau. This document defines the project scope, current state, and phased implementation approach to deliver a production-ready MVP within one month.

---

## Current State Analysis

### Architecture Overview
- **Backend:** FastAPI (Python 3.11+) with SQLAlchemy ORM
- **Frontend:** React with TypeScript, Vite build system
- **Database:** PostgreSQL 15 (containerized)
- **Cache:** Redis 7 (containerized)
- **Storage:** MinIO S3-compatible object storage
- **Deployment:** Docker Compose for local development

### Existing Features (As-Is)
1. **Authentication & Authorization**
   - JWT-based authentication
   - Workspace-based permissions
   - User management

2. **Data Management**
   - Workspace organization
   - Dataset creation and management
   - Basic schema inference

3. **Visualization**
   - Report designer with drag-and-drop interface
   - Vega-Lite based chart rendering
   - Basic chart types (bar, line, area, scatter, pie, table)
   - PNG export functionality

4. **Data Connectors (Current Implementation)**
   - **Fully Implemented:** CSV, Excel, SQL Server, PostgreSQL, MySQL
   - **Partially Implemented:** MariaDB, Web API, OData, ODBC, JDBC, Databricks, Spark, Teradata
   - **Stub/Models Only:** 20+ connector types including Azure services, Google BigQuery, Snowflake, MongoDB, Oracle, XML, JSON, PDF, Parquet

### Technical Debt & Complexity Issues
1. **Over-Engineering:** 32 connector types defined but most not implemented
2. **Azure Dependencies:** Azure-specific code not fully implemented but creating complexity
3. **Mixed Implementation States:** Some connectors have UI but no backend implementation
4. **Dependency Bloat:** Libraries installed for connectors that aren't functional
5. **Maintenance Burden:** Large codebase with untested features

---

## Phase 1 Scope (Target: 1 Month)

### Objective
Deliver a focused, production-ready BI platform with essential data connectors that work reliably and are fully tested.

### Phase 1 Included Features

#### 1. File Upload Data Connectors
Focus on the most common file formats for business analytics:

| Connector | Priority | Status | Implementation Notes |
|-----------|----------|--------|---------------------|
| **CSV** | Critical | ✅ Implemented | Keep as-is, add validation enhancements |
| **Excel (.xlsx, .xls)** | Critical | ✅ Implemented | Keep as-is, support multiple sheets |
| **JSON** | High | 🔨 To Implement | Add JSON schema inference |
| **PDF** | Medium | 🔨 To Implement | Table extraction from PDF files |

**Requirements:**
- Drag-and-drop file upload interface
- File size limit: 100MB per file
- Schema auto-detection and type inference
- Preview functionality (first 100 rows)
- Data validation and error reporting
- Support for multiple sheets/tables per file

#### 2. Database Connectors
Support for the most widely-used open-source and commercial databases:

| Database | Priority | Status | Implementation Notes |
|----------|----------|--------|---------------------|
| **PostgreSQL** | Critical | ✅ Implemented | Keep and test thoroughly |
| **MySQL** | Critical | ✅ Implemented | Keep and test thoroughly |
| **MariaDB** | High | ⚠️ Partial | Complete implementation (inherits from MySQL) |

**Requirements:**
- Connection testing before saving
- SSL/TLS support
- Connection pooling
- Query timeout configuration
- Schema browser (databases → tables → columns)
- Sample data preview
- Support for views and stored procedures
- Credential encryption at rest

#### 3. Core Platform Features (Retained)
- User authentication and workspace management
- Dataset management and schema handling
- Report designer with drag-and-drop interface
- All existing visualization types
- Report save/load functionality
- PNG export
- Offline mode with IndexedDB caching

### Phase 1 Excluded Features

#### Removed Data Connectors
The following connectors will be removed from the codebase:

**Azure Services:**
- Azure SQL Database → Use generic SQL Server connector locally
- Azure Databricks → Removed entirely
- Azure Analysis Services → Removed entirely

**Cloud Data Warehouses:**
- Google BigQuery
- Snowflake
- Amazon Redshift
- Databricks

**Other Databases:**
- SQL Server (enterprise) → Focus on open-source alternatives
- Oracle Database
- Teradata
- MongoDB

**Online Services:**
- Google Sheets
- SharePoint Lists
- Web API (generic)
- OData Feed
- REST API (generic)

**File Formats:**
- XML
- Parquet
- Folder connectors
- Text files (non-CSV)

**Generic/Legacy:**
- ODBC (generic)
- JDBC (generic)
- OLE DB
- Blank Query

**Justification:** These connectors add significant complexity, require extensive testing, and are not essential for Phase 1 MVP. They can be added in future phases based on user demand.

#### Deferred Features
- Real-time collaboration
- ETL pipelines and data refresh scheduling
- Advanced Tableau features (small multiples, table calculations)
- Custom visualization marketplace
- Interactive maps (Leaflet integration)
- Advanced security (row-level security, column-level security)
- Mobile responsive design

---

## Success Criteria for Phase 1

### Functional Requirements
✅ **Must Have:**
1. Users can upload CSV, Excel, JSON, PDF files successfully
2. Users can connect to PostgreSQL, MySQL, MariaDB databases
3. All connectors pass end-to-end integration tests
4. Users can create visualizations from uploaded/connected data
5. Reports can be saved, loaded, and exported as PNG
6. Authentication and workspace isolation works correctly
7. Application runs via Docker Compose with single command

✅ **Should Have:**
1. File upload progress indicators
2. Helpful error messages for connection failures
3. Schema preview before finalizing dataset
4. Connection credential validation
5. Query performance < 5 seconds for datasets under 10,000 rows

### Non-Functional Requirements
1. **Performance:** Dashboard load time < 3 seconds
2. **Reliability:** 99% uptime during development testing
3. **Security:** All database credentials encrypted at rest
4. **Usability:** Non-technical users can upload CSV and create charts
5. **Documentation:** Setup guide, API docs, architecture docs complete

### Quality Gates
- [ ] All Phase 1 connectors have unit tests (>80% coverage)
- [ ] Integration tests for complete data upload → visualization workflow
- [ ] Manual QA testing completed for all 7 connectors
- [ ] Docker Compose startup works on Windows, macOS, Linux
- [ ] No critical or high-severity bugs in backlog

---

## Future Phases (Roadmap)

### Phase 2: Enhanced Connectors & Cloud Support (Months 2-3)
**Objectives:**
- Add cloud database support (BigQuery, Snowflake)
- Implement REST API and OData connectors
- Add XML and Parquet file support
- Enable data refresh scheduling

**Success Metrics:**
- 5+ additional connectors operational
- Scheduled refresh working for 90% of datasets
- Cloud connectors tested with real accounts

### Phase 3: Advanced Analytics & Collaboration (Months 4-6)
**Objectives:**
- Tableau-like advanced features (calculated fields, table calculations)
- Real-time collaboration and sharing
- Interactive maps with Leaflet
- Custom visualization plugins

**Success Metrics:**
- 3+ advanced visualization types
- Multi-user collaboration working
- 100+ users in beta testing

### Phase 4: Enterprise Features (Months 6-9)
**Objectives:**
- Row-level and column-level security
- Azure/AWS enterprise connectors
- Advanced ETL and data pipeline automation
- Mobile responsive design
- White-label capabilities

**Success Metrics:**
- Enterprise customer pilot program
- Security audit completed
- Mobile usage accounts for 20% of traffic

---

## Resource Requirements

### Development Team (Phase 1)
- 1 Full-stack developer (primary)
- 1 QA/Testing resource (part-time)
- 1 DevOps/Infrastructure (part-time)

### Infrastructure
- Development: Local Docker Compose setup
- Staging: Cloud-hosted environment (optional)
- Production: Docker Swarm or Kubernetes (post-Phase 1)

### Third-Party Dependencies (Phase 1)
**Backend:**
- FastAPI, SQLAlchemy, asyncpg, aiomysql, pyodbc
- pandas, openpyxl (Excel), PyPDF2 or pdfplumber (PDF)
- MinIO/S3 SDK for file storage

**Frontend:**
- React, TypeScript, Vite
- Vega-Lite for visualizations
- Papa Parse for CSV parsing
- Axios for API calls

---

## Risk Assessment

### High Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PDF parsing unreliable for complex layouts | High | Medium | Use well-tested library (Tabula or pdfplumber), set expectations for simple tables only |
| Database driver compatibility issues | Medium | High | Test early with multiple database versions, document supported versions |
| JSON schema inference fails for nested data | Medium | Medium | Flatten nested JSON by default, provide manual schema override |
| Performance issues with large Excel files | Medium | High | Implement streaming parser, set 100MB limit, show progress indicators |

### Medium Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Scope creep from stakeholders | High | Medium | Strict adherence to scoping document, log requests for Phase 2 |
| Technical debt from rushed implementation | Medium | Medium | Mandatory code reviews, maintain >70% test coverage |
| Dependency conflicts during cleanup | Low | Medium | Incremental removal of connectors with testing after each removal |

### Low Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Docker Compose environment setup issues | Low | Low | Comprehensive setup documentation, test on multiple platforms |

---

## Change Management

### Scope Change Process
1. All scope changes must be documented in this file with version updates
2. Phase 1 scope is **frozen** as of January 1, 2025
3. New features log to "Future Phases" section for consideration
4. Critical bugs/security issues bypass scope freeze

### Communication Plan
- Weekly progress updates in project README
- Bi-weekly stakeholder demos
- Daily commit messages following conventional commits
- Monthly roadmap review and adjustment

---

## Appendix

### Connector Implementation Priority Matrix

| Connector | Business Value | Implementation Effort | Priority Score | Phase |
|-----------|----------------|----------------------|----------------|-------|
| CSV | Very High | Low (Complete) | 10 | Phase 1 |
| Excel | Very High | Low (Complete) | 10 | Phase 1 |
| PostgreSQL | Very High | Low (Complete) | 10 | Phase 1 |
| MySQL | Very High | Low (Complete) | 10 | Phase 1 |
| JSON | High | Medium | 7 | Phase 1 |
| MariaDB | Medium | Low | 7 | Phase 1 |
| PDF | Medium | High | 5 | Phase 1 |
| BigQuery | High | Medium | 6 | Phase 2 |
| Snowflake | High | Medium | 6 | Phase 2 |
| REST API | Medium | Medium | 5 | Phase 2 |
| OData | Low | High | 2 | Phase 3 |
| Azure SQL | Medium | Low | 5 | Phase 2 |
| SQL Server | Medium | Low (exists) | 5 | Deferred |
| Google Sheets | Medium | High | 4 | Phase 3 |
| SharePoint | Low | Very High | 1 | Phase 4 |
| Oracle | Low | High | 2 | Phase 4 |

### Glossary
- **Connector:** Integration code that enables Syntra to read data from external sources
- **Dataset:** A configured connection to a data source with schema information
- **Workspace:** Logical container for organizing datasets, reports, and dashboards
- **Schema Inference:** Automatic detection of column names, data types, and structure
- **DirectQuery:** Execute queries against source database in real-time
- **Import Mode:** Copy data into Syntra's storage for faster querying

### References
- Power BI PBIDS Format: https://docs.microsoft.com/power-bi/connect-data/desktop-data-sources
- Vega-Lite Specification: https://vega.github.io/vega-lite/
- FastAPI Documentation: https://fastapi.tiangolo.com/
- SQLAlchemy Async: https://docs.sqlalchemy.org/en/14/orm/extensions/asyncio.html

---

**Document Control:**
- Author: Development Team
- Reviewers: Product Owner, Technical Lead
- Next Review Date: January 15, 2025
- Version History:
  - v1.0 (2024-12-30): Initial scoping document for Phase 1
