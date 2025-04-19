import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import HomePage from './pages/HomePage';
import ResumeUploadPage from './pages/ResumeUploadPage';
import LoginPage from './pages/AuthPages/LoginPage';

import { auth } from './firebase';

// ✅ Add these component imports (make sure the files exist)
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#3f51b5' },
    secondary: { main: '#f50057' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
});

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <Navbar currentUser={currentUser} />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/upload-resume"
            element={
              <ProtectedRoute currentUser={currentUser}>
                <ResumeUploadPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Footer />
      </Router>
    </ThemeProvider>
  );
}

export default App;
