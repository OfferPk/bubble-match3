@echo off
cd /d "%~dp0"
echo Starting Bubble Match-3 on http://localhost:4175
echo Close this window to stop the server.
where py >nul 2>nul && (
  start "" http://localhost:4175
  py -m http.server 4175
  goto :eof
)
where python >nul 2>nul && (
  start "" http://localhost:4175
  python -m http.server 4175
  goto :eof
)
echo Python not found. Open index.html in your browser instead.
start "" "%~dp0index.html"
pause
