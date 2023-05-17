@echo off
set filename=Markdown-File-%date:~10,4%-%date:~4,2%-%date:~7,2%-%time:~0,2%-%time:~3,2%-%time:~6,2%.md
echo. > "%~dp0%filename%"
start "" "L:\Program Files\Microsoft VS Code\Code.exe" --new-window --new-file "%~dp0%filename%"
