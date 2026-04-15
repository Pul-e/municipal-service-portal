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

        setStatus('Setting up your account...');

        // Check role from profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const userRole = profileData?.role || 'user';

        setStatus(`Redirecting to your dashboard...`);

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
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: '#dc2626', fontSize: '24px', marginBottom: '16px' }}>❌</div>
        <h2 style={{ color: '#991b1b' }}>Sign In Failed</h2>
        <p style={{ color: '#666' }}>{error}</p>
        <button
          onClick={() => navigate('/signin')}
          style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
        >
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔄</div>
      <h2>{status}</h2>
      <p style={{ color: '#666' }}>Please wait while we complete your sign in...</p>
    </div>
  );
}

export default AuthCallbackPage;