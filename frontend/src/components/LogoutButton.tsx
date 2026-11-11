import { useAuth } from '../auth/AuthContext';

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={logout}>
      Log out
    </button>
  );
}

export default LogoutButton;
