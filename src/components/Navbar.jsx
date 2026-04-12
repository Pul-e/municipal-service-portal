import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const isPublic = location.pathname === '/' || location.pathname === '/signin';
  const userRole = location.pathname.split('/')[1]; // resident, worker, or admin

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link to="/">
          <h1>🏛️ Municipal Connect</h1>
        </Link>
      </div>
      
      {isPublic ? (
        <nav className="nav-links">
          <Link to="/signin" className="signin-link">Sign In</Link>
        </nav>
      ) : (
        <nav className="nav-links">
          <span className="user-role-badge">
            {userRole === 'resident' && '🏠 Resident'}
            {userRole === 'worker' && '🔧 Worker'}
            {userRole === 'admin' && '📊 Admin'}
          </span>
          <Link to="/">Sign Out</Link>
        </nav>
      )}
    </header>
  );
}

export default Navbar;