#!/bin/bash
# 从 .kjlconfig.json 读取 token 并执行酷家乐 skill 脚本
set -euo pipefail
SKILL_DIR="/Users/cjf/.cursor/skills/ai-kujiale-design"
CONFIG="/Users/cjf/my_home/.kjlconfig.json"
TOKEN=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$CONFIG','utf8')).access_token)")
cd "$SKILL_DIR"
exec node "$@"
