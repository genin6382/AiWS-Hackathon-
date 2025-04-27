import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpring, animated, config } from 'react-spring';
import './Register.css';

function Register({ login }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Animation for the form
  const formAnimation = useSpring({
    from: { opacity: 0, transform: 'translateY(50px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    config: config.gentle
  });

  // Animation for error message
  const errorAnimation = useSpring({
    opacity: error ? 1 : 0,
    transform: error ? 'translateY(0)' : 'translateY(-20px)',
    config: config.wobbly
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Form validation
    if (!username || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Auto-login the user after successful registration
      const loginResponse = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error('Registration successful but login failed');
      }

      // Call the login function from props with user data
      login({
        id: loginData.user_id,
        username: loginData.username
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Button animation for hover state
  const [buttonProps, setButtonProps] = useSpring(() => ({
    scale: 1,
    config: { tension: 300, friction: 10 }
  }));

  return (
    <animated.div style={formAnimation} className="register-container">
      <div className="register-form-wrapper">
        <h1>Create an Account</h1>
        <p>Join our community today</p>
        
        <animated.div style={errorAnimation} className="error-message">
          {error}
        </animated.div>
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              disabled={isLoading}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
          </div>
          
          <animated.button
            type="submit"
            disabled={isLoading}
            style={{
              transform: buttonProps.scale.to(s => `scale(${s})`)
            }}
            onMouseEnter={() => setButtonProps({ scale: 1.05 })}
            onMouseLeave={() => setButtonProps({ scale: 1 })}
            className="register-button"
          >
            {isLoading ? 'Registering...' : 'Register'}
          </animated.button>
        </form>
        
        <p className="login-link">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </animated.div>
  );
}

export default Register;