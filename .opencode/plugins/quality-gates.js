// Local quality gates for opencode.
//
// Mirrors the hook pattern from M03E03: trigger (file edited) -> matcher
// (Python file) -> handler (ruff lint, then mypy typecheck) -> signal
// (failures are appended to the tool output so the agent sees them and can
// self-correct in the next turn).
//
// Layers:
//   per-edit   -> ruff on the edited .py file (fast)
//   per-edit   -> mypy on the whole project (small repo, ~1s)
//   pre-commit -> tests (too slow for per-edit; wired in .githooks/)

const RUFF = ".venv/Scripts/ruff.exe"
const MYPY = ".venv/Scripts/mypy.exe"

function isPythonFile(filePath) {
  return typeof filePath === "string" && filePath.endsWith(".py") && !filePath.includes(".venv")
}

export const QualityGates = async ({ client, $, directory, worktree }) => {
  return {
    "tool.execute.after": async (input, output) => {
      if (input.tool !== "edit" && input.tool !== "write") return
      const filePath = input.args?.filePath
      if (!isPythonFile(filePath)) return

      const messages = []

      const lint = await $`"${directory}/${RUFF}" check "${filePath}"`.cwd(directory).nothrow()
      if (lint.exitCode !== 0) {
        messages.push(`[quality-gates] ruff failed on ${filePath}:\n${lint.stderr}`)
      }

      const typecheck = await $`"${directory}/${MYPY}" apps soma_config manage.py`.cwd(directory).nothrow()
      if (typecheck.exitCode !== 0) {
        messages.push(`[quality-gates] mypy failed:\n${typecheck.stdout}`)
      }

      if (messages.length > 0) {
        await client.app.log({
          body: { service: "quality-gates", level: "error", message: messages.join("\n") },
        })
        output.output += `\n\n${messages.join("\n\n")}`
      }
    },
  }
}
