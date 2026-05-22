@echo off
echo Stopping old API server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo Starting API server...
start "Fixla API" cmd /k "cd /d C:\Users\Dell\fixla\apps\api && node index.js"

echo.
echo API started at http://localhost:5000
echo (Tutup window "Fixla API" untuk stop server)
