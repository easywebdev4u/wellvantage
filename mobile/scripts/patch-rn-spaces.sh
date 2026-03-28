#!/bin/bash
# Patches React Native scripts to handle paths with spaces.
# Runs automatically via postinstall.

RN_DIR="node_modules/react-native"

# 1. Fix with-environment.sh: quote $1 execution
ENVSH="$RN_DIR/scripts/xcode/with-environment.sh"
if [ -f "$ENVSH" ]; then
  sed -i '' 's/^  \$1$/  "$@"/' "$ENVSH"
  echo "  Patched: with-environment.sh"
fi

# 2. Fix script_phases.rb: remove /bin/sh -c wrapper that breaks on spaces
RBFILE="$RN_DIR/scripts/react_native_pods_utils/script_phases.rb"
if [ -f "$RBFILE" ]; then
  python3 -c "
p = '$RBFILE'
with open(p) as f: lines = f.readlines()
for i, line in enumerate(lines):
    if 'WITH_ENVIRONMENT' in line and 'SCRIPT_PHASES_SCRIPT' in line and '/bin/sh' in line:
        lines[i] = '        \"\\\$WITH_ENVIRONMENT\" \"\\\$SCRIPT_PHASES_SCRIPT\"\n'
with open(p, 'w') as f: f.writelines(lines)
"
  echo "  Patched: script_phases.rb"
fi

echo "RN space-in-path patches applied."
