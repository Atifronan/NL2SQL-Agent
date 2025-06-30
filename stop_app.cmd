@echo off
echo AI Agent Portal - Stopping Application
echo ====================================
echo.

echo Stopping Node.js (React Frontend) processes...
taskkill /f /im node.exe /t

echo.
echo Stopping Python (Backend) processes...
:: Note: This will stop all Python processes, so use with caution if running other Python apps
taskkill /f /im python.exe /t

echo.
echo Application stopped.
echo.
