import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ShaderPage from './pages/ShaderPage';
import ShaderFormPage from './pages/ShaderFormPage';
import ShaderPlaygroundPage from './pages/ShaderPlaygroundPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import VerifyEmailPage from './pages/VerifyEmailPage';
import UserPage from './pages/UserPage';
import AdminPage from './pages/admin/AdminPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/playground" element={<ShaderPlaygroundPage />} />
            <Route path="/shader/:id" element={<ShaderPage />} />
            <Route path="/shader/:id/edit" element={<ShaderFormPage mode="edit" />} />
            <Route path="/new" element={<ShaderFormPage mode="new" />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/user/:id" element={<UserPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={
              <div className="text-center py-32 text-black">
                <div className="text-5xl mb-4">404</div>
                <div className="font-display text-2xl text-gray-500">Not Found</div>
              </div>
            } />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
