import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import SubmitClaimPage from './pages/SubmitClaimPage';
import BountyDetailPage from './pages/BountyDetailPage';
import MyProfilePage from './pages/MyProfilePage';

const App = () => {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/submit" element={<SubmitClaimPage />} />
          <Route path="/bounty/:id" element={<BountyDetailPage />} />
          <Route path="/profile" element={<MyProfilePage />} />
          <Route path="*" element={
            <div className="flex-1 flex items-center justify-center text-center px-4 py-20">
              <div>
                <div className="text-6xl mb-4">🚫</div>
                <h2 className="text-2xl font-bold text-textPrimary mb-2">Page Not Found</h2>
                <p className="text-textSecondary mb-6">The page you're looking for doesn't exist.</p>
                <a href="/" className="btn-primary">Go Home</a>
              </div>
            </div>
          } />
        </Routes>
        <Footer />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1a0a38',
              color: '#f3f0ff',
              border: '1px solid #3d2466',
              borderRadius: '0.75rem',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#0f0520' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0f0520' },
            },
          }}
        />
      </div>
    </BrowserRouter>
  );
};

export default App;
