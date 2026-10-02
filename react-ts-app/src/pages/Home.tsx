import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Home.css';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-container">
      <div className="hero">
        <h1>Welcome to Auth Demo</h1>
        <p>A complete authentication integration between React and NestJS</p>

        <div className="hero-buttons">
          {isAuthenticated ? (
            <button className="hero-button primary" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
          ) : (
            <>
              <button className="hero-button primary" onClick={() => navigate('/login')}>
                Login
              </button>
              <button className="hero-button secondary" onClick={() => navigate('/register')}>
                Register
              </button>
            </>
          )}
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <h3>🔐 Secure Authentication</h3>
          <p>JWT-based authentication with secure token storage</p>
        </div>
        <div className="feature-card">
          <h3>🔄 Auto Token Refresh</h3>
          <p>Automatic token refresh before expiry</p>
        </div>
        <div className="feature-card">
          <h3>💾 Persistent Sessions</h3>
          <p>Sessions persist across page reloads</p>
        </div>
        <div className="feature-card">
          <h3>🛡️ Protected Routes</h3>
          <p>Automatic route protection and redirects</p>
        </div>
      </div>
    </div>
  );
};
