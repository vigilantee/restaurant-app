# Restaurant Management Electron App

A desktop application for restaurant order management built with Electron, React, Express, and PostgreSQL.

## Prerequisites

Before running the application, ensure you have the following installed:

1. **Node.js** (v16 or higher)

   - Download from: https://nodejs.org/

2. **PostgreSQL** (v12 or higher)
   - Download from: https://www.postgresql.org/download/
   - Make sure PostgreSQL is running on `localhost:5432`
   - Default credentials: `postgres/password`

## Project Structure

```
restaurant-electron-app/
├── main.js                    # Electron main process
├── preload.js                 # Electron preload script
├── package.json               # Root dependencies
├── .env                       # Environment variables
├── app/                       # Express backend
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   └── utils/
├── frontend/                  # React frontend
│   ├── src/
│   ├── public/
│   ├── build/                 # Built React app
│   └── package.json
└── postgres/                  # Database scripts
    └── init/
        ├── populate-db.js     # Database population script
        ├── data.json          # Sample data
        └── prepend.sql        # Schema initialization
```

## Installation

### Step 1: Clone and Install Root Dependencies

```bash
# Navigate to project root
cd restaurant-electron-app

# Install root dependencies
npm install
```

### Step 2: Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build the React app
npm run build

# Go back to root
cd ..
```

### Step 3: Install Backend Dependencies

```bash
# Navigate to app directory
cd app

# Install dependencies
npm install

# Go back to root
cd ..
```

### Step 4: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy from example
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=myapp
NODE_ENV=production
PORT=8080
```

### Step 5: Setup PostgreSQL Database

```bash
# Create the database
createdb myapp

# Or using psql
psql -U postgres
CREATE DATABASE myapp;
\q
```

## Running the Application

### Single Command to Run Everything

```bash
npm start
```

This will:

1. Start the Express backend server
2. Connect to PostgreSQL database
3. Auto-populate database with sample data (if empty)
4. Launch the Electron desktop app with React frontend

### Development Mode

```bash
# Run in development mode with hot reload
npm run dev
```

### Running React in Development Mode

If you want to develop the frontend separately:

```bash
# Terminal 1: Start React dev server
cd frontend
npm start

# Terminal 2: Start Electron (pointing to dev server)
cd ..
NODE_ENV=development npm start
```

## Building the Application

Build standalone executables for distribution:

```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

Built applications will be in the `dist/` folder.

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Check PostgreSQL is running:

   ```bash
   # On macOS/Linux
   pg_isready

   # On Windows
   pg_isready -U postgres
   ```

2. Verify credentials in `.env` file

3. Check database exists:
   ```bash
   psql -U postgres -l
   ```

### Port Already in Use

If port 8080 is already in use, the app will automatically find a free port between 8080-9000.

### Frontend Not Loading

1. Ensure React app is built:

   ```bash
   cd frontend
   npm run build
   ```

2. Check `frontend/build/` directory exists

### Database Not Populating

1. Check files exist:

   - `postgres/init/populate-db.js`
   - `postgres/init/data.json`
   - `postgres/init/prepend.sql`

2. Manually populate:

   ```bash
   cd postgres/init
   node populate-db.js data.json generated_init.sql prepend.sql
   psql -U postgres -d myapp -f generated_init.sql
   ```

3. Make is executable:

   ```chmod +x setup.sh

   ```

## API Endpoints

Once running, the backend API is available at `http://localhost:8080/api`

- **Health Check**: `GET /health`
- **Menu**: `GET /api/menu`
- **Categories**: `GET /api/categories`
- **Orders**: `GET /api/orders`
- **Tables**: `GET /api/tables`
- **Customers**: `GET /api/customers`
- **Staff**: `GET /api/staff`

## Features

- Desktop application (no browser needed)
- Automatic backend server startup
- Auto-populates database on first run
- Real-time order management
- Menu and category management
- Table management
- Customer tracking
- Staff management

## Tech Stack

- **Frontend**: React, TailwindCSS, Axios
- **Backend**: Express.js, Node.js
- **Database**: PostgreSQL
- **Desktop**: Electron
- **UI Components**: Headless UI, Heroicons, Lucide React

## License

MIT
