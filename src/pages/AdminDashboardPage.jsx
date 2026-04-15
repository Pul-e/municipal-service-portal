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
        // Get the session after Google redirect
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (!session) {
          setError('No session found. Please try signing in again.');
          return;
        }

        // Get the role that was selected before Google redirect
        const pendingRole = sessionStorage.getItem('pendingRole');
        
        setStatus(`Setting up your ${pendingRole || 'user'} account...`);

        // Check the profiles table for existing role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        let userRole = profile?.role;

        // If no role assigned yet, update the profile with selected role
        if (!userRole && pendingRole) {
          // Map frontend role names to database role values
          let dbRole = 'user'; // default
          if (pendingRole === 'resident' || pendingRole === 'user') dbRole = 'user';
          if (pendingRole === 'worker') dbRole = 'staff';
          if (pendingRole === 'admin') dbRole = 'admin';

          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: dbRole })
            .eq('id', session.user.id);

          if (updateError) {
            console.error('Error updating role:', updateError);
            setError('Failed to assign role to your account.');
            return;
          }

          userRole = dbRole;
        }

        // Clear the stored role
        sessionStorage.removeItem('pendingRole');

        setStatus(`Redirecting to ${userRole} dashboard...`);
        
        // Redirect based on the role
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
              navigate('/');
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