/**
 * Shape Renderer Component
 * Renders Power BI-style shapes, text boxes, buttons, and other visual elements
 * Based on: https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-reports-add-text-and-shapes
 */

import React from 'react'
import { Visual } from '@/types/report'
import { ShapeType } from '../designer/ShapesPanel'

interface ShapeRendererProps {
  visual: Visual
  width: number
  height: number
  isEditable?: boolean
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({ 
  visual, 
  width, 
  height, 
  isEditable = false 
}) => {
  const shapeType = visual.config?.shapeType as ShapeType || 'rectangle'
  const shapeConfig = visual.config?.shape || {}
  
  // Default styling
  const defaultStyle = {
    fill: shapeConfig.fillColor || '#0078d4',
    stroke: shapeConfig.borderColor || '#005a9e',
    strokeWidth: shapeConfig.borderWidth || 2,
    opacity: shapeConfig.opacity || 1,
  }

  const renderShape = () => {
    switch (shapeType) {
      case 'textbox':
        return (
          <div
            className="w-full h-full flex items-center justify-center p-2"
            style={{
              backgroundColor: shapeConfig.backgroundColor || 'transparent',
              color: shapeConfig.textColor || '#000000',
              fontSize: shapeConfig.fontSize || '14px',
              fontFamily: shapeConfig.fontFamily || 'Arial, sans-serif',
              fontWeight: shapeConfig.fontWeight || 'normal',
              textAlign: shapeConfig.textAlign || 'center',
              border: `${defaultStyle.strokeWidth}px solid ${defaultStyle.stroke}`,
              borderRadius: shapeConfig.borderRadius || '4px',
            }}
          >
            <div className="w-full h-full overflow-hidden">
              {isEditable ? (
                <textarea
                  className="w-full h-full resize-none border-none outline-none bg-transparent"
                  placeholder="Enter text..."
                  defaultValue={shapeConfig.text || 'Text Box'}
                  style={{ color: 'inherit', fontSize: 'inherit', fontFamily: 'inherit' }}
                />
              ) : (
                <div className="whitespace-pre-wrap">
                  {shapeConfig.text || 'Text Box'}
                </div>
              )}
            </div>
          </div>
        )

      case 'button':
        return (
          <button
            className="w-full h-full rounded transition-all hover:opacity-80 active:scale-95"
            style={{
              backgroundColor: defaultStyle.fill,
              color: shapeConfig.textColor || '#ffffff',
              fontSize: shapeConfig.fontSize || '14px',
              fontFamily: shapeConfig.fontFamily || 'Arial, sans-serif',
              fontWeight: shapeConfig.fontWeight || '500',
              border: `${defaultStyle.strokeWidth}px solid ${defaultStyle.stroke}`,
              borderRadius: shapeConfig.borderRadius || '6px',
            }}
            onClick={() => {
              if (shapeConfig.action === 'navigate' && shapeConfig.url) {
                window.open(shapeConfig.url, '_blank')
              }
            }}
          >
            {shapeConfig.text || 'Button'}
          </button>
        )

      case 'web-url':
        return (
          <div
            className="w-full h-full flex items-center justify-center p-2 rounded hover:bg-blue-50 transition-colors"
            style={{
              backgroundColor: shapeConfig.backgroundColor || 'transparent',
              border: `${defaultStyle.strokeWidth}px solid ${defaultStyle.stroke}`,
              borderRadius: '4px',
            }}
          >
            <a
              href={shapeConfig.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline text-center"
              style={{
                fontSize: shapeConfig.fontSize || '14px',
                fontFamily: shapeConfig.fontFamily || 'Arial, sans-serif',
              }}
            >
              {shapeConfig.text || shapeConfig.url || 'Web URL'}
            </a>
          </div>
        )

      case 'image':
        return (
          <div
            className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded"
            style={{ opacity: defaultStyle.opacity }}
          >
            {shapeConfig.imageUrl ? (
              <img
                src={shapeConfig.imageUrl}
                alt={shapeConfig.altText || 'Image'}
                className="max-w-full max-h-full object-contain"
                style={{
                  borderRadius: shapeConfig.borderRadius || '0px',
                }}
              />
            ) : (
              <div className="text-center text-gray-500">
                <div className="text-2xl mb-2">🖼️</div>
                <div className="text-sm">Click to add image</div>
              </div>
            )}
          </div>
        )

      default:
        // SVG shapes
        return (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
            {renderSVGShape(shapeType, width, height, defaultStyle)}
          </svg>
        )
    }
  }

  const renderSVGShape = (type: ShapeType, w: number, h: number, style: any) => {
    const centerX = w / 2
    const centerY = h / 2
    const margin = Math.min(style.strokeWidth * 2, 10)

    switch (type) {
      case 'rectangle':
        return (
          <rect
            x={margin}
            y={margin}
            width={w - margin * 2}
            height={h - margin * 2}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
            rx={shapeConfig.borderRadius || 0}
          />
        )

      case 'rounded-rectangle':
        return (
          <rect
            x={margin}
            y={margin}
            width={w - margin * 2}
            height={h - margin * 2}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
            rx={Math.min(w, h) * 0.1}
            ry={Math.min(w, h) * 0.1}
          />
        )

      case 'oval':
        return (
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={(w - margin * 2) / 2}
            ry={(h - margin * 2) / 2}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        )

      case 'line':
        return (
          <line
            x1={margin}
            y1={centerY}
            x2={w - margin}
            y2={centerY}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        )

      case 'arrow':
        const arrowLength = w - margin * 2
        const arrowHeight = h - margin * 2
        const headWidth = Math.min(arrowHeight * 0.4, 20)
        return (
          <g fill={style.fill} stroke={style.stroke} strokeWidth={style.strokeWidth} opacity={style.opacity}>
            <line
              x1={margin}
              y1={centerY}
              x2={w - margin - headWidth}
              y2={centerY}
              strokeWidth={Math.max(style.strokeWidth, 2)}
            />
            <polygon
              points={`${w - margin - headWidth},${centerY - headWidth/2} ${w - margin},${centerY} ${w - margin - headWidth},${centerY + headWidth/2}`}
            />
          </g>
        )

      case 'triangle':
        return (
          <polygon
            points={`${centerX},${margin} ${w - margin},${h - margin} ${margin},${h - margin}`}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        )

      case 'diamond':
        return (
          <polygon
            points={`${centerX},${margin} ${w - margin},${centerY} ${centerX},${h - margin} ${margin},${centerY}`}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        )

      case 'pentagon':
        const pentagonPoints = Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
          const radius = Math.min(w, h) / 2 - margin
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          return `${x},${y}`
        }).join(' ')
        return (
          <polygon
            points={pentagonPoints}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        )

      case 'hexagon':
        const hexagonPoints = Array.from({ length: 6 }, (_, i) => {
          const angle = (i * 2 * Math.PI) / 6
          const radius = Math.min(w, h) / 2 - margin
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          return `${x},${y}`
        }).join(' ')
        return (
          <polygon
            points={hexagonPoints}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        )

      case 'star':
        const starPoints = Array.from({ length: 10 }, (_, i) => {
          const angle = (i * Math.PI) / 5 - Math.PI / 2
          const radius = i % 2 === 0 
            ? Math.min(w, h) / 2 - margin 
            : (Math.min(w, h) / 2 - margin) * 0.4
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          return `${x},${y}`
        }).join(' ')
        return (
          <polygon
            points={starPoints}
            fill={style.fill}
            stroke={style.stroke}
            strokeWidth={style.strokeWidth}
            opacity={style.opacity}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="shape-renderer w-full h-full">
      {renderShape()}
    </div>
  )
}

export default ShapeRenderer