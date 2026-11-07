@echo off
title CEA GRENOBLE - WMS LOGISTIQUE 25 ANS
color 0B
echo ========================================================
echo    CEA GRENOBLE - SYSTEME WMS & ERP LOGISTIQUE 25 ANS
echo    Animation "Vis ma vie de logisticien" au scanner
echo ========================================================
echo.
echo [1/2] Demarrage du serveur local WMS...
start "" http://localhost:3000
npm run dev -- --host
