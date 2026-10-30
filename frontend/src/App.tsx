import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { UserDashboard } from './pages/UserDashboard';
import { SmartParkingMap } from './pages/SmartParkingMap';
import { FacilityDetailsPage } from './pages/FacilityDetailsPage';
import { AdvanceBookingPage } from './pages/AdvanceBookingPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { GpsTrackerPage } from './pages/GpsTrackerPage';
import { RoutePlannerPage } from './pages/RoutePlannerPage';
import { TransitCrowdPage } from './pages/TransitCrowdPage';
import { LostFoundPage } from './pages/LostFoundPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminParkingPage } from './pages/AdminParkingPage';
import { AdminLostFoundPage } from './pages/AdminLostFoundPage';
import { AdminBookingsPage } from './pages/AdminBookingsPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { ParkingAIDetectionPage } from './pages/ParkingAIDetectionPage';
import { WalletPage } from './pages/WalletPage';
import { BusBookingPage } from './pages/BusBookingPage';
import { NearbyServicesPage } from './pages/NearbyServicesPage';
import { EmergencyHelpPage } from './pages/EmergencyHelpPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs text-slate-400">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Main Layout Wrapper
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-brand-500 selection:text-white">
      <Navbar onToggleSidebar={() => setSidebarOpen(true)} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto min-w-0">
        {/* Sidebar shown on dashboard/feature pages, hidden on simple auth pages */}
        {!isAuthPage && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        <main className={`flex-1 px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden ${isLandingPage ? 'p-0 sm:p-0' : ''}`}>
          {children}
        </main>
      </div>

      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            {/* 1. Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/parking" element={<SmartParkingMap />} />
            <Route path="/parking/:id" element={<FacilityDetailsPage />} />
            <Route path="/tracker" element={<GpsTrackerPage />} />
            <Route path="/routes" element={<RoutePlannerPage />} />
            <Route path="/transport" element={<TransitCrowdPage />} />
            <Route path="/lost-found" element={<LostFoundPage />} />
            <Route path="/bus-booking" element={<BusBookingPage />} />
            <Route path="/nearby" element={<NearbyServicesPage />} />
            <Route path="/emergency" element={<EmergencyHelpPage />} />

            {/* 2. Authenticated Citizen / Operator Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking/:facilityId"
              element={
                <ProtectedRoute>
                  <AdvanceBookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <MyBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <ProtectedRoute>
                  <PaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <WalletPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <UserProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner"
              element={
                <ProtectedRoute>
                  <OwnerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-detection"
              element={
                <ProtectedRoute>
                  <ParkingAIDetectionPage />
                </ProtectedRoute>
              }
            />

            {/* 3. Protected Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/parking"
              element={
                <ProtectedRoute adminOnly>
                  <AdminParkingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/lost-found"
              element={
                <ProtectedRoute adminOnly>
                  <AdminLostFoundPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/bookings"
              element={
                <ProtectedRoute adminOnly>
                  <AdminBookingsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </Router>
    </AuthProvider>
  );
};

export default App;
