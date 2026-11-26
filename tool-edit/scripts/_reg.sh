cd "D:/dự án antigravity/full studio/fullstudio/tool-edit"
export TOOL_EDIT_AUTO_APPLY=0 TOOL_EDIT_PROJECTS_DIR=out/projects-fresh26 TOOL_EDIT_CDP_PORT=9333 TOOL_EDIT_DEV_API=1
for t in "$@"; do
  pid=$(netstat -ano | grep ":17480 " | grep LISTEN | awk '{print $5}' | head -1); [ -n "$pid" ] && taskkill //PID $pid //F >/dev/null; sleep 2
  (npx electron . >/dev/null 2>&1 &) ; sleep 9
  echo "== $t"; node scripts/$t.mjs 2>&1 | grep -E "FAIL|Error|passed|[0-9]+ ok|pass" | tail -5
done
