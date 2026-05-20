import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Create from './pages/Create';
import MyVideos from './pages/MyVideos';
import TaskDetail from './pages/TaskDetail';
import Pricing from './pages/Pricing';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="create" element={<PrivateRoute><Create /></PrivateRoute>} />
          <Route path="my-videos" element={<PrivateRoute><MyVideos /></PrivateRoute>} />
          <Route path="task/:id" element={<PrivateRoute><TaskDetail /></PrivateRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
