@echo off
setlocal

:: 获取当前脚本的所在路径并存储到变量installerPath中
set "installerPath=%~dp0"

:: 注意：%installerPath% 末尾会有一个反斜杠 \,移除它
set "installerPath=%installerPath:~0,-1%"

:: 清空构建路径
rmdir /S /Q %installerPath%\tmpfolder

endlocal