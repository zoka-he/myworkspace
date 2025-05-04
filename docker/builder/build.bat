@echo off

rem Get the directory of the current script
set "current_file=%~dp0"

rem Change to project root directory
cd %current_file%..\..

set "root_dir=%cd%"
set "current_file_dir=%root_dir%\docker\builder"

echo Project directory is: %root_dir%

docker build -f %current_file_dir%\Dockerfile -t my-worksite-builder:latest .
