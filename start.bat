@echo off
echo Starting Fixla...
start "Fixla API" cmd /k "cd /d C:\Users\Dell\fixla\apps\api && node index.js"
timeout /t 2 /nobreak >nul
start "Fixla Web" cmd /k "cd /d C:\Users\Dell\fixla\apps\web && npm run dev"
echo.
echo Both servers starting...
echo API  -> http://localhost:5000
echo Web  -> http://localhost:3000
timeout /t 3 /nobreak >nul
start http://localhost:3000
