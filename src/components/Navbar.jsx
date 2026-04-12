import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const isPublic = location.pathname === '/' || location.pathname === '/signin';
  const userRole = location.pathname.split('/')[1]; // resident, worker, or admin

  useEffect(() => {
    // Check if a user is already logged in on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for login/logout events and update state automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Cleanup the listener when the component unmounts
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link to="/">
          <h1>🏛️ Municipal Connect</h1>
        </Link>
      </div>

      <nav className="nav-links">
        {user ? (
          // Logged-in state
          <>
            <span className="user-role-badge">
              {userRole === 'resident' && '🏠 Resident'}
              {userRole === 'worker' && '🔧 Worker'}
              {userRole === 'admin' && '📊 Admin'}
              {!['resident', 'worker', 'admin'].includes(userRole) && user.email}
            </span>
            <button className="auth-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          // Logged-out state
          <Link to="/signin" className="signin-link">
            Sign In
          </Link>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
