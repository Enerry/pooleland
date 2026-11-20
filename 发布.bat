@echo off
chcp 65001 >nul
cd /d "%~dp0"
python "tools\publish_post.py" preview
set /p ok=Type Y to confirm, otherwise press Enter: 
if /i "%ok%"=="Y" python "tools\publish_post.py" commit
echo.
pause
