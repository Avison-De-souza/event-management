import React, { useState } from 'react';
import LoginPage from './LoginPage';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import { ToastProvider } from './Ui';

const SESSION_KEY = 'eventics_user';

const loadSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
};

function App() {
  const [user, setUser] = useState(loadSession); // { email, role }

  const handleLoginSuccess = (userData) => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData)); } catch {}
    setUser(userData);
  };

  const handleLogout = () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    setUser(null);
  };

  let screen;
  if (!user) screen = <LoginPage onLoginSuccess={handleLoginSuccess} />;
  else if (user.role === 'faculty') screen = <TeacherDashboard onLogout={handleLogout} userEmail={user.email} />;
  else screen = <StudentDashboard onLogout={handleLogout} userEmail={user.email} />;

  return <ToastProvider>{screen}</ToastProvider>;
}

export default App;
