import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { useToast, Modal, ConfirmModal } from './Ui';
import {
  FALLBACK_POSTER, onPosterError, formatDate, registrationState, hasEnded, downloadCSV,
} from './utils';

const PRESET_CATEGORIES = ['Technology', 'Cultural', 'Sports', 'Academic', 'Workshop'];
const EMPTY_EVENT = { title: '', description: '', category: 'Technology', event_date: '', deadline_date: '', poster_url: '' };

const TeacherDashboard = ({ onLogout, userEmail }) => {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPublish, setShowPublish] = useState(false);
  const [newEvent, setNewEvent] = useState(EMPTY_EVENT);
  const [roster, setRoster] = useState(null);
  const [rosterSearch, setRosterSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchData = useCallback(async () => {
    const [eventsRes, regsRes] = await Promise.all([
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      // Explicit columns so student passwords are never sent to the browser.
      // If your table has a created_at column, add it here to show registration dates.
      supabase.from('registrations').select('id, event_id, student_name, student_email, student_phone'),
    ]);
    if (eventsRes.error) { console.error(eventsRes.error); toast('Could not load events.', 'error'); }
    else setEvents(eventsRes.data || []);
    if (regsRes.error) { console.error(regsRes.error); toast('Could not load registrations.', 'error'); }
    else setRegistrations(regsRes.data || []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const countsByEvent = useMemo(() => {
    const map = {};
    registrations.forEach((r) => { map[r.event_id] = (map[r.event_id] || 0) + 1; });
    return map;
  }, [registrations]);

  const categories = useMemo(
    () => [...new Set([...PRESET_CATEGORIES, ...events.map((e) => e.category).filter(Boolean)])],
    [events]
  );

  const stats = useMemo(() => ({
    total: events.length,
    upcoming: events.filter((e) => !hasEnded(e)).length,
    open: events.filter((e) => ['open', 'soon'].includes(registrationState(e).key)).length,
    registrations: registrations.length,
  }), [events, registrations]);

  const visibleEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => !q || [e.title, e.category].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [events, search]);

  const rosterRows = useMemo(() => {
    if (!roster) return [];
    const q = rosterSearch.trim().toLowerCase();
    return registrations
      .filter((r) => String(r.event_id) === String(roster.id))
      .filter((r) => !q || [r.student_name, r.student_email].some((v) => String(v || '').toLowerCase().includes(q)));
  }, [registrations, roster, rosterSearch]);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (newEvent.deadline_date > newEvent.event_date) {
      toast('The registration deadline must be on or before the event date.', 'error');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('events').insert([{ ...newEvent, title: newEvent.title.trim() }]);
    setBusy(false);
    if (error) {
      console.error(error);
      toast(`Could not publish the event: ${error.message}`, 'error');
      return;
    }
    toast('Event published.', 'success');
    setNewEvent(EMPTY_EVENT);
    setShowPublish(false);
    fetchData();
  };

  const handleDelete = async () => {
    setBusy(true);
    const { error } = await supabase.from('events').delete().eq('id', deleteTarget.id);
    setBusy(false);
    if (error) {
      console.error(error);
      toast("This event can't be deleted while students are registered for it.", 'error');
      return;
    }
    toast('Event deleted.', 'success');
    setDeleteTarget(null);
    fetchData();
  };

  const exportCSV = (ev) => {
    const rows = registrations.filter((r) => String(r.event_id) === String(ev.id));
    if (rows.length === 0) {
      toast('No registrations to export for this event yet.', 'error');
      return;
    }
    const withDate = rows.some((r) => r.created_at);
    downloadCSV(
      `${ev.title.replace(/\s+/g, '_')}_roster.csv`,
      ['Student name', 'Email', 'Phone', ...(withDate ? ['Registered on'] : [])],
      rows.map((r) => [r.student_name, r.student_email, r.student_phone, ...(withDate ? [r.created_at] : [])])
    );
  };

  const setField = (e) => setNewEvent({ ...newEvent, [e.target.name]: e.target.value });

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">E</span>
            Eventics
            <span className="brand-role">Faculty</span>
          </div>
          <div className="topbar-end">
            <span className="user-chip">{userEmail}</span>
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>Sign out</button>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Event management</h1>
            <p className="page-sub">Publish events, track sign-ups and export rosters.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowPublish(true)}>Publish new event</button>
        </div>

        <section className="stats" aria-label="Summary">
          <div className="stat"><div className="stat-label">Total events</div><div className="stat-value">{stats.total}</div></div>
          <div className="stat"><div className="stat-label">Upcoming</div><div className="stat-value">{stats.upcoming}</div></div>
          <div className="stat"><div className="stat-label">Open for registration</div><div className="stat-value">{stats.open}</div></div>
          <div className="stat"><div className="stat-label">Registrations</div><div className="stat-value">{stats.registrations}</div></div>
        </section>

        <div className="toolbar">
          <h2 className="section-title" style={{ margin: 0, marginRight: 'auto' }}>All events</h2>
          <input className="input search" type="search" placeholder="Search by title or category"
            aria-label="Search events" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <p className="muted">Loading events…</p>
        ) : events.length === 0 ? (
          <div className="empty">
            <h3>No events published yet</h3>
            <p>Publish your first event and students will see it straight away.</p>
            <button className="btn btn-primary" onClick={() => setShowPublish(true)}>Publish new event</button>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="empty"><h3>No events match “{search}”</h3><p>Try a different search.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Event</th><th>Event date</th><th>Register by</th><th>Status</th>
                  <th style={{ textAlign: 'right' }}>Registered</th><th />
                </tr>
              </thead>
              <tbody>
                {visibleEvents.map((ev) => {
                  const state = registrationState(ev);
                  const count = countsByEvent[ev.id] || 0;
                  return (
                    <tr key={ev.id}>
                      <td>
                        <div className="cell-event">
                          <img className="thumb" src={ev.poster_url || FALLBACK_POSTER} alt="" loading="lazy" onError={onPosterError} />
                          <div><b>{ev.title}</b><span>{ev.category}</span></div>
                        </div>
                      </td>
                      <td className="num">{formatDate(ev.event_date)}</td>
                      <td className="num">{formatDate(ev.deadline_date)}</td>
                      <td><span className={`pill ${state.tone ? `pill-${state.tone}` : ''}`}>{state.label}</span></td>
                      <td className="num" style={{ textAlign: 'right', fontWeight: 700 }}>{count}</td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => { setRoster(ev); setRosterSearch(''); }}>Roster</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(ev)}>Export CSV</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(ev)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showPublish && (
        <Modal title="Publish new event" wide onClose={() => setShowPublish(false)}>
          <form onSubmit={handlePublish}>
            <div className="form-grid">
              <div className="field span-2">
                <label htmlFor="ev-title">Event title</label>
                <input id="ev-title" className="input" name="title" required autoFocus value={newEvent.title} onChange={setField} />
              </div>
              <div className="field">
                <label htmlFor="ev-cat">Category</label>
                <input id="ev-cat" className="input" name="category" list="category-options" required value={newEvent.category} onChange={setField} />
                <datalist id="category-options">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="field">
                <label htmlFor="ev-poster">Poster image URL</label>
                <input id="ev-poster" className="input" name="poster_url" type="url" placeholder="https://" value={newEvent.poster_url} onChange={setField} />
              </div>
              <div className="field">
                <label htmlFor="ev-date">Event date</label>
                <input id="ev-date" className="input" name="event_date" type="date" required value={newEvent.event_date} onChange={setField} />
              </div>
              <div className="field">
                <label htmlFor="ev-deadline">Registration deadline</label>
                <input id="ev-deadline" className="input" name="deadline_date" type="date" required max={newEvent.event_date || undefined} value={newEvent.deadline_date} onChange={setField} />
              </div>
              <div className="field span-2">
                <label htmlFor="ev-desc">Description</label>
                <textarea id="ev-desc" className="input" name="description" required value={newEvent.description} onChange={setField} />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowPublish(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Publishing…' : 'Publish event'}</button>
            </div>
          </form>
        </Modal>
      )}

      {roster && (
        <Modal title={`Roster · ${roster.title}`} wide onClose={() => setRoster(null)}>
          <div className="toolbar">
            <input className="input search" type="search" placeholder="Search by name or email"
              aria-label="Search roster" value={rosterSearch} onChange={(e) => setRosterSearch(e.target.value)} />
            <span className="muted" style={{ marginRight: 'auto' }}>{rosterRows.length} student{rosterRows.length === 1 ? '' : 's'}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => exportCSV(roster)}>Export CSV</button>
          </div>
          {rosterRows.length === 0 ? (
            <p className="muted">{rosterSearch ? 'No students match your search.' : 'No students have registered for this event yet.'}</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
                <tbody>
                  {rosterRows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                      <td>{r.student_email}</td>
                      <td className="num">{r.student_phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete this event?"
          message={`“${deleteTarget.title}” will be removed for everyone. This can't be undone.`}
          confirmLabel="Delete event"
          busy={busy}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
};

export default TeacherDashboard;
