"""
PBIDS (Power BI Dataset) Service for Syntra
Handles creation, management, and sharing of Power BI Dataset files (.pbids)
"""

import json
import tempfile
import os
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import structlog

from app.models.dataset import Dataset, ConnectorType

logger = structlog.get_logger()


class PBIDSManager:
    """Manager for Power BI Dataset (.pbids) files."""
    
    @staticmethod
    def create_pbids_content(
        connection_info: Dict[str, Any],
        connector_type: ConnectorType,
        dataset_name: str,
        description: Optional[str] = None,
        version: str = "1.0"
    ) -> Dict[str, Any]:
        """Create PBIDS file content structure."""
        
        pbids_content = {
            "version": version,
            "connections": [
                {
                    "details": {
                        "protocol": PBIDSManager._get_protocol_for_connector(connector_type),
                        "address": connection_info
                    },
                    "mode": "DirectQuery",
                    "options": {}
                }
            ],
            "metadata": {
                "name": dataset_name,
                "description": description or f"Dataset connection for {dataset_name}",
                "created": datetime.now(timezone.utc).isoformat(),
                "connector_type": connector_type.value,
                "syntra_version": "1.2.0"
            }
        }
        
        return pbids_content
    
    @staticmethod
    def _get_protocol_for_connector(connector_type: ConnectorType) -> str:
        """Get the protocol identifier for a connector type."""
        protocol_mapping = {
            ConnectorType.SQL_SERVER: "tds",
            ConnectorType.POSTGRESQL: "postgresql",
            ConnectorType.MYSQL: "mysql",
            ConnectorType.ORACLE: "oracle",
            ConnectorType.WEB: "https",
            ConnectorType.REST_API: "https",
            ConnectorType.CSV: "file",
            ConnectorType.EXCEL: "file",
            ConnectorType.JSON: "file"
        }
        return protocol_mapping.get(connector_type, "unknown")
    
    @staticmethod
    async def export_pbids_file(dataset: Dataset, name: str) -> Tuple[str, bytes]:
        """Export dataset as a downloadable PBIDS file."""
        
        pbids_content = PBIDSManager.create_pbids_content(
            connection_info=dataset.connector_config,
            connector_type=dataset.connector_type,
            dataset_name=name,
            description=dataset.description
        )
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.pbids', delete=False) as temp_file:
            json.dump(pbids_content, temp_file, indent=2)
            temp_file_path = temp_file.name
        
        with open(temp_file_path, 'rb') as file:
            file_content = file.read()
        
        os.unlink(temp_file_path)
        
        filename = f"{name}.pbids"
        return filename, file_content