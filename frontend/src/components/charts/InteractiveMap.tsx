/**
 * Interactive Map Component using Leaflet
 * Supports markers, choropleth maps, and various geographic visualizations
 */

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in React/Vite
// Configure default icon URLs directly since Vite handles assets differently
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export interface MapDataPoint {
  id: string
  latitude: number
  longitude: number
  value?: number
  label?: string
  category?: string
  color?: string
  size?: number
}

export interface MapConfig {
  center?: [number, number]
  zoom?: number
  mapType?: 'markers' | 'choropleth' | 'heatmap'
  colorScale?: string[]
  showLegend?: boolean
  clusterMarkers?: boolean
  tileLayer?: string
  attribution?: string
  maxZoom?: number
  minZoom?: number
}

interface InteractiveMapProps {
  data: MapDataPoint[]
  config?: MapConfig
  width?: string | number
  height?: string | number
  onMarkerClick?: (dataPoint: MapDataPoint) => void
  onMapClick?: (latlng: L.LatLng) => void
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  data,
  config = {},
  width = '100%',
  height = '400px',
  onMarkerClick,
  onMapClick
}) => {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Marker[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const defaultConfig: MapConfig = {
    center: [51.505, -0.09],
    zoom: 2,
    mapType: 'markers',
    colorScale: ['#3B82F6', '#1E40AF', '#1E3A8A'],
    showLegend: true,
    clusterMarkers: false,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
    minZoom: 1,
    ...config
  }

  // Calculate center from data if not provided
  const calculateCenter = (): [number, number] => {
    if (data.length === 0) return defaultConfig.center!
    
    const latSum = data.reduce((sum, point) => sum + point.latitude, 0)
    const lngSum = data.reduce((sum, point) => sum + point.longitude, 0)
    
    return [latSum / data.length, lngSum / data.length]
  }

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const center = defaultConfig.center || calculateCenter()
    
    mapRef.current = L.map(containerRef.current, {
      center,
      zoom: defaultConfig.zoom!,
      maxZoom: defaultConfig.maxZoom,
      minZoom: defaultConfig.minZoom,
    })

    // Add tile layer
    L.tileLayer(defaultConfig.tileLayer!, {
      attribution: defaultConfig.attribution,
      maxZoom: defaultConfig.maxZoom,
    }).addTo(mapRef.current)

    // Add map click handler
    if (onMapClick) {
      mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng)
      })
    }

    setIsLoading(false)

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || isLoading) return

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapRef.current!.removeLayer(marker)
    })
    markersRef.current = []

    if (data.length === 0) return

    // Add new markers
    const markers: L.Marker[] = []

    data.forEach(point => {
      const marker = L.marker([point.latitude, point.longitude])

      // Create popup content
      const popupContent = `
        <div class="map-popup">
          <h3 class="font-semibold text-sm">${point.label || 'Location'}</h3>
          ${point.value !== undefined ? `<p class="text-xs text-gray-600">Value: ${point.value}</p>` : ''}
          ${point.category ? `<p class="text-xs text-gray-600">Category: ${point.category}</p>` : ''}
        </div>
      `

      marker.bindPopup(popupContent)

      // Add click handler
      if (onMarkerClick) {
        marker.on('click', () => {
          onMarkerClick(point)
        })
      }

      // Customize marker based on data
      if (point.color) {
        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="background-color: ${point.color}; width: ${point.size || 12}px; height: ${point.size || 12}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [point.size || 12, point.size || 12],
          iconAnchor: [(point.size || 12) / 2, (point.size || 12) / 2],
        })
        marker.setIcon(customIcon)
      }

      marker.addTo(mapRef.current!)
      markers.push(marker)
    })

    markersRef.current = markers

    // Fit bounds to show all markers
    if (markers.length > 0) {
      const group = new L.featureGroup(markers)
      mapRef.current.fitBounds(group.getBounds(), { padding: [20, 20] })
    }

  }, [data, isLoading, onMarkerClick])

  // Handle resize
  useEffect(() => {
    if (mapRef.current) {
      // Delay resize to ensure container dimensions are updated
      setTimeout(() => {
        mapRef.current?.invalidateSize()
      }, 100)
    }
  }, [width, height])

  if (isLoading) {
    return (
      <div 
        style={{ width, height }}
        className="flex items-center justify-center bg-gray-100 rounded-lg"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        style={{ width, height }}
        className="rounded-lg overflow-hidden border border-gray-200"
      />
      
      {/* Legend */}
      {defaultConfig.showLegend && data.length > 0 && (
        <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <h4 className="font-semibold text-sm mb-2">Legend</h4>
          <div className="space-y-1">
            {/* Show unique categories */}
            {Array.from(new Set(data.map(d => d.category).filter(Boolean))).map((category, index) => (
              <div key={category} className="flex items-center text-xs">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ 
                    backgroundColor: defaultConfig.colorScale![index % defaultConfig.colorScale!.length] 
                  }}
                />
                <span>{category}</span>
              </div>
            ))}
            
            {/* Show value range if present */}
            {data.some(d => d.value !== undefined) && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Value range: {Math.min(...data.filter(d => d.value !== undefined).map(d => d.value!))} - {Math.max(...data.filter(d => d.value !== undefined).map(d => d.value!))}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Map info */}
      <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
        <p className="text-xs text-gray-600">
          {data.length} location{data.length !== 1 ? 's' : ''} shown
        </p>
      </div>
    </div>
  )
}

export default InteractiveMap