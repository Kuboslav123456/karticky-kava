@echo off
REM ─── Karticky ku kave — spustenie lokalneho dev servera ─────────────
REM Dvojklikom na tento subor sa spusti maly Node HTTP server v tomto
REM priecinku a v prehliadaci sa otvori http://localhost:8765
REM Server zastavis zatvorenim tohto okna alebo stlacenim CTRL+C.

setlocal
title Karticky ku kave - lokalny server

REM Najst Node: najprv v PATH, ak nie tak na standardnom mieste pre Windows.
set "NODE=node"
where node >nul 2>&1
if errorlevel 1 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "NODE=C:\Program Files\nodejs\node.exe"
    ) else (
        echo.
        echo [CHYBA] Node.js sa nenasiel.
        echo Stiahni a nainstaluj z https://nodejs.org/ a skus znova.
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ============================================
echo  Karticky ku kave - dev server
echo  http://localhost:8765
echo ============================================
echo.
echo Pre ukoncenie zatvor toto okno alebo stlac CTRL+C.
echo.

REM Otvor prehliadac (default browser) - server sa nahodi do pol sekundy
start "" "http://localhost:8765"

REM Spusti server. %~dp0 je priecinok, v ktorom sa nachadza tento .bat
"%NODE%" "%~dp0_dev-server.js"

endlocal
