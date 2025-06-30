@echo off
echo AI Agent Portal - Setup and Run Script
echo =======================================

echo Installing backend dependencies...
venv\Scripts\pip.exe install -r requirements.txt

echo.
echo Installing frontend dependencies...
cd frontend && npm install

echo.
echo Building frontend...
npm run build

echo.
echo Setup complete! To run the application:
echo.
echo 1. Start the backend: venv\Scripts\python.exe main.py
echo.
echo Then access the app at http://localhost:8000
echo.
