# Rafef Tech Backend

Backend Phase 1 foundation for Rafef Tech.

## Scope

- MySQL 8.4 LTS connection.
- SQL migration runner.
- Auth foundation tables.
- Initial seed data.
- Login, logout, current user.
- Audit log service foundation.
- Health endpoint.

## Setup

```bash
cd backend
npm install
copy .env.example .env
```

Update `.env` with your MySQL credentials.

For the local Docker database from the project root, the default backend `.env.example` values already match:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=rafef_user
MYSQL_PASSWORD=rafef_password
MYSQL_DATABASE=rafef_tech
```

## Start Local MySQL

From the project root:

```bash
docker compose up -d mysql adminer
```

Adminer:

```text
http://localhost:8080
```

Adminer login:

```text
System: MySQL
Server: mysql
Username: rafef_user
Password: rafef_password
Database: rafef_tech
```

## Database

Create schema and run migrations:

```bash
npm run migrate
```

Seed roles, permissions, and default users:

```bash
npm run seed
```

Or run both:

```bash
npm run db:setup
```

## Run

```bash
npm run dev
```

Health check:

```text
GET http://localhost:3000/api/health
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Login test:

```powershell
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/auth/login `
  -WebSession $session `
  -ContentType 'application/json' `
  -Body '{"username":"admin","password":"admin123"}'

Invoke-RestMethod `
  -Uri http://localhost:3000/api/auth/me `
  -WebSession $session
```

## Local Admin Credentials

```text
username: admin
password: admin123
```

Change these through `.env` before real use:

```env
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=admin123
```

## Scripts

```bash
npm run typecheck
npm run build
npm run migrate
npm run seed
npm run dev
```
