@echo off
title Security Certificate & Compliance Inspection System
cd /D "%~dp0"

echo ==============================================================================
echo  Starting Security Certificate & Compliance Inspection System
echo ==============================================================================
echo.

:: 1. Start FastAPI Backend in a new window
echo [1/2] Starting Python FastAPI Backend Server on http://127.0.0.1:8000 ...
start "Security System - Backend (FastAPI)" cmd /k "cd /D %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: 2. Start React + Vite Frontend in a new window
echo [2/2] Starting React Frontend Server on http://localhost:5173 ...
start "Security System - Frontend (React/Vite)" cmd /k "cd /D %~dp0frontend && npm run dev"

:: 3. Wait a moment and open the browser
timeout /t 3 /nobreak >nul
echo.
echo Opening Application in default browser...
start http://localhost:5173

echo.
echo ==============================================================================
echo  All services launched! 
echo  - Frontend: http://localhost:5173
echo  - Backend API: http://localhost:8000
echo  - API Docs: http://localhost:8000/docs
echo ==============================================================================
