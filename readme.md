# ProDUS Registro de Horas - Frontend

Frontend web application for ProDUS assistants time registration and assistants management. The application is built with Vue 3, TypeScript, Vite, and Vue Router. It communicates with the ProDUS backend through a JSON API using JWT authentication.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Application Features](#application-features)
- [Routes](#routes)
- [Roles and Access Control](#roles-and-access-control)
- [Requirements](#requirements)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Development](#development)
- [Production Build and Preview](#production-build-and-preview)
- [Deployment](#deployment)
- [API Integration](#api-integration)
- [Authentication and Browser Storage](#authentication-and-browser-storage)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)

## Overview

The frontend provides the user interface for:

- User login and logout.
- JWT access-token and refresh-token handling.
- Role-based navigation for assistants, coordinators, and administrators.
- Time-registration access.
- Assistant listing and assistant creation for authorized users.
- Assistant schedule configuration.
- API error display and session-expiration handling.

The backend is a separate service. A running backend API is required for login, assistant management, and other server-backed operations.

## Technology Stack

- **Vue 3** with Composition API and `<script setup>`.
- **TypeScript** for application and component type safety.
- **Vite** for development, bundling, and preview.
- **Vue Router** for client-side navigation and route guards.
- **Zod** for form validation.
- **Native Fetch API** for backend requests.
- **npm** for dependency management.

## Project Structure

```text
.
├── frontend/
│   ├── public/                   # Static public assets
│   ├── src/
│   │   ├── components/           # Reusable Vue components
│   │   ├── composables/          # Reusable Composition API logic
│   │   ├── config/               # App configuration and role definitions
│   │   ├── forms/                # Form schemas and validation
│   │   ├── router/               # Vue Router configuration and guards
│   │   ├── services/             # API service
│   │   ├── styles/               # Theme and global styles
│   │   ├── views/                # Page-level Vue components
│   │   ├── App.vue               # Root component
│   │   └── main.ts               # Application entry point
│   ├── .env.example              # Environment variable template
│   ├── package.json              # Frontend dependencies and scripts
│   ├── tsconfig*.json            # TypeScript configuration
│   └── vite.config.ts            # Vite configuration
├── rebuild_frontend.sh           # Build and publish an existing checkout
├── pull_and_rebuild_frontend.sh  # Pull, build, and publish the frontend
└── README.md
```

For component-level documentation, see [frontend/COMPONENTS.md](frontend/COMPONENTS.md).

## Application Features

### Login

The login page sends user credentials to the backend and stores the returned authentication data in browser storage. Authenticated users are redirected to the home page.

### Home dashboard

The home dashboard displays the signed-in user's name and role. Available actions and summary cards are selected according to the user's role.

### Time registration

The `/registro-horas` route is protected by authentication. The current view provides the time-registration entry point and is prepared for the backend-backed time-registration workflow.

### Assistant management

Authorized users can access `/gestionar-asistentes` to:

- View the assistant list.
- Open the new-assistant form.
- Configure one or more schedule blocks.
- Submit assistant and schedule data to the backend.

### Session handling

Authenticated API requests include the JWT access token. When the backend returns `401 Unauthorized`, the frontend attempts to refresh the access token. If refreshing fails, local authentication data is cleared and the user is returned to the login page.

## Routes

| Route | Name | Authentication | Required role | Description |
| --- | --- | --- | --- | --- |
| `/` | `login` | No | None | Login page |
| `/login` | `login-page` | No | None | Login page alias |
| `/home` | `home` | Yes | None | Role-based dashboard |
| `/registro-horas` | `registro-horas` | Yes | None | Time-registration page |
| `/gestionar-asistentes` | `manage-assistants` | Yes | `coordinador`, `admin` | Assistant management |
| `/blocked` | `blocked` | No | None | Unauthorized-access page |

The router uses HTML5 history mode. Production web-server configuration must fall back to `index.html` for client-side routes.

## Roles and Access Control

Roles are defined in `frontend/src/config/roles.ts`:

- **`asistente`**: Can view and edit their own hours and view their own schedule.
- **`coordinador`**: Can view and approve team hours, manage the team, view team schedules, and generate project reports.
- **`admin`**: Can manage users and roles, configure the system, view all data, manage IP ranges, and generate global reports.

The router reads the user's role from the JWT payload for protected role-specific routes. Authorization must also be enforced by the backend; frontend route guards are not a replacement for server-side authorization.

## Requirements

Install the following before setting up the project:

- **Node.js 20.19+ or 22.12+**.
- **npm**, included with Node.js.
- A reachable ProDUS backend API.
- Git, if cloning the repository.

The Node.js version requirement follows the current Vite 7 toolchain. Use `node --version` and `npm --version` to verify the installed tools.

## Installation

### 1. Enter the frontend workspace

All frontend source code, scripts, and package dependencies are located in `frontend/`.

```bash
cd frontend
```

### 2. Install dependencies

For a reproducible installation using the committed lockfile:

```bash
npm ci
```

Use `npm install` instead when intentionally updating dependencies or when a lockfile is not available.

### 3. Configure the environment

Copy the example file:

```bash
cp .env.example .env
```

In PowerShell, the equivalent command is:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set the backend URL and application values as described in [Environment Configuration](#environment-configuration).

## Environment Configuration

The frontend reads environment variables through Vite. Only variables prefixed with `VITE_` are exposed to browser code.

| Variable | Example | Description |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000/api` | Base URL of the backend API |
| `VITE_APP_ENV` | `development` | Current application environment |
| `VITE_APP_NAME` | `ProDus Registro de Horas` | Display name of the application |
| `VITE_APP_VERSION` | `1.0.0` | Application version shown to the frontend |

The default API URL is `http://127.0.0.1:8000/api` when `VITE_API_BASE_URL` is not set.

## Development

From the `frontend/` directory, start the Vite development server:

```bash
npm run dev
```

The application is served at:

```text
http://localhost:5173
```

Vite watches source files and reloads the browser when files change. Make sure the configured backend API is running and accessible from the browser.

## Production Build and Preview

Create an optimized production build:

```bash
cd frontend
npm run build
```

The generated static files are written to `frontend/dist/`.

Preview the production build locally:

```bash
npm run preview
```

The preview server is for local verification. For production, publish the contents of `frontend/dist/` through a web server such as Nginx.

## Deployment

The repository includes two Bash deployment scripts for the configured Linux server environment:

### Build and publish the current checkout

```bash
./rebuild_frontend.sh
```

This script:

1. Enters the configured frontend directory.
2. Runs `npm install`.
3. Runs `npm run build`.
4. Synchronizes `frontend/dist/` to `/var/www/produs`.
5. Validates the Nginx configuration.
6. Restarts Nginx.

### Pull, build, and publish

```bash
./pull_and_rebuild_frontend.sh
```

This script performs a fast-forward-only `git pull` before building and publishing.

### Deployment prerequisites

The scripts contain server-specific paths and require a Linux environment with:

- Node.js and npm.
- Git.
- Nginx.
- `rsync`.
- `sudo` permissions for the configured web root and Nginx service.

Before using them on another server, review and update `REPO_DIR`, `APP_DIR`, and `WEB_ROOT` in the scripts. The production web server must serve the SPA fallback file:

```text
/var/www/produs/index.html
```

for unknown application routes.

## API Integration

The API client is implemented in `frontend/src/services/api.ts`. It currently uses these backend endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/users/auth/login/` | Authenticate a user |
| `POST` | `/users/auth/refresh/` | Refresh an access token |
| `GET` | `/users/auth/validate-institute-ip/` | Check whether the client IP is allowed |
| `POST` | `/users/auth/validate-institute-ip/` | Validate the client IP with authentication |
| `POST` | `/users/auth/logout/` | End the backend session |
| `GET` | `/users/auth/me/` | Retrieve the current user |
| `POST` | `/users/assistants/` | Create an assistant |
| `GET` | `/users/assistants/list/` | List assistants |
| `GET` | `/schedules/` | Retrieve schedules |

The backend must provide compatible response shapes for authentication, assistant lists, assistant creation, schedules, and validation errors. The API client also supports generic `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` requests for future views.

## Authentication and Browser Storage

The application stores the following values in `localStorage`:

- `access_token`: JWT access token.
- `refresh_token`: JWT refresh token.
- `user`: serialized user information returned by the backend.

Assistant schedule drafts use `localStorage` while the assistant form is open. Logging out removes authentication data and the related session cache.

For security:

- Use HTTPS in production.
- Do not share browser storage contents or tokens.
- Enforce permissions in the backend as well as the frontend.
- Configure CORS on the backend for the deployed frontend origin.

## Documentation

- [Component Documentation](frontend/COMPONENTS.md)
- [Environment Template](frontend/.env.example)
- [Vite Configuration](frontend/vite.config.ts)
- [Role and Permission Definitions](frontend/src/config/roles.ts)
- [API Service](frontend/src/services/api.ts)
