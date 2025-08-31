/**
 * Bookmarks Panel Component
 * Power BI-style bookmarks for saving and restoring report states
 */

import React, { useState } from 'react'
import {
  BookmarkIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { Visual, ReportPage } from '@/types/report'

interface Bookmark {
  id: string
  name: string
  description?: string
  thumbnail?: string
  pageId: string
  visualStates: { [visualId: string]: any }
  filters: any[]
  selectedVisuals: string[]
  timestamp: string
  isVisible: boolean
}

interface BookmarksPanelProps {
  currentPage: ReportPage
  selectedVisual: Visual | null
  onRestoreBookmark: (bookmark: Bookmark) => void
  onApplyBookmark?: (bookmark: Bookmark) => void
}

const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  currentPage,
  selectedVisual,
  onRestoreBookmark,
  onApplyBookmark
}) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([
    // Sample bookmarks for demo
    {
      id: 'bookmark-1',
      name: 'Q1 Performance',
      description: 'Sales performance for Q1 2024',
      pageId: currentPage.id,
      visualStates: {},
      filters: [],
      selectedVisuals: [],
      timestamp: new Date().toISOString(),
      isVisible: true
    },
    {
      id: 'bookmark-2',
      name: 'Regional Breakdown',
      description: 'Regional sales comparison',
      pageId: currentPage.id,
      visualStates: {},
      filters: [],
      selectedVisuals: [],
      timestamp: new Date().toISOString(),
      isVisible: true
    }
  ])
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBookmarkIndex, setCurrentBookmarkIndex] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBookmarkName, setNewBookmarkName] = useState('')

  const createBookmark = () => {
    if (!newBookmarkName.trim()) return

    const newBookmark: Bookmark = {
      id: `bookmark-${Date.now()}`,
      name: newBookmarkName,
      description: '',
      pageId: currentPage.id,
      visualStates: {}, // Would capture current visual states
      filters: [], // Would capture current filters
      selectedVisuals: selectedVisual ? [selectedVisual.id] : [],
      timestamp: new Date().toISOString(),
      isVisible: true
    }

    setBookmarks(prev => [...prev, newBookmark])
    setNewBookmarkName('')
    setShowCreateModal(false)
  }

  const deleteBookmark = (bookmarkId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId))
  }

  const updateBookmark = (bookmarkId: string, updates: Partial<Bookmark>) => {
    setBookmarks(prev => prev.map(bookmark => 
      bookmark.id === bookmarkId ? { ...bookmark, ...updates } : bookmark
    ))
  }

  const playSlideshow = () => {
    if (bookmarks.length === 0) return
    
    setIsPlaying(true)
    setCurrentBookmarkIndex(0)
    
    const interval = setInterval(() => {
      setCurrentBookmarkIndex(prev => {
        const next = (prev + 1) % bookmarks.length
        if (next === 0) {
          setIsPlaying(false)
          clearInterval(interval)
          return prev
        }
        onRestoreBookmark(bookmarks[next])
        return next
      })
    }, 3000) // 3 seconds per bookmark
  }

  const stopSlideshow = () => {
    setIsPlaying(false)
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <BookmarkIcon className="h-5 w-5 text-gray-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-700">Bookmarks</h3>
          </div>
          <div className="flex items-center space-x-1">
            {bookmarks.length > 0 && (
              <button
                onClick={isPlaying ? stopSlideshow : playSlideshow}
                className="p-1 text-gray-400 hover:text-gray-600"
                title={isPlaying ? "Stop slideshow" : "Start slideshow"}
              >
                {isPlaying ? (
                  <PauseIcon className="h-4 w-4" />
                ) : (
                  <PlayIcon className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Add bookmark"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Slideshow Progress */}
        {isPlaying && bookmarks.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Slideshow playing</span>
              <span>{currentBookmarkIndex + 1} of {bookmarks.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div
                className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                style={{ width: `${((currentBookmarkIndex + 1) / bookmarks.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-auto">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500 px-6">
            <BookmarkIcon className="h-16 w-16 text-gray-300 mb-4" />
            <h4 className="text-sm font-medium mb-2">No bookmarks yet</h4>
            <p className="text-xs text-center mb-4">
              Create bookmarks to save and restore specific states of your report
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-2 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              Create bookmark
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {bookmarks.map((bookmark, index) => (
              <BookmarkItem
                key={bookmark.id}
                bookmark={bookmark}
                isActive={isPlaying && currentBookmarkIndex === index}
                onRestore={() => onRestoreBookmark(bookmark)}
                onUpdate={(updates) => updateBookmark(bookmark.id, updates)}
                onDelete={() => deleteBookmark(bookmark.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Bookmark Modal */}
      {showCreateModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCreateModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Bookmark</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={newBookmarkName}
                      onChange={(e) => setNewBookmarkName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter bookmark name..."
                      onKeyPress={(e) => e.key === 'Enter' && createBookmark()}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    This bookmark will capture the current state of all visuals and filters on this page.
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createBookmark}
                    disabled={!newBookmarkName.trim()}
                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Individual Bookmark Item Component
const BookmarkItem: React.FC<{
  bookmark: Bookmark
  isActive: boolean
  onRestore: () => void
  onUpdate: (updates: Partial<Bookmark>) => void
  onDelete: () => void
}> = ({ bookmark, isActive, onRestore, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(bookmark.name)
  const [showMenu, setShowMenu] = useState(false)

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== bookmark.name) {
      onUpdate({ name: editName.trim() })
    }
    setIsEditing(false)
    setEditName(bookmark.name)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditName(bookmark.name)
  }

  return (
    <div 
      className={`relative border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors cursor-pointer ${
        isActive ? 'bg-blue-50 border-blue-300' : 'bg-white'
      }`}
      onClick={onRestore}
    >
      {/* Thumbnail placeholder */}
      <div className="w-full h-20 bg-gray-100 rounded mb-3 flex items-center justify-center">
        <BookmarkIcon className="h-8 w-8 text-gray-400" />
      </div>

      {/* Content */}
      <div className="space-y-2">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSaveEdit()
              if (e.key === 'Escape') handleCancelEdit()
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            autoFocus
          />
        ) : (
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 truncate pr-2">
              {bookmark.name}
            </h4>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(!showMenu)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <EllipsisVerticalIcon className="h-4 w-4" />
              </button>

              {/* Context Menu */}
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-6 z-20 min-w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsEditing(true)
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <PencilIcon className="h-4 w-4 mr-2" />
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdate({ isVisible: !bookmark.isVisible })
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      {bookmark.isVisible ? (
                        <>
                          <EyeSlashIcon className="h-4 w-4 mr-2" />
                          Hide
                        </>
                      ) : (
                        <>
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Show
                        </>
                      )}
                    </button>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                        setShowMenu(false)
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {bookmark.description && (
          <p className="text-xs text-gray-500 truncate">{bookmark.description}</p>
        )}

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{new Date(bookmark.timestamp).toLocaleDateString()}</span>
          {isActive && (
            <div className="flex items-center text-blue-600">
              <ArrowRightIcon className="h-3 w-3 mr-1" />
              <span>Active</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookmarksPanel