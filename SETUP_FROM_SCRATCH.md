# Rafef Tech - Setup From Scratch

This guide explains how to install and run the project on a new computer with an empty database.

## Requirements

- Git
- Docker Desktop
- PowerShell or any terminal

You do not need to install Node.js locally if you run the project with Docker Compose.

## 1. Download The Project

```powershell
git clone https://github.com/AbdoAljallad/Rafef_Tech_Store.git
cd Rafef_Tech_Store
```

If the project already exists:

```powershell
git pull
```

## 2. Create Environment Files

Create the MySQL environment file:

```powershell
Copy-Item infrastructure/mysql/.env.example infrastructure/mysql/.env
```

Expected content:

```env
MYSQL_ROOT_PASSWORD=rafef_root_password
MYSQL_DATABASE=rafef_tech
MYSQL_USER=rafef_user
MYSQL_PASSWORD=rafef_password
```

Optional frontend env file:

```powershell
Copy-Item .env.example .env.local
```

For Docker local development, the frontend can work without `.env.local` because `docker-compose.yml` sets:

```env
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://backend:3000
```

## 3. Start Docker

Make sure Docker Desktop is running, then start the project:

```powershell
docker compose up -d
```

This starts:

- MySQL on `localhost:3306`
- Backend on `localhost:3000`
- Frontend on `localhost:5173`
- Caddy on `localhost:80`
- Adminer on `localhost:8080`

## 4. Create Database Tables And Seed Data

The backend container automatically runs:

```bash
npm run db:setup
```

That command runs:

```bash
npm run migrate
npm run seed
```

So when the backend starts, it creates all database tables and inserts the default admin user.

If you need to run it manually:

```powershell
docker compose exec backend npm run db:setup
```

## 5. Check That Everything Works

Check containers:

```powershell
docker compose ps
```

Check backend health:

```powershell
curl.exe http://localhost/api/health
```

Expected result includes:

```json
{"status":"ok","database":"ok"}
```

Open the app:

```text
http://localhost
```

Direct Vite frontend:

```text
http://localhost:5173
```

From another device on the same Wi-Fi, use the computer IP:

```text
http://YOUR_PC_IP
http://YOUR_PC_IP:5173
```

Example:

```text
http://192.168.1.64
http://192.168.1.64:5173
```

If another device cannot open it, allow ports `80` and `5173` in Windows Firewall.

## 6. Login

Default admin account:

```text
username: admin
password: admin123
```

Change this password after first setup if the system will be used seriously.

## 7. Adminer Database UI

Open:

```text
http://localhost:8080
```

Login:

```text
System: MySQL
Server: mysql
Username: rafef_user
Password: rafef_password
Database: rafef_tech
```

## 8. Useful Commands

View logs:

```powershell
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f caddy
```

Restart one service:

```powershell
docker compose restart backend
docker compose restart frontend
docker compose restart caddy
```

Stop all services:

```powershell
docker compose down
```

Start again:

```powershell
docker compose up -d
```

Rebuild/recreate containers:

```powershell
docker compose up -d --force-recreate
```

## 9. Empty Database Or Missing Tables

If login fails and logs show missing tables such as `auth_users`, run:

```powershell
docker compose exec backend npm run db:setup
```

Then check:

```powershell
curl.exe http://localhost/api/health
```

If needed, restart backend:

```powershell
docker compose restart backend
```

## 10. Reset Database Completely

Warning: this deletes all MySQL data.

```powershell
docker compose down -v
docker compose up -d
```

The backend will recreate tables and seed data automatically.

## 11. Local URLs Summary

```text
App through Caddy: http://localhost
Frontend direct:   http://localhost:5173
Backend API:       http://localhost:3000
Health check:      http://localhost/api/health
Adminer:           http://localhost:8080
```

## 12. Common Problems

### PowerShell curl -L does not work

PowerShell aliases `curl` to `Invoke-WebRequest`. Use:

```powershell
curl.exe -L http://localhost
```

### Port already used

Check what is using a port:

```powershell
netstat -ano | findstr :80
netstat -ano | findstr :5173
netstat -ano | findstr :3000
```

Stop the conflicting app or change the port mapping in `docker-compose.yml`.

### Caddy redirects to HTTPS

For local development, `Caddyfile` should use plain HTTP:

```caddy
:80 {
    reverse_proxy /api/* rafef-tech-backend:3000
    reverse_proxy rafef-tech-frontend:5173
}
```

Then restart:

```powershell
docker compose restart caddy
```

### Frontend opens but API fails

Check backend:

```powershell
curl.exe http://localhost/api/health
docker compose logs --tail=100 backend
```

### New admin/user has no permissions

Login with the seeded admin:

```text
admin / admin123
```

Then go to Settings / Administration and manage users/permissions.

