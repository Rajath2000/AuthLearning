import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h1>Welcome, {user.email}!</h1>
          <button
            className="logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut || loading}
          >
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>

        <div className="dashboard-content">
          <section className="user-info">
            <h2>User Information</h2>
            <div className="info-item">
              <label>User ID:</label>
              <span>{user.userId}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{user.email}</span>
            </div>
            {user.createdAt && (
              <div className="info-item">
                <label>Account Created:</label>
                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </section>

          <section className="security-info">
            <h2>Security</h2>
            <p className="info-text">
              Your session is secure and automatically refreshed when needed. Tokens are
              stored securely in your browser's local storage.
            </p>
          </section>

          <section className="quick-actions">
            <h2>Quick Actions</h2>
            <button
              className="action-button"
              onClick={() => window.location.reload()}
              disabled={isLoggingOut}
            >
              Refresh Session
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
