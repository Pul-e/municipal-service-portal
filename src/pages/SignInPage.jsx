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
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw signInError;
      
      // Get the user's role from the profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      
      if (profileError) {
        console.error('Profile error:', profileError);
        // If no profile exists, create one with default role 'user'
        if (profileError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.email,
              role: 'user'
            });
          
          if (!insertError) {
            navigate('/resident/dashboard');
            return;
          }
        }
        throw new Error('Could not determine user role');
      }
      
      // Redirect based on role from database
      switch (profile.role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'staff':
          navigate('/worker/dashboard');
          break;
        case 'user':
        default:
          navigate('/resident/dashboard');
          break;
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
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <article className="page-container signin-page">
      <header>
        <h1>Sign In</h1>
        <p className="page-subtitle">Access your Municipal Connect account to report issues</p>
      </header>

      <div className="signin-container">
        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* Email/Password Form */}
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
          </div>

          <div className="forgot-password">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        {/* Google Sign In */}
        <button 
          className="google-btn"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <span className="google-icon">G</span>
          Continue with Google
        </button>

        <div className="signin-footer">
          <p>Don't have an account? <Link to="/register">Register here</Link></p>
          <p><Link to="/">← Back to public dashboard</Link></p>
        </div>

        <div className="staff-note">
          <p>🔧 Are you a municipal worker or administrator?</p>
          <p>Please use the staff portal or contact your system administrator for access.</p>
        </div>
      </div>
    </article>
  );
}

export default SignInPage;