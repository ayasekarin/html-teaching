@echo off
setlocal enabledelayedexpansion

set GRADLE_VERSION=8.10.2
set DIST_URL=https://services.gradle.org/distributions/gradle-8.10.2-bin.zip

set BASE_DIR=%~dp0
set GRADLE_DIR=%BASE_DIR%\.gradle-lite
set DIST_ZIP=%GRADLE_DIR%\gradle-%GRADLE_VERSION%-bin.zip
set DIST_HOME=%GRADLE_DIR%\gradle-%GRADLE_VERSION%

if not exist "%GRADLE_DIR%" mkdir "%GRADLE_DIR%"

if not exist "%DIST_HOME%\bin\gradle.bat" (
  echo [gradlew-lite] Gradle %GRADLE_VERSION% not found. Downloading...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Invoke-WebRequest -Uri '%DIST_URL%' -OutFile '%DIST_ZIP%'" || exit /b 1

  echo [gradlew-lite] Unzipping...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Expand-Archive -Force '%DIST_ZIP%' '%GRADLE_DIR%'" || exit /b 1
)

call "%DIST_HOME%\bin\gradle.bat" %*
