$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
& "$PSScriptRoot\.venv\Scripts\python.exe" -u manage.py runserver 0.0.0.0:8000 --noreload
exit $LASTEXITCODE
