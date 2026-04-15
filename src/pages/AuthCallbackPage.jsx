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
        
        setStatus(`Setting up your ${pendingRole || 'resident'} account...`);

        // Check if user already has a role assigned
        const { data: existingRole, error: roleCheckError } = await supabase
          .from('user_roles')
          .select('role:roles(name)')
          .eq('user_id', session.user.id)
          .single();

        let userRole = existingRole?.role?.name;

        // If no role assigned yet, create one based on selected role
        if (!userRole && pendingRole) {
          // Get the role ID from the roles table
          const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', pendingRole)
            .single();

          if (roleError) {
            console.error('Error finding role:', roleError);
            setError(`Role '${pendingRole}' not found in database.`);
            return;
          }

          // Assign the role to the user
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ 
              user_id: session.user.id, 
              role_id: roleData.id 
            });

          if (insertError) {
            console.error('Error assigning role:', insertError);
            setError('Failed to assign role to your account.');
            return;
          }

          userRole = pendingRole;
        }

        // Clear the stored role
        sessionStorage.removeItem('pendingRole');

        // Redirect based on the role
        setStatus(`Redirecting to ${userRole} dashboard...`);
        
        // Small delay to show the status message
        setTimeout(() => {
          switch (userRole) {
            case 'resident':
              navigate('/resident/dashboard');
              break;
            case 'municipal_worker':
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