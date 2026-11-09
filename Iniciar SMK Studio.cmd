@echo off
cd /d "%~dp0"
call npx electron-vite build >nul 2>&1
start "" npx electron-vite preview --skipBuild
