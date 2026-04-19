import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PublicDashboardPage from './pages/PublicDashboardPage';
import SignInPage from './pages/SignInPage';
import ResidentDashboardPage from './pages/ResidentDashboardPage';
import ReportIssuePage from './pages/ReportIssuePage';
import MyRequestsPage from './pages/MyRequestsPage';
import WorkerDashboardPage from './pages/WorkerDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import ManageUsersPage from './pages/admin/ManageUsersPage';

function App() {
  return (
    <div className="app">
      <Navbar />
      
      <main className="main-content">
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {/* Public Routes */}
          <Route path="/" element={<PublicDashboardPage />} />
          <Route path="/signin" element={<SignInPage />} />
          
          {/* Resident Routes (Protected - Sprint 2) */}
          <Route path="/resident/dashboard" element={<ResidentDashboardPage />} />
          <Route path="/resident/report" element={<ReportIssuePage />} />
          <Route path="/resident/my-requests" element={<MyRequestsPage />} />
          
          {/* Worker Routes (Protected - Sprint 2) */}
          <Route path="/worker/dashboard" element={<WorkerDashboardPage />} />
          
          {/* Admin Routes (Protected - Sprint 2) */}
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<ManageUsersPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;