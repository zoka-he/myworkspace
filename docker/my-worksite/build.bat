@echo off
chcp 936 > nul

REM Get the current file's directory
set "current_file=%~f0"
set "current_file_dir=%~dp0"

REM Change to project root directory
cd /d "%~dp0..\.."

REM Store root directory
set "root_dir=%CD%"
set "current_file_dir=%root_dir%\docker\my-worksite"

echo 工程目录是: %root_dir%

REM Export requirements
pip freeze > "%current_file_dir%\requirements.txt"

REM Build Docker image
set "version_tag=latest"
docker build -f "%current_file_dir%\Dockerfile" -t my-worksite:%version_tag% .
