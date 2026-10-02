import React, { useState } from 'react';
import { useAuthForm } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './AuthForm.css';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { handleLogin, formError, apiError, loading } = useAuthForm();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleLogin(email, password);
    if (success) {
      setTimeout(() => navigate('/dashboard'), 500);
    }
  };

  const displayError = formError || apiError?.message;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                disabled={loading}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {displayError && <div className="error-message">{displayError}</div>}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{' '}
          <a href="/register" onClick={() => navigate('/register')}>
            Register
          </a>
        </p>
      </div>
    </div>
  );
};
