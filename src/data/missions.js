export const missions = [
  {
    id: 'first-note',
    title: 'Leave yourself a note',
    badge: 'Note Taker',
    objective: 'Create a text file containing a message. Read it back to check your work.',
    hint: 'Use New-Item to create the file. Set-Content writes the message; Get-Content checks it.',
    steps: [
      { label: 'Create the file', command: 'New-Item -ItemType File -Path mission-note.txt' },
      { label: 'Write a message', command: 'Set-Content -Path mission-note.txt -Value "Small steps make strong scripts."' },
      { label: 'Read it back', command: 'Get-Content mission-note.txt' },
    ],
    verify(vfs) {
      const result = vfs.read('mission-note.txt', '')
      return !result.error && result.content.includes('Small steps make strong scripts.')
    },
  },
  {
    id: 'tidy-project',
    title: 'Tidy a tiny project',
    badge: 'Folder Organizer',
    objective: 'Make a project folder, add an idea file, then rename it to a plan.',
    hint: 'Create the folder before the file. Rename-Item changes the name but keeps the file in its folder.',
    steps: [
      { label: 'Make a folder', command: 'New-Item -ItemType Directory -Path mission-lab' },
      { label: 'Add an idea file', command: 'Set-Content -Path mission-lab/idea.txt -Value "Build a helpful tool"' },
      { label: 'Rename it', command: 'Rename-Item -Path mission-lab/idea.txt -NewName plan.txt' },
    ],
    verify(vfs) {
      const result = vfs.read('mission-lab/plan.txt', '')
      return !result.error && result.content.includes('Build a helpful tool')
    },
  },
  {
    id: 'json-snapshot',
    title: 'Save a tiny data snapshot',
    badge: 'Data Keeper',
    objective: 'Create a JSON file and save a small object-shaped record as text.',
    hint: 'The simulator stores text files. Keep the braces and quotes around JSON keys and values.',
    steps: [
      { label: 'Create valid JSON text', command: "Set-Content -Path mission-data.json -Value '{\"topic\":\"PowerShell\",\"level\":\"curious\"}'" },
      { label: 'Inspect your data', command: 'Get-Content mission-data.json -Raw' },
      { label: 'Keep a copy', command: 'Export-File -Path mission-data.json -Json' },
    ],
    verify(vfs) {
      const result = vfs.read('mission-data.json', '')
      if (result.error) return false
      try {
        const data = JSON.parse(result.content)
        return data.topic === 'PowerShell' && data.level === 'curious'
      } catch {
        return false
      }
    },
  },
]
