# Security Documentation - PowerBI Web Replica

## Security Architecture Overview

This document outlines the security measures implemented in the PowerBI Web Replica platform to protect user data, ensure secure authentication, and maintain system integrity.

## Authentication & Authorization

### JWT-Based Authentication
- **Token Structure**: RS256 signed JWT tokens with expiration
- **Token Storage**: Secure HTTP-only cookies (future) + localStorage (MVP)
- **Token Refresh**: Automatic refresh with sliding sessions
- **Session Management**: Redis-based session storage for server-side validation

### OAuth Integration (Planned)
- **Providers**: Google, Microsoft, GitHub
- **Flow**: Authorization Code Grant with PKCE
- **Scopes**: Minimal required permissions
- **Token Exchange**: Secure backend token validation

### Password Security
```python
# Password hashing with bcrypt
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Minimum requirements
- Minimum 8 characters
- Mix of uppercase, lowercase, numbers
- Special character recommended
- No common password dictionary words
```

## Role-Based Access Control (RBAC)

### Permission Hierarchy
```
WORKSPACE LEVEL:
├── Owner (Full control)
├── Editor (Create/edit content)
├── Contributor (Create content, limited edit)
└── Viewer (Read-only access)

RESOURCE LEVEL:
├── Report Owner (Full report control)
├── Report Editor (Edit specific report)
└── Report Viewer (View specific report)
```

### Permission Matrix
| Action | Owner | Editor | Contributor | Viewer |
|--------|-------|--------|-------------|---------|
| Create Workspace | ✅ | ❌ | ❌ | ❌ |
| Delete Workspace | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Create Report | ✅ | ✅ | ✅ | ❌ |
| Edit Own Report | ✅ | ✅ | ✅ | ❌ |
| Edit Others' Report | ✅ | ✅ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ✅ |
| Export Reports | ✅ | ✅ | ✅ | ✅* |
| Upload Data | ✅ | ✅ | ❌ | ❌ |

*Viewer export may be restricted based on configuration

## Data Protection

### Encryption
- **In Transit**: TLS 1.3 for all communications
- **At Rest**: AES-256 encryption for sensitive data
- **Database**: PostgreSQL native encryption
- **File Storage**: S3 server-side encryption (SSE-S3)

### Connection String Security
```python
# Encrypted connection configuration storage
{
    "connector_config": {
        "host": "encrypted:AES256:base64_encrypted_host",
        "username": "encrypted:AES256:base64_encrypted_username", 
        "password": "encrypted:AES256:base64_encrypted_password",
        "database": "encrypted:AES256:base64_encrypted_database"
    }
}
```

### Data Access Patterns
- **Query Isolation**: User queries run in isolated contexts
- **Row-Level Security**: Planned for multi-tenant data access
- **Data Masking**: Sensitive field automatic masking
- **Audit Logging**: All data access logged and monitored

## API Security

### Request Validation
- **Input Sanitization**: All inputs validated and sanitized
- **SQL Injection Protection**: Parameterized queries only
- **XSS Prevention**: Output encoding and CSP headers
- **CSRF Protection**: Token-based CSRF protection

### Rate Limiting
```python
# Redis-based rate limiting
RATE_LIMITS = {
    "login": "5 per minute",
    "api_calls": "1000 per hour", 
    "file_upload": "10 per hour",
    "export": "20 per hour"
}
```

### API Security Headers
```python
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'"
}
```

## Network Security

### CORS Configuration
```python
ALLOWED_ORIGINS = [
    "https://powerbi-replica.com",
    "https://app.powerbi-replica.com", 
    "http://localhost:3000",  # Development only
]

CORS_SETTINGS = {
    "allow_origins": ALLOWED_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE"],
    "allow_headers": ["Authorization", "Content-Type"],
    "max_age": 86400
}
```

### Firewall Rules
- **Database**: Only accessible from application servers
- **Redis**: Internal network access only
- **Application**: HTTPS traffic only (443)
- **Management**: SSH access restricted to admin IPs

## Secure Embedding

### Embed Token Security
```python
def create_embed_token(report_id: str, permissions: List[str], user_context: dict):
    """Generate secure embed token with limited scope."""
    payload = {
        "report_id": report_id,
        "permissions": permissions,
        "user_context": user_context,
        "type": "embed",
        "exp": datetime.utcnow() + timedelta(hours=1),  # Short expiry
        "iat": datetime.utcnow(),
        "jti": str(uuid.uuid4())  # Unique token ID
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")
```

### Content Security Policy for Embeds
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    frame-ancestors 'self' https://trusted-domain.com;
">
```

## File Upload Security

### File Validation
- **Type Validation**: Whitelist of allowed file extensions
- **Content Validation**: Magic number verification
- **Size Limits**: Maximum file size per user role
- **Virus Scanning**: Integration with antivirus APIs (planned)

```python
ALLOWED_EXTENSIONS = {
    'csv': ['text/csv', 'application/csv'],
    'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'json': ['application/json'],
    'parquet': ['application/octet-stream']
}

MAX_FILE_SIZES = {
    'viewer': 10 * 1024 * 1024,    # 10MB
    'contributor': 50 * 1024 * 1024,  # 50MB  
    'editor': 100 * 1024 * 1024,     # 100MB
    'owner': 500 * 1024 * 1024       # 500MB
}
```

### Secure File Storage
- **Isolated Storage**: Each workspace has isolated storage
- **Temporary Processing**: Files processed in secure temp locations
- **Access URLs**: Pre-signed URLs with expiration
- **Cleanup**: Automatic cleanup of temporary files

## Database Security

### Connection Security
```python
DATABASE_CONFIG = {
    "ssl_mode": "require",
    "ssl_cert": "/certs/client-cert.pem", 
    "ssl_key": "/certs/client-key.pem",
    "ssl_ca": "/certs/ca-cert.pem",
    "connect_timeout": 10,
    "command_timeout": 30
}
```

### Query Security
- **Prepared Statements**: All queries use parameterized statements
- **Connection Pooling**: Limited, monitored connection pools  
- **Query Timeout**: Automatic query timeout to prevent DoS
- **Resource Limits**: Memory and CPU limits for queries

### Data Retention
```sql
-- Automated data cleanup policies
CREATE POLICY cleanup_old_jobs ON jobs 
FOR DELETE USING (created_at < NOW() - INTERVAL '30 days');

CREATE POLICY cleanup_temp_files ON file_storage 
FOR DELETE USING (expires_at < NOW());
```

## Monitoring & Alerting

### Security Monitoring
- **Failed Login Attempts**: Alert after 5 failed attempts
- **Unusual Access Patterns**: ML-based anomaly detection (planned)
- **Data Export Monitoring**: Track large data exports
- **Admin Actions**: All privileged actions logged and alerted

### Audit Logging
```python
AUDIT_EVENTS = [
    "user_login", "user_logout", "user_registration",
    "workspace_created", "workspace_deleted", 
    "report_created", "report_published", "report_shared",
    "data_uploaded", "data_exported", "permissions_changed",
    "admin_action", "security_event"
]
```

### Log Format
```json
{
    "timestamp": "2024-01-01T12:00:00Z",
    "event_type": "user_login",
    "user_id": "uuid",
    "session_id": "uuid", 
    "ip_address": "192.168.1.100",
    "user_agent": "Browser/Version",
    "success": true,
    "metadata": {
        "workspace_id": "uuid",
        "resource_id": "uuid",
        "action": "create_report"
    }
}
```

## Incident Response

### Security Incident Classification
- **P0 - Critical**: Data breach, system compromise
- **P1 - High**: Authentication bypass, privilege escalation  
- **P2 - Medium**: Data exposure, service disruption
- **P3 - Low**: Policy violation, suspicious activity

### Response Procedures
1. **Detection**: Automated alerts trigger incident
2. **Assessment**: Security team evaluates severity
3. **Containment**: Isolate affected systems/users
4. **Investigation**: Forensic analysis and root cause
5. **Recovery**: Restore services and apply fixes
6. **Communication**: Notify stakeholders as required
7. **Post-Incident**: Review and improve procedures

## Compliance Considerations

### Data Protection Regulations
- **GDPR Compliance**: Right to be forgotten, data portability
- **CCPA Compliance**: Data disclosure and deletion rights  
- **SOC 2**: Security and availability controls (planned)
- **ISO 27001**: Information security management (planned)

### Data Handling Policies
- **Data Minimization**: Collect only necessary data
- **Purpose Limitation**: Use data only for stated purposes
- **Retention Limits**: Automatic data deletion policies
- **Cross-Border**: Restrictions on data transfer regions

## Security Configuration

### Environment Variables
```bash
# Never store in code - use environment variables
JWT_SECRET_KEY=<256-bit-random-key>
DATABASE_ENCRYPTION_KEY=<AES-256-key>
S3_ENCRYPTION_KEY=<S3-SSE-key>
OAUTH_CLIENT_SECRET=<oauth-provider-secret>

# Security settings
FORCE_HTTPS=true
SECURE_COOKIES=true
SESSION_TIMEOUT=3600
MAX_LOGIN_ATTEMPTS=5
```

### Production Checklist
- [ ] All secrets stored in secure vault
- [ ] TLS certificates properly configured  
- [ ] Database connections encrypted
- [ ] File upload restrictions enabled
- [ ] Rate limiting configured
- [ ] CORS properly restricted
- [ ] Security headers enabled
- [ ] Audit logging active
- [ ] Monitoring alerts configured
- [ ] Backup encryption enabled
- [ ] Incident response plan tested
- [ ] Security scanning automated
- [ ] Penetration testing completed

## Security Updates & Patches

### Dependency Management
- **Automated Scanning**: Daily dependency vulnerability scans
- **Update Policy**: Security patches applied within 48 hours
- **Testing**: All updates tested in staging environment
- **Rollback Plan**: Quick rollback procedure for failed updates

### Security Review Process
- **Code Review**: All code changes reviewed for security
- **Architecture Review**: Security assessment for major changes
- **Penetration Testing**: Quarterly external security testing
- **Bug Bounty**: Community-driven vulnerability discovery (planned)

---

This security documentation should be reviewed regularly and updated as new threats emerge and the platform evolves. Security is an ongoing process that requires continuous monitoring and improvement.