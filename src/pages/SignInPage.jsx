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

  // Email/Password Sign In
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    // After login, check role and redirect
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role:roles(name)')
      .eq('user_id', data.user.id)
      .single();

    const userRole = roleData?.role?.name || 'user';

    // Redirect based on actual role from database
    switch (userRole) {
      case 'user':
        navigate('/resident/dashboard');
        break;
      case 'staff':
        navigate('/worker/dashboard');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      default:
        navigate('/');
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    // Store the selected role in sessionStorage (clears when tab closes)
    // This is more secure than localStorage for temporary data
    sessionStorage.setItem('pendingRole', role);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
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
            type="button"
            className={`role-option ${role === 'resident' ? 'active' : ''}`}
            onClick={() => setRole('resident')}
          >
            🏠 Resident
          </button>
          <button
            type="button"
            className={`role-option ${role === 'worker' ? 'active' : ''}`}
            onClick={() => setRole('worker')}
          >
            🔧 Worker
          </button>
          <button
            type="button"
            className={`role-option ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
          >
            📊 Admin
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-message" style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSignIn} className="signin-form">
          <div className="form-group">
            <label htmlFor="email">Username or email address</label>
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
            <Link to="/forgot-password" className="forgot-password">Forgot password?</Link>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div className="divider">
          <span>or</span>
        </div>

        {/* Google Sign In Button */}
        <button 
          onClick={handleGoogleSignIn} 
          className="google-signin-btn"
          disabled={loading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google logo" 
            width="20" 
            height="20"
          />
          Continue with Google
        </button>

        <div className="signin-footer">
          <p>Don't have an account? <Link to="/register">Register here</Link></p>
          <p><Link to="/">← Back to public dashboard</Link></p>
        </div>
      </div>
    </article>
  );
}

export default SignInPage;