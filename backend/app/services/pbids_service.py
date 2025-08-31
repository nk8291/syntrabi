"""
PBIDS service for PowerBI Web Replica.
Handles PBIDS file operations, template management, and connection reuse.
"""

import json
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete, func
from sqlalchemy.orm import selectinload

import structlog
from app.models.pbids import PBIDS, PBIDSTemplate, ConnectionType, AuthenticationKind, PrivacyLevel
from app.models.user import User

logger = structlog.get_logger()


class PBIDSService:
    """Service for managing PBIDS files and templates."""
    
    @staticmethod
    async def create_pbids(
        session: AsyncSession,
        workspace_id: str,
        user_id: str,
        name: str,
        connection_type: ConnectionType,
        connections: List[Dict[str, Any]],
        description: str = None,
        is_template: bool = False,
        tags: List[str] = None
    ) -> PBIDS:
        """Create a new PBIDS file."""
        try:
            pbids = PBIDS(
                workspace_id=workspace_id,
                created_by=user_id,
                name=name,
                description=description,
                connection_type=connection_type,
                connections=connections,
                is_template=is_template,
                tags=tags or []
            )
            
            session.add(pbids)
            await session.commit()
            await session.refresh(pbids)
            
            logger.info(
                "PBIDS created successfully",
                pbids_id=str(pbids.id),
                workspace_id=workspace_id,
                connection_type=connection_type.value,
                user_id=user_id
            )
            
            return pbids
            
        except Exception as e:
            logger.error("Failed to create PBIDS", error=str(e), workspace_id=workspace_id)
            await session.rollback()
            raise
    
    @staticmethod
    async def get_pbids_by_workspace(
        session: AsyncSession,
        workspace_id: str,
        include_templates: bool = True
    ) -> List[PBIDS]:
        """Get all PBIDS files in a workspace."""
        try:
            stmt = (
                select(PBIDS)
                .where(PBIDS.workspace_id == workspace_id)
            )
            
            if not include_templates:
                stmt = stmt.where(PBIDS.is_template == False)
                
            stmt = stmt.order_by(PBIDS.last_used.desc(), PBIDS.created_at.desc())
            
            result = await session.execute(stmt)
            return result.scalars().all()
            
        except Exception as e:
            logger.error("Failed to get PBIDS files", error=str(e), workspace_id=workspace_id)
            return []
    
    @staticmethod
    async def get_pbids_by_id(
        session: AsyncSession,
        pbids_id: str
    ) -> Optional[PBIDS]:
        """Get PBIDS file by ID."""
        try:
            stmt = select(PBIDS).where(PBIDS.id == pbids_id)
            result = await session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error("Failed to get PBIDS", error=str(e), pbids_id=pbids_id)
            return None
    
    @staticmethod
    async def update_pbids(
        session: AsyncSession,
        pbids_id: str,
        updates: Dict[str, Any]
    ) -> Optional[PBIDS]:
        """Update PBIDS file."""
        try:
            stmt = (
                update(PBIDS)
                .where(PBIDS.id == pbids_id)
                .values(**updates)
            )
            await session.execute(stmt)
            await session.commit()
            
            return await PBIDSService.get_pbids_by_id(session, pbids_id)
            
        except Exception as e:
            logger.error("Failed to update PBIDS", error=str(e), pbids_id=pbids_id)
            await session.rollback()
            raise
    
    @staticmethod
    async def delete_pbids(
        session: AsyncSession,
        pbids_id: str
    ) -> bool:
        """Delete PBIDS file."""
        try:
            stmt = delete(PBIDS).where(PBIDS.id == pbids_id)
            result = await session.execute(stmt)
            await session.commit()
            return result.rowcount > 0
        except Exception as e:
            logger.error("Failed to delete PBIDS", error=str(e), pbids_id=pbids_id)
            await session.rollback()
            return False
    
    @staticmethod
    async def increment_pbids_usage(
        session: AsyncSession,
        pbids_id: str
    ) -> bool:
        """Increment PBIDS usage count."""
        try:
            stmt = (
                update(PBIDS)
                .where(PBIDS.id == pbids_id)
                .values(
                    usage_count=PBIDS.usage_count + 1,
                    last_used=func.now()
                )
            )
            await session.execute(stmt)
            await session.commit()
            return True
        except Exception as e:
            logger.error("Failed to increment PBIDS usage", error=str(e), pbids_id=pbids_id)
            return False
    
    @staticmethod
    async def export_pbids_file(
        session: AsyncSession,
        pbids_id: str
    ) -> Optional[bytes]:
        """Export PBIDS as downloadable .pbids file."""
        try:
            pbids = await PBIDSService.get_pbids_by_id(session, pbids_id)
            if not pbids:
                return None
            
            pbids_content = pbids.to_pbids_format()
            return json.dumps(pbids_content, indent=2).encode('utf-8')
            
        except Exception as e:
            logger.error("Failed to export PBIDS file", error=str(e), pbids_id=pbids_id)
            return None
    
    @staticmethod
    async def import_pbids_file(
        session: AsyncSession,
        workspace_id: str,
        user_id: str,
        file_content: bytes,
        name: str = None
    ) -> Optional[PBIDS]:
        """Import PBIDS from .pbids file."""
        try:
            content = json.loads(file_content.decode('utf-8'))
            
            # Validate PBIDS format
            if 'connections' not in content:
                raise ValueError("Invalid PBIDS format: missing 'connections'")
            
            # Determine connection type from connections
            connection_type = PBIDSService._detect_connection_type(content['connections'])
            
            pbids = PBIDS(
                workspace_id=workspace_id,
                created_by=user_id,
                name=name or f"Imported PBIDS {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                connection_type=connection_type,
                connections=content['connections'],
                version=content.get('version', '0.1')
            )
            
            session.add(pbids)
            await session.commit()
            await session.refresh(pbids)
            
            logger.info(
                "PBIDS imported successfully",
                pbids_id=str(pbids.id),
                workspace_id=workspace_id,
                user_id=user_id
            )
            
            return pbids
            
        except Exception as e:
            logger.error("Failed to import PBIDS file", error=str(e), workspace_id=workspace_id)
            await session.rollback()
            raise
    
    @staticmethod
    def _detect_connection_type(connections: List[Dict[str, Any]]) -> ConnectionType:
        """Detect connection type from connections array."""
        if not connections:
            return ConnectionType.BLANK_QUERY
        
        connection = connections[0]
        details = connection.get('details', {})
        protocol = details.get('protocol', '').lower()
        
        # Map protocols to connection types
        protocol_mapping = {
            'tds': ConnectionType.SQL_SERVER,
            'oracle': ConnectionType.ORACLE,
            'mysql': ConnectionType.MYSQL,
            'postgresql': ConnectionType.POSTGRESQL,
            'http': ConnectionType.WEB,
            'https': ConnectionType.WEB,
            'file': ConnectionType.EXCEL,  # Could be CSV, XML, etc.
            'googlebigquery': ConnectionType.GOOGLE_BIGQUERY,
            'm': ConnectionType.BLANK_QUERY,
        }
        
        return protocol_mapping.get(protocol, ConnectionType.BLANK_QUERY)
    
    @staticmethod
    async def get_popular_templates(
        session: AsyncSession,
        limit: int = 20
    ) -> List[PBIDSTemplate]:
        """Get popular PBIDS templates."""
        try:
            stmt = (
                select(PBIDSTemplate)
                .where(PBIDSTemplate.is_popular == True)
                .order_by(PBIDSTemplate.sort_order.asc(), PBIDSTemplate.name.asc())
                .limit(limit)
            )
            result = await session.execute(stmt)
            return result.scalars().all()
        except Exception as e:
            logger.error("Failed to get popular templates", error=str(e))
            return []
    
    @staticmethod
    async def get_templates_by_category(
        session: AsyncSession,
        category: str
    ) -> List[PBIDSTemplate]:
        """Get PBIDS templates by category."""
        try:
            stmt = (
                select(PBIDSTemplate)
                .where(PBIDSTemplate.category == category)
                .order_by(PBIDSTemplate.sort_order.asc(), PBIDSTemplate.name.asc())
            )
            result = await session.execute(stmt)
            return result.scalars().all()
        except Exception as e:
            logger.error("Failed to get templates by category", error=str(e), category=category)
            return []
    
    @staticmethod
    async def create_pbids_from_template(
        session: AsyncSession,
        template_id: str,
        workspace_id: str,
        user_id: str,
        name: str,
        parameters: Dict[str, Any]
    ) -> Optional[PBIDS]:
        """Create PBIDS from template with user parameters."""
        try:
            # Get template
            template_stmt = select(PBIDSTemplate).where(PBIDSTemplate.id == template_id)
            template_result = await session.execute(template_stmt)
            template = template_result.scalar_one_or_none()
            
            if not template:
                raise ValueError(f"Template {template_id} not found")
            
            # Replace template parameters with user values
            connections = PBIDSService._substitute_template_parameters(
                template.template_config,
                parameters
            )
            
            pbids = PBIDS(
                workspace_id=workspace_id,
                created_by=user_id,
                name=name,
                connection_type=template.connection_type,
                connections=connections
            )
            
            session.add(pbids)
            await session.commit()
            await session.refresh(pbids)
            
            logger.info(
                "PBIDS created from template",
                pbids_id=str(pbids.id),
                template_id=template_id,
                workspace_id=workspace_id
            )
            
            return pbids
            
        except Exception as e:
            logger.error("Failed to create PBIDS from template", error=str(e), template_id=template_id)
            await session.rollback()
            raise
    
    @staticmethod
    def _substitute_template_parameters(
        template_config: Dict[str, Any],
        parameters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Substitute template parameters with actual values."""
        def substitute_recursive(obj):
            if isinstance(obj, dict):
                return {k: substitute_recursive(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [substitute_recursive(item) for item in obj]
            elif isinstance(obj, str) and obj.startswith('{{') and obj.endswith('}}'):
                param_name = obj[2:-2].strip()
                return parameters.get(param_name, obj)
            else:
                return obj
        
        return substitute_recursive(template_config)
    
    @staticmethod
    async def search_pbids(
        session: AsyncSession,
        workspace_id: str,
        query: str,
        connection_types: List[ConnectionType] = None
    ) -> List[PBIDS]:
        """Search PBIDS files by name, description, or tags."""
        try:
            stmt = (
                select(PBIDS)
                .where(PBIDS.workspace_id == workspace_id)
            )
            
            # Add text search
            if query:
                search_filter = (
                    PBIDS.name.ilike(f'%{query}%') |
                    PBIDS.description.ilike(f'%{query}%')
                )
                stmt = stmt.where(search_filter)
            
            # Filter by connection types
            if connection_types:
                stmt = stmt.where(PBIDS.connection_type.in_(connection_types))
            
            stmt = stmt.order_by(PBIDS.usage_count.desc(), PBIDS.name.asc())
            
            result = await session.execute(stmt)
            return result.scalars().all()
            
        except Exception as e:
            logger.error("Failed to search PBIDS", error=str(e), workspace_id=workspace_id)
            return []


class PBIDSBuilderService:
    """Service for building PBIDS files with guided UI."""
    
    @staticmethod
    def get_connection_schema(connection_type: ConnectionType) -> Dict[str, Any]:
        """Get the schema for a specific connection type."""
        schemas = {
            ConnectionType.SQL_SERVER: {
                "required_fields": ["server", "database"],
                "optional_fields": ["port", "username", "password"],
                "authentication_options": [
                    AuthenticationKind.WINDOWS,
                    AuthenticationKind.BASIC,
                    AuthenticationKind.SERVICE_PRINCIPAL
                ],
                "default_port": 1433
            },
            ConnectionType.POSTGRESQL: {
                "required_fields": ["server", "database"],
                "optional_fields": ["port", "username", "password"],
                "authentication_options": [AuthenticationKind.BASIC],
                "default_port": 5432
            },
            ConnectionType.MYSQL: {
                "required_fields": ["server", "database"],
                "optional_fields": ["port", "username", "password"],
                "authentication_options": [AuthenticationKind.BASIC],
                "default_port": 3306
            },
            ConnectionType.EXCEL: {
                "required_fields": ["file_path"],
                "optional_fields": [],
                "authentication_options": [AuthenticationKind.ANONYMOUS]
            },
            ConnectionType.WEB: {
                "required_fields": ["url"],
                "optional_fields": ["username", "password", "api_key"],
                "authentication_options": [
                    AuthenticationKind.ANONYMOUS,
                    AuthenticationKind.BASIC,
                    AuthenticationKind.OAUTH2
                ]
            }
        }
        
        return schemas.get(connection_type, {
            "required_fields": [],
            "optional_fields": [],
            "authentication_options": [AuthenticationKind.ANONYMOUS]
        })
    
    @staticmethod
    def validate_connection_config(
        connection_type: ConnectionType,
        config: Dict[str, Any]
    ) -> List[str]:
        """Validate connection configuration and return list of errors."""
        errors = []
        schema = PBIDSBuilderService.get_connection_schema(connection_type)
        
        # Check required fields
        for field in schema.get("required_fields", []):
            if not config.get(field):
                errors.append(f"Required field '{field}' is missing")
        
        # Validate specific field formats
        if connection_type in [ConnectionType.SQL_SERVER, ConnectionType.POSTGRESQL, ConnectionType.MYSQL]:
            if config.get("port") and not isinstance(config["port"], int):
                errors.append("Port must be a number")
        
        if connection_type == ConnectionType.WEB:
            url = config.get("url", "")
            if url and not (url.startswith("http://") or url.startswith("https://")):
                errors.append("URL must start with http:// or https://")
        
        return errors