# Whiteboard Defense installer for Claude Code, Codex, and OpenCode (Windows / PowerShell).
#
#   irm https://raw.githubusercontent.com/avestura/whiteboard-defense/main/install.ps1 | iex
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/avestura/whiteboard-defense/main/install.ps1))) claude codex
#   .\install.ps1 -Uninstall
#
# Agents: claude, codex, opencode, all (default: every agent found on PATH).
param(
  [switch]$Uninstall,
  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Agent
)
$ErrorActionPreference = 'Stop'

$Repo = 'avestura/whiteboard-defense'
$Ref = if ($env:WHITEBOARD_REF) { $env:WHITEBOARD_REF } else { 'main' }
$Skill = 'whiteboard'

function Has($n) { [bool](Get-Command $n -ErrorAction SilentlyContinue) }

$agents = @()
foreach ($a in $Agent) {
  if ($a -eq 'all') { $agents += 'claude', 'codex', 'opencode' }
  elseif ($a -in 'claude', 'codex', 'opencode') { $agents += $a }
  else { throw "unknown agent: $a" }
}
if (-not $agents) {
  foreach ($n in 'claude', 'codex', 'opencode') { if (Has $n) { $agents += $n } }
  if (-not $agents) { throw 'No supported agent found on PATH (claude, codex, opencode). Name one explicitly.' }
}

# Local checkout, or download the repo archive.
$here = if ($PSScriptRoot) { $PSScriptRoot } else { $null }
$tmp = $null
if ($here -and (Test-Path (Join-Path $here "plugins/whiteboard-defense/skills/$Skill"))) {
  $src = $here
} else {
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ("wbd-" + [guid]::NewGuid())
  New-Item -ItemType Directory $tmp | Out-Null
  $zip = Join-Path $tmp 'repo.zip'
  Write-Host "Downloading $Repo@$Ref ..."
  Invoke-WebRequest "https://codeload.github.com/$Repo/zip/$Ref" -OutFile $zip
  Expand-Archive $zip -DestinationPath $tmp
  $src = (Get-ChildItem $tmp -Directory | Select-Object -First 1).FullName
}

$skillSrc = Join-Path $src "plugins/whiteboard-defense/skills/$Skill"
$shared = Join-Path $HOME '.agents/skills'
$ocCommands = Join-Path $HOME '.config/opencode/commands'

function Install-Shared {
  New-Item -ItemType Directory -Force $shared | Out-Null
  $dest = Join-Path $shared $Skill
  if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
  Copy-Item -Recurse $skillSrc $dest
  Write-Host "  skill  -> $dest"
}

try {
  foreach ($a in ($agents | Select-Object -Unique)) {
    Write-Host "[$a]"
    switch ($a) {
      'claude' {
        if (-not (Has 'claude')) { Write-Host '  claude not found on PATH, skipping'; break }
        if ($Uninstall) {
          claude plugin uninstall whiteboard-defense@whiteboard-defense
          claude plugin marketplace remove whiteboard-defense
        } else {
          claude plugin marketplace add $Repo
          claude plugin install whiteboard-defense@whiteboard-defense
          Write-Host '  installed. Use /whiteboard-defense:whiteboard'
        }
      }
      'codex' {
        if ($Uninstall) { Remove-Item -Recurse -Force (Join-Path $shared $Skill) -ErrorAction SilentlyContinue; Write-Host '  removed' }
        else { Install-Shared; Write-Host '  installed. Use $whiteboard (restart Codex if it does not appear)' }
      }
      'opencode' {
        if ($Uninstall) {
          Remove-Item -Recurse -Force (Join-Path $shared $Skill), (Join-Path $ocCommands 'whiteboard.md') -ErrorAction SilentlyContinue
          Write-Host '  removed'
        } else {
          Install-Shared
          New-Item -ItemType Directory -Force $ocCommands | Out-Null
          Copy-Item (Join-Path $src 'opencode/commands/whiteboard.md') (Join-Path $ocCommands 'whiteboard.md') -Force
          Write-Host "  command-> $ocCommands/whiteboard.md"
          Write-Host '  installed. Use /whiteboard'
        }
      }
    }
  }
  Write-Host 'Done.'
} finally {
  if ($tmp -and (Test-Path $tmp)) { Remove-Item -Recurse -Force $tmp }
}
