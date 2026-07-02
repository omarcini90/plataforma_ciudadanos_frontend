import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import MainLayout from '../layouts/MainLayout.jsx';
import LoginPage from '../pages/Login.jsx';
import ForgotPasswordPage from '../pages/ForgotPassword.jsx';
import ResetPasswordPage from '../pages/ResetPassword.jsx';
import DashboardPage from '../pages/Dashboard.jsx';
import CitizensListPage from '../pages/citizens/CitizensList.jsx';
import CitizenFormPage from '../pages/citizens/CitizenForm.jsx';
import CitizenDetailPage from '../pages/citizens/CitizenDetail.jsx';
import UsersPage from '../pages/Users.jsx';
import CatalogsPage from '../pages/Catalogs.jsx';
import ServicesPage from '../pages/Services.jsx';
import SupportsPage from '../pages/Supports.jsx';
import MapPage from '../pages/MapView.jsx';
import SurveysPage from '../pages/Surveys.jsx';
import LogsPage from '../pages/Logs.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route
          path="citizens"
          element={
            <ProtectedRoute permissions={['citizens.read']}>
              <CitizensListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="citizens/new"
          element={
            <ProtectedRoute permissions={['citizens.write']}>
              <CitizenFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="citizens/:id/edit"
          element={
            <ProtectedRoute permissions={['citizens.write']}>
              <CitizenFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="citizens/:id"
          element={
            <ProtectedRoute permissions={['citizens.read']}>
              <CitizenDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="services"
          element={
            <ProtectedRoute permissions={['services.read']}>
              <ServicesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="supports"
          element={
            <ProtectedRoute permissions={['supports.read']}>
              <SupportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="catalogs"
          element={
            <ProtectedRoute permissions={['catalogs.read']}>
              <CatalogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="map"
          element={
            <ProtectedRoute permissions={['map.view']}>
              <MapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="surveys"
          element={
            <ProtectedRoute permissions={['surveys.read']}>
              <SurveysPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute permissions={['users.read']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="logs"
          element={
            <ProtectedRoute permissions={['logs.read']}>
              <LogsPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
