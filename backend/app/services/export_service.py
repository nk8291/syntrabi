"""
Export Service for Server-side Report Rendering
Handles PNG, PDF, and other format exports using headless browser and image generation
"""

import io
import json
import base64
import asyncio
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
import structlog
from pathlib import Path
import tempfile
import os

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.utils import ImageReader
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

from app.core.config import get_settings
from app.services.storage_service import storage_service

logger = structlog.get_logger()
settings = get_settings()

class ExportService:
    """Server-side export service for reports and visualizations"""
    
    def __init__(self):
        self.temp_dir = Path(tempfile.gettempdir()) / "syntra_exports"
        self.temp_dir.mkdir(exist_ok=True)
        
    async def export_report_as_image(
        self, 
        report_json: Dict[str, Any], 
        format: str = "png",
        width: int = 1200,
        height: int = 800,
        quality: int = 90
    ) -> Tuple[bytes, str]:
        """Export report as PNG/JPEG using headless browser"""
        
        if not PLAYWRIGHT_AVAILABLE:
            # Fallback to simple HTML template export
            return await self._export_html_fallback(report_json, format, width, height)
        
        try:
            # Generate HTML content for the report
            html_content = await self._generate_report_html(report_json, width, height)
            
            # Use Playwright for rendering
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page(viewport={'width': width, 'height': height})
                
                # Set content and wait for charts to render
                await page.set_content(html_content, wait_until='networkidle')
                await asyncio.sleep(2)  # Allow charts to fully render
                
                # Take screenshot
                screenshot_bytes = await page.screenshot(
                    type=format.lower(),
                    quality=quality if format.lower() == 'jpeg' else None,
                    full_page=True
                )
                
                await browser.close()
                
                # Generate filename
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"report_export_{timestamp}.{format.lower()}"
                
                logger.info("Report exported successfully", 
                          format=format, 
                          size=len(screenshot_bytes),
                          filename=filename)
                
                return screenshot_bytes, filename
                
        except Exception as e:
            logger.error("Failed to export report with Playwright", error=str(e))
            return await self._export_html_fallback(report_json, format, width, height)
    
    async def export_report_as_pdf(
        self,
        report_json: Dict[str, Any],
        width: int = 1200,
        height: int = 800,
        page_format: str = "A4"
    ) -> Tuple[bytes, str]:
        """Export report as PDF"""
        
        if PLAYWRIGHT_AVAILABLE:
            try:
                # Generate HTML content
                html_content = await self._generate_report_html(report_json, width, height)
                
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    page = await browser.new_page(viewport={'width': width, 'height': height})
                    
                    await page.set_content(html_content, wait_until='networkidle')
                    await asyncio.sleep(2)
                    
                    # Generate PDF
                    pdf_bytes = await page.pdf(
                        format=page_format,
                        print_background=True,
                        margin={
                            'top': '20px',
                            'right': '20px', 
                            'bottom': '20px',
                            'left': '20px'
                        }
                    )
                    
                    await browser.close()
                    
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"report_export_{timestamp}.pdf"
                    
                    logger.info("Report exported as PDF", size=len(pdf_bytes), filename=filename)
                    return pdf_bytes, filename
                    
            except Exception as e:
                logger.error("Failed to export PDF with Playwright", error=str(e))
        
        # Fallback to ReportLab if available
        if REPORTLAB_AVAILABLE:
            return await self._export_pdf_reportlab(report_json, width, height)
        
        raise Exception("PDF export not available - missing dependencies")
    
    async def export_visual_as_image(
        self,
        visual_config: Dict[str, Any],
        data: list,
        format: str = "png",
        width: int = 600,
        height: int = 400
    ) -> Tuple[bytes, str]:
        """Export single visualization as image"""
        
        # Create minimal report with single visual
        report_json = {
            "version": "1.0",
            "pages": [{
                "id": "export-page",
                "name": "Export",
                "visuals": [visual_config]
            }]
        }
        
        return await self.export_report_as_image(report_json, format, width, height)
    
    async def _generate_report_html(
        self,
        report_json: Dict[str, Any],
        width: int,
        height: int
    ) -> str:
        """Generate HTML content for report rendering"""
        
        # Basic HTML template with ECharts
        html_template = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Syntra Report Export</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body {{
            margin: 0;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: white;
        }}
        .report-container {{
            width: {width}px;
            min-height: {height}px;
            position: relative;
        }}
        .visual-container {{
            position: absolute;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }}
        .chart {{
            width: 100%;
            height: 100%;
        }}
        .map {{
            width: 100%;
            height: 100%;
            border-radius: 8px;
        }}
        .report-title {{
            font-size: 24px;
            font-weight: bold;
            color: #1e3a8a;
            margin-bottom: 20px;
            text-align: center;
        }}
        .page-title {{
            font-size: 18px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 15px;
        }}
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-title">Syntra Report Export</div>
        {await self._generate_page_html(report_json.get('pages', []))}
    </div>
    <script>
        // Initialize all charts after DOM is ready
        document.addEventListener('DOMContentLoaded', function() {{
            {await self._generate_chart_scripts(report_json.get('pages', []))}
            
            // Mark as ready for screenshot
            setTimeout(() => {{
                document.body.setAttribute('data-export-ready', 'true');
            }}, 1000);
        }});
    </script>
</body>
</html>
        """
        
        return html_template
    
    async def _generate_page_html(self, pages: list) -> str:
        """Generate HTML for report pages"""
        html_parts = []
        
        for page in pages:
            page_html = f'<div class="page-title">{page.get("name", "Page")}</div>'
            
            for visual in page.get('visuals', []):
                position = visual.get('position', {})
                x = position.get('x', 0)
                y = position.get('y', 50)
                width = position.get('width', 400)
                height = position.get('height', 300)
                
                visual_id = visual.get('id', 'visual')
                visual_type = visual.get('type', 'column-chart')
                
                if visual_type in ['map', 'leaflet-map']:
                    # Map container
                    visual_html = f'''
                    <div class="visual-container" style="left:{x}px; top:{y}px; width:{width}px; height:{height}px;">
                        <div id="{visual_id}" class="map"></div>
                    </div>
                    '''
                else:
                    # Chart container
                    visual_html = f'''
                    <div class="visual-container" style="left:{x}px; top:{y}px; width:{width}px; height:{height}px;">
                        <div id="{visual_id}" class="chart"></div>
                    </div>
                    '''
                
                page_html += visual_html
            
            html_parts.append(page_html)
        
        return '\n'.join(html_parts)
    
    async def _generate_chart_scripts(self, pages: list) -> str:
        """Generate JavaScript for chart initialization"""
        scripts = []
        
        for page in pages:
            for visual in page.get('visuals', []):
                visual_id = visual.get('id', 'visual')
                visual_type = visual.get('type', 'column-chart')
                config = visual.get('config', {})
                
                if visual_type in ['map', 'leaflet-map']:
                    # Leaflet map initialization
                    lat = config.get('center_lat', 51.505)
                    lng = config.get('center_lng', -0.09)
                    zoom = config.get('zoom', 13)
                    
                    script = f'''
                    try {{
                        var map_{visual_id} = L.map('{visual_id}').setView([{lat}, {lng}], {zoom});
                        L.tileLayer('https://tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
                            attribution: '© OpenStreetMap contributors'
                        }}).addTo(map_{visual_id});
                        
                        // Add sample markers
                        L.marker([{lat}, {lng}]).addTo(map_{visual_id})
                            .bindPopup('Sample Location');
                    }} catch(e) {{
                        console.error('Map initialization error:', e);
                    }}
                    '''
                else:
                    # ECharts initialization with sample data
                    chart_option = await self._generate_chart_option(visual_type, config)
                    
                    script = f'''
                    try {{
                        var chart_{visual_id} = echarts.init(document.getElementById('{visual_id}'));
                        chart_{visual_id}.setOption({json.dumps(chart_option)});
                        
                        // Resize chart to fit container
                        setTimeout(() => chart_{visual_id}.resize(), 100);
                    }} catch(e) {{
                        console.error('Chart initialization error:', e);
                    }}
                    '''
                
                scripts.append(script)
        
        return '\n'.join(scripts)
    
    async def _generate_chart_option(self, visual_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate ECharts option for different visual types"""
        
        # Sample data for export
        sample_data = [
            {'category': 'A', 'value': 120, 'series': 'Series 1'},
            {'category': 'B', 'value': 200, 'series': 'Series 1'}, 
            {'category': 'C', 'value': 150, 'series': 'Series 1'},
            {'category': 'A', 'value': 80, 'series': 'Series 2'},
            {'category': 'B', 'value': 160, 'series': 'Series 2'},
            {'category': 'C', 'value': 90, 'series': 'Series 2'}
        ]
        
        if visual_type == 'column-chart':
            return {
                'title': {'text': config.get('title', 'Column Chart')},
                'tooltip': {'trigger': 'axis'},
                'xAxis': {'type': 'category', 'data': ['A', 'B', 'C']},
                'yAxis': {'type': 'value'},
                'series': [{
                    'type': 'bar',
                    'data': [120, 200, 150]
                }]
            }
        elif visual_type == 'line-chart':
            return {
                'title': {'text': config.get('title', 'Line Chart')},
                'tooltip': {'trigger': 'axis'},
                'xAxis': {'type': 'category', 'data': ['A', 'B', 'C']},
                'yAxis': {'type': 'value'},
                'series': [{
                    'type': 'line',
                    'data': [120, 200, 150]
                }]
            }
        elif visual_type == 'pie-chart':
            return {
                'title': {'text': config.get('title', 'Pie Chart')},
                'tooltip': {'trigger': 'item'},
                'series': [{
                    'type': 'pie',
                    'data': [
                        {'name': 'A', 'value': 120},
                        {'name': 'B', 'value': 200},
                        {'name': 'C', 'value': 150}
                    ]
                }]
            }
        else:
            # Default chart
            return {
                'title': {'text': config.get('title', 'Chart')},
                'tooltip': {'trigger': 'axis'},
                'xAxis': {'type': 'category', 'data': ['A', 'B', 'C']},
                'yAxis': {'type': 'value'},
                'series': [{
                    'type': 'bar',
                    'data': [120, 200, 150]
                }]
            }
    
    async def _export_html_fallback(
        self,
        report_json: Dict[str, Any],
        format: str,
        width: int,
        height: int
    ) -> Tuple[bytes, str]:
        """Fallback export method when Playwright is not available"""
        
        # Generate simple HTML report
        html_content = await self._generate_report_html(report_json, width, height)
        
        # Save as HTML and return as bytes
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"report_export_{timestamp}.html"
        
        html_bytes = html_content.encode('utf-8')
        
        logger.warning("Using HTML fallback export - Playwright not available")
        return html_bytes, filename
    
    async def _export_pdf_reportlab(
        self,
        report_json: Dict[str, Any],
        width: int,
        height: int
    ) -> Tuple[bytes, str]:
        """Fallback PDF export using ReportLab"""
        
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        
        # Title
        p.setFont("Helvetica-Bold", 20)
        p.drawString(50, 750, "Syntra Report Export")
        
        # Basic report info
        p.setFont("Helvetica", 12)
        y_position = 700
        
        for page in report_json.get('pages', []):
            p.drawString(50, y_position, f"Page: {page.get('name', 'Untitled')}")
            y_position -= 30
            
            for visual in page.get('visuals', []):
                visual_info = f"Visual: {visual.get('type', 'Unknown')} - {visual.get('id', 'No ID')}"
                p.drawString(70, y_position, visual_info)
                y_position -= 20
                
                if y_position < 50:
                    p.showPage()
                    y_position = 750
        
        p.save()
        buffer.seek(0)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"report_export_{timestamp}.pdf"
        
        return buffer.getvalue(), filename
    
    async def save_export_to_storage(self, file_bytes: bytes, filename: str) -> str:
        """Save exported file to storage and return URL"""
        try:
            file_path = f"exports/{filename}"
            await storage_service.upload_file(
                file_content=file_bytes,
                file_path=file_path,
                content_type=self._get_content_type(filename)
            )
            
            # Generate presigned URL
            url = await storage_service.generate_presigned_url(file_path)
            return url or f"/api/exports/{filename}"
            
        except Exception as e:
            logger.error("Failed to save export to storage", error=str(e))
            return ""
    
    def _get_content_type(self, filename: str) -> str:
        """Get content type based on file extension"""
        ext = filename.split('.')[-1].lower()
        content_types = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'pdf': 'application/pdf',
            'html': 'text/html'
        }
        return content_types.get(ext, 'application/octet-stream')

# Global service instance
export_service = ExportService()