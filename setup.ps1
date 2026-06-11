# ördek-lab kurulum sarmalayıcı (Windows PowerShell). Asıl iş setup.mjs'te.
# Kullanım:  ./setup.ps1   ya da   ./setup.ps1 --mode class
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
node (Join-Path $here "setup.mjs") @args
