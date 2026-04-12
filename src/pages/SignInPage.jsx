import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function SignInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultRole = searchParams.get('role') || 'resident';

  const [role, setRole] = useState(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // Navigate to the right dashboard based on selected role
    switch (role) {
      case 'resident':
        navigate('/resident/dashboard');
        break;
      case 'worker':
        navigate('/worker/dashboard');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <article className="page-container signin-page">
      <header>
        <h1>Sign In</h1>
        <p className="page-subtitle">Access your Municipal Connect account</p>
      </header>

      <div className="signin-container">
        {/* Role Selector */}
        <div className="role-selector">
          <button
            className={`role-option ${role === 'resident' ? 'active' : ''}`}
            onClick={() => setRole('resident')}
          >
            🏠 Resident
          </button>
          <button
            className={`role-option ${role === 'worker' ? 'active' : ''}`}
            onClick={() => setRole('worker')}
          >
            🔧 Worker
          </button>
          <button
            className={`role-option ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
          >
            📊 Admin
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleSubmit} className="signin-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>
        </form>

        <div className="signin-footer">
          <p>Don't have an account? <Link to="/register">Register here</Link></p>
          <p><Link to="/">← Back to public dashboard</Link></p>
        </div>
      </div>
    </article>
  );
}

export default SignInPage;
