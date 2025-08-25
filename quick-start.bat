@echo off
echo Starting backend and frontend services...

echo Starting backend...
start "Backend" cmd /k "cd backend && npm run dev"

ping localhost -n 4 >nul

echo Starting frontend...  
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Services started!
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:8080
pause