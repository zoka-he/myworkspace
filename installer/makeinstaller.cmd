@echo off
setlocal

:: 获取当前脚本的所在路径并存储到变量installerPath中
set "installerPath=%~dp0"
:: 注意：%installerPath% 末尾会有一个反斜杠 \,移除它
set "installerPath=%installerPath:~0,-1%"
:: 定义其他需要用到的目录
set "projPath=%installerPath%\.."
set "appPath=%installerPath%\tmpfolder\app"

:: 打印变量以验证
echo installer path: %installerPath%

:: 清空构建路径
rmdir /S /Q %installerPath%\tmpfolder
mkdir %installerPath%\tmpfolder
del /q %installerPath%\my-worksite.tar.gz

:: 创建应用目录
mkdir %appPath%

:: 复制资源到应用目录
mkdir %appPath%\public
xcopy %projPath%\public %appPath%\public /E /I /H /C /Y
xcopy %projPath%\.next\standalone %appPath% /E /I /H /C /Y
mkdir %appPath%\.next\static
xcopy %projPath%\.next\static %appPath%\.next\static /E /I /H /C /Y
copy %projPath%\launch.sh %appPath%

:: 以intaller\tmpfolder文件夹作为上下文压缩版本包
tar -zcvf %installerPath%\my-worksite.tar.gz -C %installerPath%\tmpfolder .

:: 清空构建路径
rmdir /S /Q %installerPath%\tmpfolder

endlocal