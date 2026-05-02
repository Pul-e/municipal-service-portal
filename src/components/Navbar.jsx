import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const pathSeg = location.pathname.split('/')[1];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) fetchProfile(user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', userId)
      .single();
    setUserProfile(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserProfile(null);
    navigate('/');
  };

  const role = userProfile?.role || pathSeg;
  const isActive = (path) => location.pathname.startsWith(path);

  const roleLabelMap = {
    resident: 'Resident',
    worker: 'Worker',
    admin: 'Admin',
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link to="/">
          {/* Civic building icon */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <rect x="1" y="13" width="20" height="8" rx="1.5" fill="#52b788"/>
            <rect x="4" y="8" width="14" height="5" fill="#52b788" opacity="0.75"/>
            <rect x="9" y="2" width="4" height="6" fill="#52b788" opacity="0.55"/>
            <rect x="5" y="15" width="3" height="6" fill="#0d2818" opacity="0.3"/>
            <rect x="14" y="15" width="3" height="6" fill="#0d2818" opacity="0.3"/>
          </svg>
          <h1>Municipal Connect</h1>
        </Link>
      </div>

      <nav className="nav-links">
        {user ? (
          <>
            {/* Resident Links */}
            {role === 'resident' && (
              <ul>
                <li>
                  <Link to="/resident/dashboard" className={isActive('/resident/dashboard') ? 'active' : ''}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/resident/report" className={isActive('/resident/report') ? 'active' : ''}>
                    Report Issue
                  </Link>
                </li>
                <li>
                  <Link to="/resident/my-requests" className={isActive('/resident/my-requests') ? 'active' : ''}>
                    My Requests
                  </Link>
                </li>
              </ul>
            )}

            {/* Worker Links */}
            {role === 'worker' && (
              <ul>
                <li>
                  <Link to="/worker/dashboard" className={isActive('/worker/dashboard') ? 'active' : ''}>
                    Dashboard
                  </Link>
                </li>
              </ul>
            )}

            {/* Admin Links */}
            {role === 'admin' && (
              <ul>
                <li>
                  <Link to="/admin/dashboard" className={isActive('/admin/dashboard') ? 'active' : ''}>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/admin/users" className={isActive('/admin/users') ? 'active' : ''}>
                    Users
                  </Link>
                </li>
                <li>
                  <Link to="/admin/analytics" className={isActive('/admin/analytics') ? 'active' : ''}>
                    Analytics
                  </Link>
                </li>
              </ul>
            )}

            {/* Role badge */}
            <span className="user-role-badge">
              {roleLabelMap[role] || user?.email?.split('@')[0] || 'User'}
            </span>

            <button className="auth-btn" onClick={handleSignOut}>
              Sign Out
            </button>
          </>
        ) : (
          <Link to="/signin" className="signin-link">
            Sign In
          </Link>
        )}
      </nav>
    </header>
  );
}

export default Navbar;