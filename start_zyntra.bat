@echo off
title Zyntra Development Launcher
echo ====================================================
echo   Zyntra Ultimate Next-gen Aesthetic Intelligence & Runway Assistant
echo ====================================================
echo.
echo Launching all 3 microservices in separate windows...
echo.

:: 1. Express Backend Server
echo [1/3] Launching Express Server (Port 5000)...
start "Zyntra Express Backend (Port 5000)" cmd /k "cd server && npm run dev"

:: 2. Vite React Frontend
echo [2/3] Launching Vite React Client (Port 5173)...
start "Zyntra Vite Frontend (Port 5173)" cmd /k "cd client && npm run dev"

:: 3. FastAPI Python AI Service
echo [3/3] Launching FastAPI AI Service (Port 8000)...
start "Zyntra FastAPI AI Service (Port 8000)" cmd /k "cd ai-service && venv\Scripts\activate && python main.py"

echo.
echo ====================================================
echo   SUCCESS: All services have been launched!
echo.
echo   - Frontend: http://localhost:5173
echo   - Backend: http://localhost:5000
echo   - AI Service: http://localhost:8000
echo.
echo   Leave these terminal windows open. They support
echo   auto-reload (hot-reloading) when files are saved.
echo ====================================================
echo.
pause
