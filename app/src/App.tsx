import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Container, buttonClasses } from './components/ui';
import HomePage from './pages/HomePage';
import SubmitClaimPage from './pages/SubmitClaimPage';
import BountyDetailPage from './pages/BountyDetailPage';
import MyProfilePage from './pages/MyProfilePage';

const NotFound = () => (
  <Container className="py-24">
    <p className="eyebrow mb-3">404</p>
    <h1 className="font-serif text-3xl font-semibold text-ink">Page not found</h1>
    <p className="mt-3 text-ink-2">There is nothing at this address.</p>
    <Link to="/" className={buttonClasses('secondary', 'md', 'mt-6')}>
      Back to bounties
    </Link>
  </Container>
);

const App = () => (
  <BrowserRouter>
    <Navbar />
    <main className="flex-1">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/submit" element={<SubmitClaimPage />} />
        <Route path="/bounty/:id" element={<BountyDetailPage />} />
        <Route path="/profile" element={<MyProfilePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
    <Footer />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#FFFFFF',
          color: '#1A1A1A',
          border: '1px solid #E2DED5',
          borderRadius: '0.375rem',
          boxShadow: '0 8px 24px rgba(26, 26, 26, 0.08)',
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          fontSize: '0.875rem',
        },
        success: { iconTheme: { primary: '#2D6A3E', secondary: '#FFFFFF' } },
        error: { iconTheme: { primary: '#A1342A', secondary: '#FFFFFF' } },
      }}
    />
  </BrowserRouter>
);

export default App;
