import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const LoginPage = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchRole = (next) => {
    setRole(next);
    setIsSignUp(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (role === 'faculty') {
        const { data, error: dbError } = await supabase
          .from('faculty')
          .select('email, password')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (dbError) throw dbError;
        if (!data) setError('No faculty account found with this email.');
        else if (data.password !== password) setError('Incorrect password. Try again.');
        else onLoginSuccess({ email: cleanEmail, role: 'faculty' });
        return;
      }

      // A student account is a registrations row that has a password.
      // Rows created when registering for events have no password, so they are excluded here.
      // This also avoids .maybeSingle() failing once a student has several registrations.
      const { data: accounts, error: lookupError } = await supabase
        .from('registrations')
        .select('student_email, password')
        .eq('student_email', cleanEmail)
        .not('password', 'is', null)
        .limit(1);

      if (lookupError) throw lookupError;
      const account = accounts && accounts[0];

      if (isSignUp) {
        if (account) {
          setError('An account with this email already exists. Sign in instead.');
          return;
        }
        const { error: insertError } = await supabase.from('registrations').insert([
          {
            event_id: 1,
            student_name: name.trim(),
            student_email: cleanEmail,
            student_phone: phone.trim(),
            password,
          },
        ]);
        if (insertError) throw insertError;
        onLoginSuccess({ email: cleanEmail, role: 'student' });
      } else {
        if (!account) setError('No account found with this email. Create one to continue.');
        else if (account.password !== password) setError('Incorrect password. Try again.');
        else onLoginSuccess({ email: cleanEmail, role: 'student' });
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong while contacting the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const heading = role === 'faculty' ? 'Faculty sign in' : isSignUp ? 'Create your account' : 'Sign in';
  const sub =
    role === 'faculty'
      ? 'Publish events and manage registrations.'
      : isSignUp
      ? 'Use your college email to register for events.'
      : 'Welcome back. Pick up where you left off.';

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <aside className="auth-side">
          <div className="brand">
            <span className="brand-mark">E</span>
            Eventics
          </div>
          <div>
            <p className="auth-tagline">Every campus event, in one place.</p>
            <ul className="auth-points">
              <li>Browse technical, cultural and sports events</li>
              <li>Register in under a minute</li>
              <li>Faculty can publish events and export rosters</li>
            </ul>
          </div>
        </aside>

        <main className="auth-main">
          <h2 className="auth-title">{heading}</h2>
          <p className="auth-sub">{sub}</p>

          <div className="seg" role="group" aria-label="Account type">
            <button type="button" aria-pressed={role === 'student'} onClick={() => switchRole('student')}>
              Student
            </button>
            <button type="button" aria-pressed={role === 'faculty'} onClick={() => switchRole('faculty')}>
              Faculty
            </button>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}

          <form onSubmit={handleSubmit}>
            {role === 'student' && isSignUp && (
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input id="name" className="input" type="text" autoComplete="name" value={name}
                    onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone number</label>
                  <input id="phone" className="input" type="tel" autoComplete="tel" value={phone}
                    pattern="[0-9+\s\-]{10,15}" title="Enter 10 to 15 digits"
                    onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="email">{role === 'faculty' ? 'Faculty email' : 'Student email'}</label>
              <input id="email" className="input" type="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="pw-wrap">
                <input id="password" className="input" type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="link-btn pw-toggle" onClick={() => setShowPassword((s) => !s)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {isSignUp && <span className="hint">At least 8 characters.</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Please wait…' : role === 'faculty' ? 'Sign in as faculty' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {role === 'student' && (
            <p className="auth-switch">
              {isSignUp ? 'Already have an account? ' : 'New to Eventics? '}
              <button type="button" className="link-btn" onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
                {isSignUp ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          )}
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
