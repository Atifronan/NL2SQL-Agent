@echo off
echo AI Agent Portal - Starting Frontend and Backend
echo ==============================================
echo.

:: Start backend server in a new terminal window
start cmd /k "cd /d "%~dp0" && echo Starting AI Agent Backend && venv\Scripts\python.exe main.py"

:: Wait a moment for the backend to initialize
timeout /t 3 > nul

:: Start frontend in a new terminal window
start cmd /k "cd /d "%~dp0\frontend" && echo Starting React Frontend && npm start"

echo.
echo The application is starting:
echo - Backend server will be available at http://127.0.0.1:8000
echo - Frontend will be available at http://localhost:3000
echo.
echo You can close this window, but keep the other terminal windows open to keep the application running.
echo To stop the application, close both terminal windows.
