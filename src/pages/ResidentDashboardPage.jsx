import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function ResidentDashboardPage() {
  const [userName, setUserName] = useState('Resident');
  const [userWard, setUserWard] = useState('Unknown');
  const [stats, setStats] = useState({ open: 0, resolved: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get profile name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (profile?.full_name) {
        setUserName(profile.full_name);
      } else if (user.email) {
        setUserName(user.email.split('@')[0]);
      }

      // Get user's requests
      const { data: requests } = await supabase
        .from('service_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (requests) {
        const open = requests.filter(r => r.status !== 'Resolved').length;
        const resolved = requests.filter(r => r.status === 'Resolved').length;
        setStats({ open, resolved });
        setRecentRequests(requests.slice(0, 2));
        
        const lastWithWard = requests.find(r => r.ward);
        if (lastWithWard?.ward) {
          setUserWard(lastWithWard.ward);
        }
      }

      setLoading(false);
    }
    loadDashboard();
  }, []);

  const getCategoryIcon = (category) => {
    const icons = {
      pothole: '🕳️',
      'burst-pipe': '💧',
      'power-outage': '⚡',
      'illegal-dumping': '🗑️',
      'street-light': '💡',
    };
    return icons[category] || '📋';
  };

  if (loading) {
    return (
      <article className="page-container">
        <p>Loading dashboard...</p>
      </article>
    );
  }

  return (
    <article className="page-container">
      <header>
        <h1>Resident Dashboard</h1>
        <p>Welcome back, {userName} • Ward {userWard}</p>
      </header>

      <div className="dashboard-actions">
        <Link to="/resident/report" className="primary-action">
          📝 Report New Issue
        </Link>
        <Link to="/resident/my-requests" className="secondary-action">
          📋 View My Requests
        </Link>
      </div>

      <section className="quick-stats">
        <h2>Your Activity</h2>
        <div className="stats-row">
          <div className="stat-card">{stats.open} Open Requests</div>
          <div className="stat-card">{stats.resolved} Resolved</div>
          <div className="stat-card">Ward {userWard}</div>
        </div>
      </section>

      <section className="recent-requests">
        <h2>Your Recent Requests</h2>
        {recentRequests.length > 0 ? (
          recentRequests.map(req => (
            <p key={req.id}>
              {getCategoryIcon(req.category)} {req.description?.slice(0, 30) || req.category} - {req.status}
            </p>
          ))
        ) : (
          <p>No requests yet. Report an issue to get started!</p>
        )}
      </section>
    </article>
  );
}

export default ResidentDashboardPage;