@echo off
REM Restaurant Electron App Setup Script
REM For Windows

echo ==========================================
echo Restaurant Electron App Setup
echo ==========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
node -v
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)
npm -v
echo.

REM Check if PostgreSQL is installed
echo Checking PostgreSQL installation...
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] PostgreSQL is not found in PATH
    echo Please ensure PostgreSQL is installed and running
    echo Download from: https://www.postgresql.org/download/
) else (
    echo PostgreSQL is installed
)
echo.

REM Install root dependencies
echo Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)

REM Build React app
echo.
echo Building React application...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build React application
    pause
    exit /b 1
)

REM Go back to root
cd ..

REM Install backend dependencies
echo.
echo Installing backend dependencies...
cd app
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

REM Create .env file if it doesn't exist
echo.
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo [WARNING] Please edit .env file with your PostgreSQL credentials
) else (
    echo .env file already exists
)

REM Database setup instructions
echo.
echo ==========================================
echo Database Setup
echo ==========================================
echo Please ensure PostgreSQL is running and create the database:
echo.
echo   createdb myapp
echo.
echo Or using psql:
echo   psql -U postgres
echo   CREATE DATABASE myapp;
echo   \q
echo.

echo ==========================================
echo Setup completed successfully!
echo ==========================================
echo.
echo Next steps:
echo 1. Edit .env file with your database credentials
echo 2. Create PostgreSQL database: createdb myapp
echo 3. Run the application: npm start
echo.

pause