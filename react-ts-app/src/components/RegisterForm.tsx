import React, { useState } from 'react';
import { useAuthForm } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import './AuthForm.css';

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { handleRegister, formError, apiError, loading } = useAuthForm();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleRegister(email, password, confirmPassword);
    if (success) {
      setTimeout(() => navigate('/login'), 1000);
    }
  };

  const displayError = formError || apiError?.message;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
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
                placeholder="At least 8 characters"
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

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={loading}
              required
            />
          </div>

          {displayError && <div className="error-message">{displayError}</div>}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <a href="/login" onClick={() => navigate('/login')}>
            Login
          </a>
        </p>
      </div>
    </div>
  );
};
