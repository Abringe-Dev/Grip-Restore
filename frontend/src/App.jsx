import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig } from 'motion/react'
import PageTransition from './components/PageTransition'
import RequireAuth from './components/RequireAuth'
import AppLayout from './layouts/AppLayout'
import { WebcamProvider } from './context/WebcamProvider'
import { HandTrackingProvider } from './context/HandTrackingProvider'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import StartSession from './pages/StartSession'
import Setup from './pages/Setup'
import Calibration from './pages/Calibration'
import Gameplace from './pages/Gameplace'
import Practice from './pages/Practice'
import WeeklyPlan from './pages/WeeklyPlan'
import History from './pages/History'
import Account from './pages/Account'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/login"
          element={
            <PageTransition>
              <Login />
            </PageTransition>
          }
        />
        <Route
          path="/register"
          element={
            <PageTransition>
              <Register />
            </PageTransition>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PageTransition>
              <ForgotPassword />
            </PageTransition>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PageTransition>
              <ResetPassword />
            </PageTransition>
          }
        />
        <Route
          path="/verify-email"
          element={
            <PageTransition>
              <VerifyEmail />
            </PageTransition>
          }
        />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route
            path="dashboard"
            element={
              <PageTransition>
                <Dashboard />
              </PageTransition>
            }
          />
          <Route
            path="start-session"
            element={
              <PageTransition>
                <StartSession />
              </PageTransition>
            }
          />
          <Route
            path="setup"
            element={
              <PageTransition>
                <Setup />
              </PageTransition>
            }
          />
          <Route
            path="calibration"
            element={
              <PageTransition>
                <Calibration />
              </PageTransition>
            }
          />
          <Route
            path="game"
            element={
              <PageTransition>
                <Gameplace />
              </PageTransition>
            }
          />
          <Route
            path="practice"
            element={
              <PageTransition>
                <Practice />
              </PageTransition>
            }
          />
          <Route
            path="plan"
            element={
              <PageTransition>
                <WeeklyPlan />
              </PageTransition>
            }
          />
          <Route
            path="history"
            element={
              <PageTransition>
                <History />
              </PageTransition>
            }
          />
          <Route
            path="account"
            element={
              <PageTransition>
                <Account />
              </PageTransition>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <WebcamProvider>
          <HandTrackingProvider>
            <AnimatedRoutes />
          </HandTrackingProvider>
        </WebcamProvider>
      </MotionConfig>
    </BrowserRouter>
  )
}

export default App