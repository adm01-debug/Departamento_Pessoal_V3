@echo off
rem Instala o coletor do ponto como tarefa agendada (a cada 10 minutos, todos os dias).
rem Rode com o MESMO usuario do Windows que vai executar a tarefa: o token e a senha
rem do banco ficam cifrados para esse usuario e nao abrem em outro.
setlocal
cd /d "%~dp0"

python -c "import struct,sys; sys.exit(0 if struct.calcsize('P')*8==32 else 1)" 2>nul
if errorlevel 1 (
  echo [FALHA] Precisa do Python de 32 bits no PATH. Baixe o instalador "Windows installer (32-bit)" em python.org.
  pause & exit /b 1
)

if not exist "%~dp0config.json" (
  python "%~dp0coletor.py" --configurar
  if errorlevel 1 ( echo [FALHA] Configuracao nao concluida. & pause & exit /b 1 )
)

python "%~dp0coletor.py" --diagnostico
if errorlevel 1 ( echo [FALHA] Corrija os itens acima e rode de novo. & pause & exit /b 1 )

for /f "delims=" %%i in ('where python') do ( set "PY=%%i" & goto :achou )
:achou
schtasks /create /f /tn "DP_V3_Coletor_Ponto" /sc minute /mo 10 /tr "\"%PY%\" \"%~dp0coletor.py\"" >nul
if errorlevel 1 ( echo [FALHA] Nao foi possivel criar a tarefa agendada. & pause & exit /b 1 )

echo.
echo Instalado. A tarefa "DP_V3_Coletor_Ponto" roda a cada 10 minutos.
echo Log: %~dp0coletor.log
pause
