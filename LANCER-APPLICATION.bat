@echo off
title Subscription Manager & Robot Netflix
color 0A
echo ========================================================
echo    LANCEMENT DE SUBSCRIPTION MANAGER & ROBOT NETFLIX
echo ========================================================
echo.
echo 1. Demarrage du serveur local...
start "Serveur SubManager" /min node server.js
timeout /t 2 >nul
echo 2. Ouverture de votre tableau de bord...
start http://localhost:3000
echo.
echo Tout est pret ! Vous pouvez minimiser cette fenetre.
echo ========================================================
pause
