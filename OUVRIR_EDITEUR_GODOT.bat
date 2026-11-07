@echo off
title Ouverture de l'Editeur Godot 4
echo Ouverture de l'editeur Godot 4 pour le projet...
start "" "%~dp0godot\Godot_v4.7.2-stable_win64.exe" -e --path "%~dp0."
exit
