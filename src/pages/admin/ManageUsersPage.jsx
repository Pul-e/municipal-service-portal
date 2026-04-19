import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let isMounted = true;
    
    const loadUsers = async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (isMounted) {
        fetchUsers();
      }
    };
    
    loadUsers();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData?.session) {
        setError('Please sign in as admin to view this page.');
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Fetch users error:', err);
      if (!err.message?.includes('lock') && !err.message?.includes('steal')) {
        setError('Failed to load users: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setError('');
    setSuccessMessage('');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setSuccessMessage(`User role updated to ${newRole}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to update role: ' + err.message);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    if (filter === 'resident') return user.role === 'user';
    if (filter === 'workers') return user.role === 'staff';
    return true;
  });

  const getRoleBadge = (role) => {
    const badges = {
      resident: { label: '🏠 Resident', class: 'role-resident' },
      worker: { label: '🔧 Worker', class: 'role-worker' },
      admin: { label: '📊 Admin', class: 'role-admin' }
    };
    return badges[role] || { label: role, class: '' };
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1>Manage Users</h1>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <article className="page-container">
      <header className="page-header">
        <h1>Manage Users</h1>
        <p className="page-subtitle">View and manage all registered users</p>
      </header>

      <section className="admin-stats" aria-label="User statistics">
        <div className="stat-card">
          <span className="stat-value">{users.length}</span>
          <span className="stat-label">Total Users</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{users.filter(u => u.role === 'resident').length}</span>
          <span className="stat-label">Residents</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{users.filter(u => u.role === 'worker').length}</span>
          <span className="stat-label">Workers</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{users.filter(u => u.role === 'admin').length}</span>
          <span className="stat-label">Admins</span>
        </div>
      </section>

      {error && (
        <div className="error-message" role="alert">{error}</div>
      )}
      {successMessage && (
        <div className="success-message" role="status">{successMessage}</div>
      )}

      <nav className="filter-tabs" aria-label="Filter users by role">
        <ul role="tablist">
          <li role="presentation">
            <button
              role="tab"
              aria-selected={filter === 'all'}
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Users ({users.length})
            </button>
          </li>
          <li role="presentation">
            <button
              role="tab"
              aria-selected={filter === 'residents'}
              className={`filter-tab ${filter === 'residents' ? 'active' : ''}`}
              onClick={() => setFilter('residents')}
            >
              Residents ({users.filter(u => u.role === 'resident').length})
            </button>
          </li>
          <li role="presentation">
            <button
              role="tab"
              aria-selected={filter === 'workers'}
              className={`filter-tab ${filter === 'workers' ? 'active' : ''}`}
              onClick={() => setFilter('workers')}
            >
              Workers ({users.filter(u => u.role === 'worker').length})
            </button>
          </li>
        </ul>
      </nav>

      <section className="users-table-section" aria-label="Users list">
        {filteredUsers.length === 0 ? (
          <p className="empty-state">No users found.</p>
        ) : (
          <div className="table-responsive">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Current Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const roleBadge = getRoleBadge(user.role);
                  return (
                    <tr key={user.id}>
                      <td>{user.email || '—'}</td>
                      <td>{user.full_name || '—'}</td>
                      <td>
                        <span className={`role-badge ${roleBadge.class}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        {user.role !== 'admin' && (
                          <select
                            className="role-select"
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            aria-label={`Change role for ${user.email}`}
                          >
                            <option value="user">🏠 Make Resident</option>
                            <option value="staff">🔧 Make Worker</option>
                          </select>
                        )}
                        {user.role === 'admin' && (
                          <span className="admin-protected">Protected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="refresh-section">
        <button className="secondary-btn" onClick={fetchUsers}>
          🔄 Refresh Users
        </button>
      </div>
    </article>
  );
}

export default ManageUsersPage;