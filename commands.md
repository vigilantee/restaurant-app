# Useful Commands for Your Docker Setup

## Build and Start Everything

```bash
# Build and start all services
docker-compose up --build

# Start in background (detached mode)
docker-compose up -d --build

# Start only specific service
docker-compose up postgres
docker-compose up app
```

## Management Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# View logs
docker-compose logs
docker-compose logs app
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f app
```

## Development Commands

```bash
# Rebuild specific service
docker-compose build app
docker-compose build postgres

# Restart specific service
docker-compose restart app

# Execute commands in running container
docker-compose exec app sh
docker-compose exec postgres psql -U postgres -d myapp
```

## Database Commands

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d myapp

# Backup database
docker-compose exec postgres pg_dump -U postgres myapp > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres -d myapp < backup.sql
```
