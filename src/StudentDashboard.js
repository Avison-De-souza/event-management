import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { useToast, Modal, ConfirmModal } from './Ui';
import {
  FALLBACK_POSTER, onPosterError, formatDate, parseDate,
  registrationState, isOpen, hasEnded,
} from './utils';

const StudentDashboard = ({ onLogout, userEmail }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('events');
  const [events, setEvents] = useState([]);
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });

  const fetchEvents = useCallback(async () => {
    const { data, error } = await supabase.from('events').select('*');
    if (error) {
      console.error(error);
      toast('Could not load events. Please refresh.', 'error');
    } else {
      setEvents(data || []);
    }
  }, [toast]);

  const fetchMyRegistrations = useCallback(async () => {
    const { data, error } = await supabase
      .from('registrations')
      .select('id, event_id, student_name, student_phone, events(*)')
      .eq('student_email', userEmail);
    if (error) {
      console.error(error);
      return;
    }
    const rows = data || [];
    setMyRegistrations(rows);
    // Pre-fill the registration form from the student's earlier details.
    setForm((f) => (f.name || f.phone || !rows[0] ? f : { name: rows[0].student_name || '', phone: rows[0].student_phone || '' }));
  }, [userEmail]);

  useEffect(() => {
    Promise.all([fetchEvents(), fetchMyRegistrations()]).finally(() => setLoading(false));
  }, [fetchEvents, fetchMyRegistrations]);

  const registeredIds = useMemo(
    () => new Set(myRegistrations.map((r) => String(r.event_id))),
    [myRegistrations]
  );

  // Upcoming first (soonest date first), ended events last.
  const sortedEvents = useMemo(() => {
    const byDate = (a, b) => String(a.event_date).localeCompare(String(b.event_date));
    const upcoming = events.filter((e) => !hasEnded(e)).sort(byDate);
    const ended = events.filter(hasEnded).sort((a, b) => byDate(b, a));
    return [...upcoming, ...ended];
  }, [events]);

  const categories = useMemo(
    () => ['All', ...new Set(events.map((e) => e.category).filter(Boolean))],
    [events]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedEvents.filter(
      (e) =>
        (category === 'All' || e.category === category) &&
        (!q || [e.title, e.description, e.category].some((v) => String(v || '').toLowerCase().includes(q)))
    );
  }, [sortedEvents, category, query]);

  const featured = !query && category === 'All' ? sortedEvents.find((e) => isOpen(e) && !registeredIds.has(String(e.id))) : null;
  const gridEvents = featured ? filtered.filter((e) => e.id !== featured.id) : filtered;

  const openRegister = (ev) => setSelectedEvent(ev);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('registrations').insert([
      {
        event_id: selectedEvent.id,
        student_name: form.name.trim(),
        student_email: userEmail,
        student_phone: form.phone.trim(),
      },
    ]);
    setBusy(false);

    if (error) {
      console.error(error);
      toast(error.code === '23505' ? 'You are already registered for this event.' : 'Registration failed. Please try again.', 'error');
      return;
    }
    toast(`You're registered for ${selectedEvent.title}.`, 'success');
    setSelectedEvent(null);
    fetchMyRegistrations();
  };

  const handleCancel = async () => {
    setBusy(true);
    const { error } = await supabase
      .from('registrations')
      .delete()
      .eq('id', cancelTarget.id)
      .eq('student_email', userEmail);
    setBusy(false);
    if (error) {
      console.error(error);
      toast('Could not cancel the registration. Please try again.', 'error');
      return;
    }
    toast('Registration cancelled.', 'success');
    setCancelTarget(null);
    fetchMyRegistrations();
  };

  const renderAction = (ev) => {
    if (registeredIds.has(String(ev.id))) return <span className="pill pill-accent">Registered</span>;
    if (!isOpen(ev)) return <button className="btn btn-ghost btn-sm" disabled>Unavailable</button>;
    return <button className="btn btn-primary btn-sm" onClick={() => openRegister(ev)}>Register</button>;
  };

  const sortedRegs = [...myRegistrations].sort((a, b) =>
    String(a.events?.event_date).localeCompare(String(b.events?.event_date))
  );

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">E</span>
            Eventics
            <span className="brand-role">Student</span>
          </div>
          <nav className="tabs" aria-label="Sections">
            <button className="tab" aria-current={activeTab === 'events' ? 'page' : undefined} onClick={() => setActiveTab('events')}>
              Discover
            </button>
            <button className="tab" aria-current={activeTab === 'my-registrations' ? 'page' : undefined} onClick={() => setActiveTab('my-registrations')}>
              My registrations{myRegistrations.length ? ` (${myRegistrations.length})` : ''}
            </button>
          </nav>
          <div className="topbar-end">
            <span className="user-chip">{userEmail}</span>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="page">
        {activeTab === 'events' ? (
          <>
            <div className="page-head">
              <div>
                <h1 className="page-title">Upcoming events</h1>
                <p className="page-sub">Find something to take part in and register in a minute.</p>
              </div>
            </div>

            {loading ? (
              <p className="muted">Loading events…</p>
            ) : events.length === 0 ? (
              <div className="empty">
                <h3>No events yet</h3>
                <p>Faculty haven't published any events. Check back soon.</p>
              </div>
            ) : (
              <>
                {featured && (
                  <section className="hero" aria-label="Featured event">
                    <div className="hero-body">
                      <span className="hero-kicker">Next up · {featured.category}</span>
                      <h2 className="hero-title">{featured.title}</h2>
                      <p className="hero-desc clamp">{featured.description}</p>
                      <div className="hero-facts">
                        <div><b>Event date</b>{formatDate(featured.event_date)}</div>
                        <div><b>Register by</b>{formatDate(featured.deadline_date)}</div>
                      </div>
                      <button className="btn btn-light" onClick={() => openRegister(featured)}>Register now</button>
                    </div>
                    <img className="hero-img" src={featured.poster_url || FALLBACK_POSTER} alt="" onError={onPosterError} />
                  </section>
                )}

                <div className="toolbar">
                  <input
                    className="input search"
                    type="search"
                    placeholder="Search events"
                    aria-label="Search events"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <div className="chips" role="group" aria-label="Filter by category">
                    {categories.map((c) => (
                      <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {gridEvents.length === 0 ? (
                  <div className="empty">
                    <h3>No events match</h3>
                    <p>Try a different search or category.</p>
                    <button className="btn btn-ghost" onClick={() => { setQuery(''); setCategory('All'); }}>Clear filters</button>
                  </div>
                ) : (
                  <div className="event-grid">
                    {gridEvents.map((ev) => {
                      const state = registrationState(ev);
                      return (
                        <article className="event-card" key={ev.id}>
                          <img src={ev.poster_url || FALLBACK_POSTER} alt="" loading="lazy" onError={onPosterError} />
                          <div className="event-card-body">
                            <div className="event-meta">{ev.category} · {formatDate(ev.event_date)}</div>
                            <h3 className="event-title">{ev.title}</h3>
                            <p className="event-desc clamp">{ev.description}</p>
                            <div className="event-card-foot">
                              <span className={`pill ${state.tone ? `pill-${state.tone}` : ''}`}>{state.label}</span>
                              {renderAction(ev)}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <div className="page-head">
              <div>
                <h1 className="page-title">My registrations</h1>
                <p className="page-sub">Events you've signed up for, soonest first.</p>
              </div>
            </div>

            {sortedRegs.length === 0 ? (
              <div className="empty">
                <h3>You haven't registered for anything yet</h3>
                <p>Browse upcoming events and pick one to join.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('events')}>Browse events</button>
              </div>
            ) : (
              <div className="reg-list">
                {sortedRegs.map((reg) => {
                  const ev = reg.events || {};
                  const d = parseDate(ev.event_date);
                  const ended = ev.event_date ? hasEnded(ev) : false;
                  return (
                    <article className="reg-item" key={reg.id}>
                      <div className="date-block">
                        <b>{d ? d.getDate() : '–'}</b>
                        <span>{d ? d.toLocaleDateString('en-IN', { month: 'short' }) : ''}</span>
                      </div>
                      <div className="reg-main">
                        <h3 className="event-title">{ev.title || 'Event unavailable'}</h3>
                        <div className="event-meta">
                          {ev.category} · Registered as {reg.student_name} ({reg.student_phone})
                        </div>
                      </div>
                      <div className="reg-side">
                        <span className={`pill ${ended ? '' : 'pill-ok'}`}>{ended ? 'Completed' : 'Confirmed'}</span>
                        {!ended && (
                          <button className="btn btn-danger btn-sm" onClick={() => setCancelTarget(reg)}>Cancel</button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {selectedEvent && (
        <Modal title={`Register for ${selectedEvent.title}`} onClose={() => setSelectedEvent(null)}>
          <form onSubmit={handleRegisterSubmit}>
            <div className="field">
              <label htmlFor="reg-name">Full name</label>
              <input id="reg-name" className="input" required autoFocus value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="reg-email">Email</label>
              <input id="reg-email" className="input" value={userEmail} disabled />
            </div>
            <div className="field">
              <label htmlFor="reg-phone">Phone number</label>
              <input id="reg-phone" className="input" type="tel" required value={form.phone}
                pattern="[0-9+\s\-]{10,15}" title="Enter 10 to 15 digits"
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setSelectedEvent(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Registering…' : 'Confirm registration'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {cancelTarget && (
        <ConfirmModal
          title="Cancel this registration?"
          message={`You'll give up your spot in ${cancelTarget.events?.title || 'this event'}. You can register again while registration is open.`}
          confirmLabel="Cancel registration"
          busy={busy}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </>
  );
};

export default StudentDashboard;
