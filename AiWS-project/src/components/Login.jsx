import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSpring, animated, config } from 'react-spring';
import './Login.css';

function Login({ login }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Call the login function from props with user data
      login({
        id: data.user_id,
        username: data.username
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
    <animated.div style={formAnimation} className="login-container">
      <div className="login-form-wrapper">
        <h1>Welcome Back</h1>
        <p>Log in to your account to continue</p>
        
        <animated.div style={errorAnimation} className="error-message">
          {error}
        </animated.div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
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
              placeholder="Enter your password"
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
            className="login-button"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </animated.button>
        </form>
        
        <p className="register-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </animated.div>
  );
}

export default Login;