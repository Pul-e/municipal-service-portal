import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <header style={{ 
      background: '#1a4d2e', 
      padding: '1rem 2rem', 
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <h1 style={{ margin: 0 }}>🏛️ Municipal Connect</h1>
      <nav>
        <Link to="/dashboard" style={{ color: 'white', marginRight: '1.5rem', textDecoration: 'none' }}>Dashboard</Link>
        <Link to="/report" style={{ color: 'white', marginRight: '1.5rem', textDecoration: 'none' }}>Report</Link>
        <Link to="/my-requests" style={{ color: 'white', marginRight: '1.5rem', textDecoration: 'none' }}>My Requests</Link>
        <Link to="/worker" style={{ color: 'white', textDecoration: 'none' }}>Worker View</Link>
      </nav>
      <button style={{ 
        background: '#ffd700', 
        color: '#1a4d2e', 
        border: 'none', 
        padding: '0.5rem 1rem', 
        borderRadius: '4px',
        fontWeight: 'bold',
        cursor: 'pointer'
      }}>
        Sign In
      </button>
    </header>
  );
}

export default Navbar;