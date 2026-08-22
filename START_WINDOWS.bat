@echo off
cd /d "%~dp0"
echo ============================================
echo R&D ERP FINAL v15 - 4 PEOPLE / DEPARTMENT
echo ============================================
if not exist venv (
  py -3.12 -m venv venv
)
venv\Scripts\python.exe -m pip install -r requirements.txt
if not exist .env copy .env.example .env
venv\Scripts\python.exe scripts\seed.py
echo.
echo Example:
echo Login: rd1 / rd11234
echo RD department PIN: 1201
echo RD person 1 PIN: 211
echo.
venv\Scripts\python.exe -m uvicorn app.main:app --reload
pause
