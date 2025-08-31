/**
 * PowerBI Web Replica - Main App Component
 * Root component that handles routing and global app state
 */

import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// Pages
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import WorkspacePage from '@/pages/WorkspacePage'
import WorkspacesListPage from '@/pages/WorkspacesListPage'
import ReportsListPage from '@/pages/ReportsListPage'
import DatasetsListPage from '@/pages/DatasetsListPage'
import ReportDesignerPage from '@/pages/ReportDesignerPage'
import ReportViewerPage from '@/pages/ReportViewerPage'
import SettingsPage from '@/pages/SettingsPage'

// Components
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import Layout from '@/components/layout/Layout'

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          user ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } 
      />
      <Route 
        path="/register" 
        element={
          user ? <Navigate to="/dashboard" replace /> : <RegisterPage />
        } 
      />

      {/* Protected routes */}
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/workspaces" element={<WorkspacesListPage />} />
                <Route path="/reports" element={<ReportsListPage />} />
                <Route path="/datasets" element={<DatasetsListPage />} />
                <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
                <Route 
                  path="/reports/demo" 
                  element={<ReportDesignerPage />} 
                />
                <Route 
                  path="/workspace/:workspaceId/report/:reportId/design" 
                  element={<ReportDesignerPage />} 
                />
                <Route 
                  path="/workspace/:workspaceId/report/:reportId/view" 
                  element={<ReportViewerPage />} 
                />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default App