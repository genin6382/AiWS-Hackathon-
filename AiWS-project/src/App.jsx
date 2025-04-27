import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSpring, animated } from 'react-spring';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import './App.css';
import ProfilePage from './components/ProfilePage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // Check if user is already logged in (using localStorage)
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setIsAuthenticated(true);
    }
  }, []);

  // Main app fade-in animation
  const fadeIn = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: { duration: 1000 }
  });

  // Login function to be passed to child components
  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  // Logout function
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('userData');
  };

  return (
    <animated.div style={fadeIn} className="app-container">
      <Router>
        <Routes>

          <Route 
            path="/" 
            element={isAuthenticated ? <Home user={user} logout={logout} /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/login" 
            element={!isAuthenticated ? <Login login={login} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/register" 
            element={!isAuthenticated ? <Register login={login} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/profile" 
            element={<ProfilePage user={user}></ProfilePage>}
          />
        </Routes>
      </Router>
    </animated.div>
  );
}

export default App;