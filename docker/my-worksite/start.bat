@echo off
chcp 936 > nul

REM Get version tag from git
@REM for /f "tokens=2 delims=:" %%a in ('git log -1 --decorate^=short --oneline ^| findstr "tag:"') do set v_tag=%%a
@REM if "%v_tag%"=="" set v_tag=latest
@REM set v_tag=%v_tag:)=%
@REM set v_tag=%v_tag:,=%
for /f "tokens=*" %%i in ('git log -1 --decorate^=short --oneline ^| findstr /r "tag:"') do (
    for /f "tokens=2 delims=:" %%a in ("%%i") do (
        set "v_tag=%%a"
        set "v_tag=!v_tag:)=!"
        set "v_tag=!v_tag:,=!"
        goto :found_tag
    )
)
set v_tag=latest
:found_tag

echo 版本号是: %v_tag%

echo 正在停止my-worksite容器...
docker stop my-worksite
timeout /t 5 /nobreak > nul

echo 正在删除my-worksite容器...
docker rm my-worksite 
timeout /t 5 /nobreak > nul

echo 正在创建my-worksite容器...
docker run -itd --name my-worksite -p 23001:3000 my-worksite:%v_tag%
