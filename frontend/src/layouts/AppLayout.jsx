import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import FirstRunGuide from '../components/FirstRunGuide'

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Navbar />
      <Outlet />
      <FirstRunGuide />
    </div>
  )
}