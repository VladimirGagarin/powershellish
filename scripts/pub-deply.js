import { spawnSync } from 'node:child_process'

const commitMessage = process.argv.slice(2).join(' ').trim()

if (!commitMessage) {
  console.error('Add a commit message, for example: npm run pub-deply -- "Improve terminal help"')
  process.exit(1)
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' })

  if (result.error) {
    console.error(result.error.message)
    process.exit(1)
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run('git', ['add', '.'])
run('git', ['commit', '-m', commitMessage])
run('git', ['push'])
run(process.execPath, [process.env.npm_execpath, 'run', 'deploy'])
