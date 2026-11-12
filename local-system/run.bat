@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Install Python 3.11 or newer from python.org and enable the Python launcher.
  pause
  exit /b 1
)
if not exist .venv\Scripts\python.exe py -3 -m venv .venv
if errorlevel 1 goto :failed
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto :failed
.venv\Scripts\python.exe manage.py init
if errorlevel 1 goto :failed
echo Open http://127.0.0.1:5000 in your browser. Press Ctrl+C to stop.
.venv\Scripts\python.exe app.py
pause
exit /b
:failed
echo Setup failed. Check the message above. No sample prices are substituted.
pause
exit /b 1