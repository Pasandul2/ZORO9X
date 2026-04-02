import { Navigate, Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar';
import StorePage from './pages/StorePage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPanelPage from './pages/AdminPanelPage';

function App() {
  return (
    <div className="layout">
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<StorePage />} />
          <Route path="/dashboard" element={<CustomerDashboardPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminPanelPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
