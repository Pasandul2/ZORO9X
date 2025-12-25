@echo off
title Gym Management System - Direct Launch
color 0A
echo.
echo ================================================
echo    Test Gym Management System
echo    Direct Launch
echo ================================================
echo.
echo Checking Python installation...
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed!
    echo.
    pause
    exit /b 1
)

echo Python found! Installing dependencies...
echo.
cd /d "%~dp0basic"
pip install -r requirements.txt --quiet

echo.
echo Starting Gym Management System...
echo.
python gym_app.py
pause
