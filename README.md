# 🏛️ Municipal Connect – Service Delivery Reporting Portal

## Simple Overview

Municipal Connect is a web-based platform that enables South African residents to report municipal service delivery issues (potholes, water leaks, power outages, illegal dumping) directly to their local municipality. Residents can track request progress, while municipal workers and admins manage and resolve issues efficiently.

---

## Description

This project was developed as part of a Software Design course, following Agile methodology with CI/CD principles and a test-driven approach. The system automatically tags service requests to the correct South African ward using official Municipal Demarcation Board (MDB) geospatial data.

**Key features:**

- **Residents** – Submit requests with photos and location, track status, leave feedback
- **Municipal Workers** – Claim unassigned requests, update progress, upload resolution photos
- **Admins** – Assign requests to workers, manage user roles, view analytics
- **Public Dashboard** – Live map showing open requests (no login required)
- **SA Data Integration** – Real ward boundaries from MDB 2024 dataset

**Tech Stack:**
| Layer | Technology |
|-------|------------|
| Frontend | React 18 |
| Backend | Supabase (PostgreSQL + Auth) |
| Maps | Leaflet + OpenStreetMap |
| Authentication | Supabase Auth (Email/Password + Google OAuth) |
| Geospatial | PostGIS |
| CI/CD | GitHub Actions |
| Deployment | Vercel |

---

## Getting Started

### Dependencies

| Requirement      | Version               | Notes                            |
| ---------------- | --------------------- | -------------------------------- |
| Node.js          | 18.x or 20.x          | [Download](https://nodejs.org/)  |
| npm              | 9.x+                  | Comes with Node.js               |
| Git              | Latest                | [Download](https://git-scm.com/) |
| Supabase Account | Free tier             | [Sign up](https://supabase.com/) |
| Web Browser      | Chrome/Firefox/Safari | Modern browser required          |

**Supported OS:** macOS, Windows 10/11, Linux (Ubuntu 20.04+)

---

### Installing

#### 1. Clone the repository

```bash
git clone https://github.com/Pul-e/municipal-service-portal.git
cd municipal-service-portal
```

#### 2. Install frontend dependencies

```bash
npm install
```

#### 3. Set up environment variables

Create a .env file in the root directory:

```bash
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Where to find these: Supabase Dashboard → Project Settings → API → Project URL / Anon Key

#### 4. Set up the backend (if using local API server)

```bash
cd server
npm install
cp .env.example .env   # Add your Supabase credentials
```

### Executing Program

#### Start the frontend development server

```bash
npm start
```

#### Start the backend API server (optional – for ward detection)

```bash
cd server
npm run dev
```

### Database Setup (Supabase)

#### 1. Enable PostGIS extension

Go to Supabase Dashboard → Database → Extensions → Enable postgis

#### 2. Create required tables

Run the following SQL in Supabase SQL Editor:

```bash
-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service requests table
CREATE TABLE service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  description TEXT,
  location TEXT,
  location_point GEOMETRY(Point, 4326),
  status TEXT DEFAULT 'Pending',
  priority TEXT DEFAULT 'Medium',
  user_id UUID REFERENCES auth.users(id),
  ward TEXT,
  municipality TEXT,
  image_url TEXT,
  resolution_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  assigned BOOLEAN DEFAULT FALSE
);

-- Assignments table
CREATE TABLE service_request_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id),
  staff_id UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ
);

-- Feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES service_requests(id),
  user_id UUID REFERENCES auth.users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wards table (from MDB GeoJSON data)
CREATE TABLE wards (
  id SERIAL PRIMARY KEY,
  geometry GEOMETRY(Geometry, 4326),
  ward_id TEXT,
  ward_no INTEGER,
  municipali TEXT,
  province TEXT,
  ward_label TEXT
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
```

#### 3. Create ward detection function

```bash
CREATE OR REPLACE FUNCTION get_ward_from_location(lat float, lng float)
RETURNS TABLE(
  id INTEGER,
  ward_id TEXT,
  ward_no INTEGER,
  municipali TEXT,
  province TEXT
) LANGUAGE sql STABLE AS $$
  SELECT id, ward_id, ward_no, municipali, province
  FROM wards
  WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  LIMIT 1;
$$;
```

#### 4. Import ward boundaries

Download South African ward data from the Municipal Demarcation Board and upload using:

```bash
python3 geojson_to_supabase.py
```

## Help

### Common issues and solutions

| Issue                                   | Solution                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `react-scripts: command not found`      | Run `npm install --legacy-peer-deps`                                       |
| `Module not found: 'react-leaflet'`     | Run `npm install leaflet react-leaflet`                                    |
| `Error: PGRST200` (Supabase join error) | Fetch related data separately – avoid nested selects                       |
| Port 3000 already in use                | Run `lsof -i :3000`, then `kill -9 <PID>`                                  |
| Map not showing markers                 | Check that `location_point` column has valid PostGIS geometry              |
| Ward lookup returns `null`              | Verify `wards` table has geometry and SRID 4326                            |
| White screen / no console errors        | Check `index.js` for `BrowserRouter` wrapper, verify environment variables |

### Get help

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json && npm install --legacy-peer-deps
```

## Email Notification Limitation

The project currently uses Resend for email notifications when a service request status changes.

Due to Resend sandbox/testing restrictions on unverified domains, emails can currently only be delivered to the developer’s verified email address. Attempting to send notifications to other recipient addresses may result in a `403 Forbidden` response from the Resend API.

This limitation exists because the project does not yet use a verified custom sending domain. In a production deployment, this would be resolved by configuring and verifying a custom domain with Resend.

## Authors

1. **Siyolise Dlani** – Backend Developer (Authentication, Maps, Ward Integration, Admin/Worker Dashboards)
2. **Zidan Fajandar** – Tester/Backend Developer (Testing Strategy, Unit & Integration Tests, Code Coverage, Feedback Workflow, Email Notification Integration, CI/CD Support
3. **Nelcials Joseph** - Frontend Developer
4. **Ahmed Surtee** - Database design, SQL queries, Supabase tables, and data management.

Course: Software Design 2026 – School of Computer Science and Applied Mathematics

## Acknowledgments

1. **Municipal Demarcation Board (MDB)** – South African ward boundary data
2. **OpenStreetMap** – Free map tiles
3. **Leaflet** – Interactive mapping library
4. **Supabase** – Backend infrastructure
5. **React Leaflet** – React wrapper for Leaflet
6. **GitHub Actions** – CI/CD pipeline
7. **Vercel** – Hosting

## License

This project is for educational purposes as part of the Software Design course.
