@echo off
echo AI Agent Portal - Update and Build
echo =================================
echo.

echo Installing backend dependencies...
pip install -r requirements.txt

echo.
echo Updating frontend dependencies...
cd frontend && npm install

echo.
echo Build complete!
echo Run 'run_app.cmd' to start the application.
echo.
