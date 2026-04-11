import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PublicDashboardPage from './pages/PublicDashboardPage';
import ReportIssuePage from './pages/ReportIssuePage';
import MyRequestsPage from './pages/MyRequestsPage';
import WorkerDashboardPage from './pages/WorkerDashboardPage';

function App() {
  return (
    <div className="app">
      <Navbar />
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<PublicDashboardPage />} />
          <Route path="/dashboard" element={<PublicDashboardPage />} />
          <Route path="/report" element={<ReportIssuePage />} />
          <Route path="/my-requests" element={<MyRequestsPage />} />
          <Route path="/worker" element={<WorkerDashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;