import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Processing your sign in...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (!session) {
          setError('No session found. Please try signing in again.');
          return;
        }
        
        setStatus('Checking your account...');

        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        let userRole = profile?.role;

        if (profileError && profileError.code === 'PGRST116') {
          setStatus('Creating your account...');
          
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email,
              full_name: session.user.user_metadata?.full_name || session.user.email,
              role: 'user'
            });

          if (insertError) {
            console.error('Error creating profile:', insertError);
            setError('Failed to create your account profile.');
            return;
          }

          userRole = 'user';
        } else if (profileError) {
          console.error('Error fetching profile:', profileError);
          setError('Failed to load your account information.');
          return;
        } else {
          userRole = profile?.role || 'user';
        }

        setStatus(`Redirecting to ${userRole} dashboard...`);
        
        setTimeout(() => {
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
              navigate('/resident/dashboard');
          }
        }, 500);

      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <article className="auth-callback-page">
        <header>
          <span className="auth-icon" role="img" aria-label="Error">❌</span>
          <h1>Sign In Failed</h1>
        </header>
        <p className="auth-message" role="alert">{error}</p>
        <footer>
          <button 
            onClick={() => navigate('/signin')}
            className="auth-action-btn"
          >
            Back to Sign In
          </button>
        </footer>
      </article>
    );
  }

  return (
    <article className="auth-callback-page">
      <header>
        <span className="auth-icon" role="img" aria-label="Loading">🔄</span>
        <h1>{status}</h1>
      </header>
      <p className="auth-message" role="status" aria-live="polite">
        Please wait while we complete your sign in...
      </p>
    </article>
  );
}

export default AuthCallbackPage;