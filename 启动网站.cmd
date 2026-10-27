@echo off
cd /d "%~dp0"
echo Open http://127.0.0.1:8000/ in your browser.
echo Keep this window open while using the website. Press Ctrl+C to stop.
"%~dp0.venv\Scripts\python.exe" -u manage.py runserver 0.0.0.0:8000 --noreload
pause
