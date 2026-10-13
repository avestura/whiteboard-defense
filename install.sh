#!/usr/bin/env sh
# Whiteboard Defense installer for Claude Code, Codex, and OpenCode.
#
#   curl -fsSL https://raw.githubusercontent.com/avestura/whiteboard-defense/main/install.sh | sh
#   curl -fsSL .../install.sh | sh -s -- claude          # one agent
#   curl -fsSL .../install.sh | sh -s -- claude codex    # several
#   ./install.sh --uninstall
#
# Agents: claude, codex, opencode, all (default: every agent found on PATH).
set -eu

REPO="avestura/whiteboard-defense"
REF="${WHITEBOARD_REF:-main}"
SKILL="whiteboard"

say() { printf '%s\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

uninstall=0
agents=""
for a in "$@"; do
  case "$a" in
    --uninstall) uninstall=1 ;;
    -h|--help) sed -n '2,10p' "$0" 2>/dev/null || true; exit 0 ;;
    all) agents="claude codex opencode" ;;
    claude|codex|opencode) agents="$agents $a" ;;
    *) say "unknown argument: $a"; exit 2 ;;
  esac
done

if [ -z "$agents" ]; then
  have claude && agents="$agents claude"
  have codex && agents="$agents codex"
  have opencode && agents="$agents opencode"
  if [ -z "$agents" ]; then
    say "No supported agent found on PATH (claude, codex, opencode)."
    say "Name one explicitly, e.g.: sh install.sh codex"
    exit 1
  fi
fi

# Locate the source tree: a local checkout if we are in one, else download.
here=""
case "$0" in
  */install.sh|install.sh) here="$(cd "$(dirname "$0")" 2>/dev/null && pwd || true)" ;;
esac
tmp=""
if [ -n "$here" ] && [ -d "$here/plugins/whiteboard-defense/skills/$SKILL" ]; then
  src="$here"
else
  have curl && have tar || { say "curl and tar are required."; exit 1; }
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  say "Downloading $REPO@$REF ..."
  curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$REF" | tar -xz -C "$tmp" --strip-components=1
  src="$tmp"
fi

skill_src="$src/plugins/whiteboard-defense/skills/$SKILL"
shared_skills="$HOME/.agents/skills"   # read by both Codex and OpenCode
oc_commands="${XDG_CONFIG_HOME:-$HOME/.config}/opencode/commands"

install_shared_skill() {
  mkdir -p "$shared_skills"
  rm -rf "$shared_skills/$SKILL"
  cp -R "$skill_src" "$shared_skills/$SKILL"
  say "  skill  -> $shared_skills/$SKILL"
}

for agent in $agents; do
  say "[$agent]"
  case "$agent" in
    claude)
      have claude || { say "  claude not found on PATH, skipping"; continue; }
      if [ "$uninstall" = 1 ]; then
        claude plugin uninstall whiteboard-defense@whiteboard-defense || true
        claude plugin marketplace remove whiteboard-defense || true
      else
        claude plugin marketplace add "$REPO"
        claude plugin install whiteboard-defense@whiteboard-defense
        say "  installed. Use /whiteboard-defense:whiteboard"
      fi ;;
    codex)
      if [ "$uninstall" = 1 ]; then rm -rf "$shared_skills/$SKILL"; say "  removed"
      else install_shared_skill; say "  installed. Use \$whiteboard (restart Codex if it does not appear)"; fi ;;
    opencode)
      if [ "$uninstall" = 1 ]; then
        rm -rf "$shared_skills/$SKILL" "$oc_commands/whiteboard.md"; say "  removed"
      else
        install_shared_skill
        mkdir -p "$oc_commands"
        cp "$src/opencode/commands/whiteboard.md" "$oc_commands/whiteboard.md"
        say "  command-> $oc_commands/whiteboard.md"
        say "  installed. Use /whiteboard"
      fi ;;
  esac
done
say "Done."
