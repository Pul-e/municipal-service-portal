import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function SignInPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          const { error: insertError } = await supabase.from('profiles').insert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.email,
            role: 'user',
          });
          if (!insertError) { navigate('/resident/dashboard'); return; }
        }
        throw new Error('Could not determine user role');
      }

      switch (profile.role) {
        case 'admin': navigate('/admin/dashboard'); break;
        case 'staff': navigate('/worker/dashboard'); break;
        default:      navigate('/resident/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="signin-page">
      <div className="signin-container">

        {/* Left branding panel */}
        <div className="signin-left-panel">
          <div className="signin-brand">
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="13" width="20" height="8" rx="1.5" fill="#52b788"/>
              <rect x="4" y="8" width="14" height="5" fill="#52b788" opacity="0.75"/>
              <rect x="9" y="2" width="4" height="6" fill="#52b788" opacity="0.55"/>
            </svg>
            Municipal Connect
          </div>

          <div>
            <div className="signin-left-stat">
              <span className="n">12</span>
              <span className="l">Issues resolved this week</span>
            </div>
            <p className="signin-left-tagline">
              Hold your municipality accountable. Track every service request from submission to resolution.
            </p>
          </div>

          <span className="signin-ward">Ward 58 · City of Johannesburg</span>
        </div>

        {/* Right form panel */}
        <div className="signin-form-panel">
          <h2>Welcome back</h2>
          <p className="signin-sub">Access your Municipal Connect account</p>

          {error && (
            <div className="error-message" role="alert">{error}</div>
          )}

          <form onSubmit={handleEmailSignIn} className="signin-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
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
                disabled={loading}
              />
              <div className="forgot-password">
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="divider"><span>or</span></div>

          <button className="google-btn" onClick={handleGoogleSignIn} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
            </svg>
            Continue with Google
          </button>

          <div className="signin-footer">
            <p>Don't have an account? <Link to="/register">Register here</Link></p>
            <p><Link to="/">← Back to public dashboard</Link></p>
          </div>

          <div className="staff-note">
            🔧 Municipal worker or administrator? Please use the staff portal or contact your system administrator for access.
          </div>
        </div>

      </div>
    </div>
  );
}

export default SignInPage;