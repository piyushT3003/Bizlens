@echo off
title BizLens Enterprise Launcher
cd /d "%~dp0"

echo ========================================================
echo   BizLens - Autonomous BI Engine & Intelligence
echo ========================================================
echo.
echo Starting BizLens via python app.py...
python app.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [BizLens] Application exited.
    pause
)
