# Eventics

A college event management portal. Students discover and register for campus events; faculty publish events, track sign-ups and export rosters.

Built with React and Supabase.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Project structure](#project-structure)
- [Available scripts](#available-scripts)
- [Deployment](#deployment)
- [Security notes](#security-notes)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features

### Students
- Create an account and sign in
- Browse upcoming events, with a featured next event
- Search events and filter by category
- See each event's registration status: open, closing soon, closed or ended
- Register for an event; details are pre-filled from earlier registrations
- View and cancel registrations

### Faculty
- Sign in to a separate faculty portal
- Dashboard with totals for events, upcoming events, events open for registration and registrations
- Publish events with title, category, poster, event date and registration deadline (deadline must not be after the event date)
- Search events and see registration counts at a glance
- View each event's roster, search it, and export it as CSV
- Delete events (blocked while students are registered)

### General
- Responsive layout for desktop and mobile
- Toast notifications and confirmation dialogs instead of browser alerts
- Keyboard-accessible dialogs, visible focus states and reduced-motion support
- Session survives a page refresh

## Tech stack

| Area | Technology |
| --- | --- |
| Frontend | React (Create React App) |
| Database | Supabase (PostgreSQL) |
| Client library | `@supabase/supabase-js` |
| Styling | Plain CSS design system in `src/index.css` |
| Font | Manrope (Google Fonts) |

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 18 or newer
- A free [Supabase](https://supabase.com) account
- Git

### Installation

1. Clone the repository and move into it:
   ```bash
   git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
   cd YOUR-REPO
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a Supabase project, open **SQL Editor**, and run the contents of `eventics_setup.sql`.
4. Create a `.env` file in the project root (see below).
5. Start the development server:
   ```bash
   npm start
   ```
   The app opens at http://localhost:3000.

### First sign-in

The setup script creates one demo faculty account:

| Email | Password |
| --- | --- |
| `faculty@example.com` | `ChangeMe123` |

Change this password straight away. Students create their own accounts from the sign-in page.

## Environment variables

Create `.env` in the project root, next to `package.json`:

```
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT-ID.supabase.co
REACT_APP_SUPABASE_ANON_KEY=YOUR-PUBLISHABLE-KEY
```

Find both values in Supabase under **Project Settings → API**. Restart `npm start` after editing `.env`. Do not commit this file, and never use the `service_role` key in the frontend.

`src/supabaseClient.js`:

```js
import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const key = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error('Missing Supabase settings. Check your .env file.');
}

export const supabase = createClient(url, key);
```

## Database

Three tables, created by `eventics_setup.sql`:

**`events`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `title` | text | Required |
| `description` | text | |
| `category` | text | For example Technology, Cultural, Sports |
| `event_date` | date | |
| `deadline_date` | date | Must be on or before `event_date` |
| `poster_url` | text | Falls back to a default image if empty or broken |
| `venue`, `capacity` | text, integer | Optional |
| `created_at` | timestamptz | |

**`registrations`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint | Primary key |
| `event_id` | bigint | References `events(id)` |
| `student_name`, `student_email`, `student_phone` | text | |
| `password` | text | Only set on a student's sign-up row |
| `created_at` | timestamptz | |

A unique constraint on `(event_id, student_email)` prevents duplicate registrations.

**`faculty`**: `id`, `name`, `email` (unique), `password`, `created_at`.

The script also creates an `event_stats` view with registration counts and fill rate per event, plus ready-to-run report queries (popular events, daily sign-ups, closing deadlines, and more).

### Known data-model limitation

A student account is currently a `registrations` row that has a password, and sign-up inserts that row against event 1. Every new student therefore appears registered for event 1. Moving accounts into a separate `students` table, or into Supabase Auth, removes this (see [Roadmap](#roadmap)).

## Project structure

```
.
├── public/
│   └── index.html
├── src/
│   ├── App.js                 Routes between login, student and faculty views
│   ├── LoginPage.js           Sign in and sign up
│   ├── StudentDashboard.js    Discover events, registrations
│   ├── TeacherDashboard.js    Stats, event table, roster, publish
│   ├── Ui.js                  Toasts, modal and confirm dialog
│   ├── utils.js               Dates, registration status, CSV export
│   ├── supabaseClient.js      Supabase connection
│   ├── index.js               App entry point
│   ├── index.css              Design system and all styles
│   └── App.test.js            Smoke test
├── eventics_setup.sql         Database setup for a new Supabase project
├── .env                       Local settings (not committed)
└── package.json
```

## Available scripts

| Command | What it does |
| --- | --- |
| `npm start` | Runs the app in development mode |
| `npm test` | Runs the test suite |
| `npm run build` | Creates a production build in `build/` |

## Deployment

The app builds to static files, so any static host works (Vercel, Netlify, GitHub Pages).

For Vercel or Netlify:

1. Import the GitHub repository.
2. Set the build command to `npm run build` and the output directory to `build`.
3. Add `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in the host's environment variable settings.
4. Deploy.

## Security notes

This project is suitable for learning and demos. Before using it with real student data, address the following:

- **Passwords are stored in plain text** and checked in the browser. Move to Supabase Auth (`signUp` / `signInWithPassword`) and remove the password columns.
- **Row Level Security is permissive.** The setup script lets the public anon key read and write, because the app does its own login. Replace these with per-user policies once Supabase Auth is in place. Example policies are in the script.
- **Faculty actions are not enforced by the database.** Restrict event creation, deletion and roster access to faculty with policies.
- The anon (publishable) key is meant to be public. Never expose the `service_role` key.

## Roadmap

- [ ] Supabase Auth for students and faculty
- [ ] Separate `students` table and per-user Row Level Security
- [ ] Event capacity limits and waitlist
- [ ] Edit existing events
- [ ] Email confirmation after registration
- [ ] Event venue and time shown in the UI

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a pull request

## License

Add a license of your choice (for example MIT) in a `LICENSE` file. Until one is added, all rights are reserved by the author.
