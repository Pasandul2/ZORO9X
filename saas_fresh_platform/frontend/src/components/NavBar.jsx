import { Link, NavLink, useNavigate } from 'react-router-dom';

function NavBar() {
  const navigate = useNavigate();
  const isLoggedIn = Boolean(localStorage.getItem('admin_token'));

  function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    navigate('/admin/login');
  }

  return (
    <header className="top-nav">
      <Link to="/" className="brand">
        SaaS Fresh
      </Link>
      <nav>
        <NavLink to="/" className="nav-link">
          Store
        </NavLink>
        <NavLink to="/dashboard" className="nav-link">
          Customer Dashboard
        </NavLink>
        <NavLink to="/admin" className="nav-link">
          Admin
        </NavLink>
      </nav>
      {isLoggedIn && (
        <button type="button" className="btn btn-ghost" onClick={logout}>
          Logout
        </button>
      )}
    </header>
  );
}

export default NavBar;
