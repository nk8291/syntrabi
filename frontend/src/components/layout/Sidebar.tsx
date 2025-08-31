/**
 * Sidebar Component
 * Navigation sidebar with workspace and feature links
 */

import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  HomeIcon,
  FolderIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
  Cog6ToothIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { clsx } from 'clsx'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Workspaces',
    href: '/workspaces',
    icon: FolderIcon,
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: DocumentChartBarIcon,
  },
  {
    name: 'Datasets',
    href: '/datasets',
    icon: TableCellsIcon,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Cog6ToothIcon,
  },
]

const Sidebar: React.FC = () => {
  const location = useLocation()

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
      <div className="p-4">
        {/* Create New Button */}
        <button className="btn btn-primary w-full flex items-center justify-center space-x-2 mb-6">
          <PlusIcon className="h-4 w-4" />
          <span>Create New</span>
        </button>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
                           (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-700'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                <item.icon
                  className={clsx(
                    'mr-3 h-5 w-5',
                    isActive
                      ? 'text-primary-500'
                      : 'text-gray-400 group-hover:text-gray-500'
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Recent Workspaces
          </h3>
          <div className="space-y-1">
            <div className="px-3 py-2 text-sm text-gray-500">
              No workspaces yet
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar