@echo off
title MaktabFaceID Launcher
echo ==============================================
echo       MaktabFaceID Tizimini Ishga Tushirish
echo ==============================================

echo [1/3] Backend (FastAPI) ishga tushirilmoqda...
start "MaktabFaceID - Backend" cmd /k "cd /d "%~dp0backend" && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/3] Frontend (React + Vite) ishga tushirilmoqda...
start "MaktabFaceID - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Kamera mijozi (Camera Client) ishga tushirilmoqda...
start "MaktabFaceID - Camera" cmd /k "cd /d "%~dp0camera_client" && python client.py"

echo ==============================================
echo Barcha xizmatlar alohida oynalarda ochildi!
echo Backend:  http://localhost:8000 (Swagger: /docs)
echo Frontend: http://localhost:5173
echo Login:    admin
echo Parol:    admin123
echo ==============================================
pause