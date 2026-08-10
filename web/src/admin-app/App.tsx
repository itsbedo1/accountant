import './app.css'
import { useAdminAuth } from './state/useAdminAuth'
import LoginView from './components/LoginView'
import DashboardView from './components/DashboardView'
import AdminToastBox from './components/AdminToastBox'

export default function App() {
  const { status, doLogin, doLogout } = useAdminAuth()
  const logout = () => void doLogout()

  return (
    <>
      {(status === 'loggedOut' || status === 'checking' || status === 'notOwner') && (
        <LoginView doLogin={doLogin} notOwnerError={status === 'notOwner'} />
      )}
      {status === 'ready' && <DashboardView doLogout={logout} />}
      <AdminToastBox />
    </>
  )
}
