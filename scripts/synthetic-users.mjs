import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateSyntheticUsers } from '../src/lib/syntheticUserGenerator.ts'
import { SYNTHETIC_USERS_MARKER } from '../src/lib/syntheticQaUsers.ts'

export { generateSyntheticUsers } from '../src/lib/syntheticUserGenerator.ts'
export { generateModerationDemoUsers } from '../src/lib/syntheticUserGenerator.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_DIR = path.join(ROOT, '.local-qa')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'synthetic-users.json')
const MARKER = SYNTHETIC_USERS_MARKER

function parseArgs(argv) {
  const [command = 'generate', ...args] = argv
  const options = { command, local: false, count: 450, seed: 20261128 }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--local') options.local = true
    else if (arg === '--count') options.count = Number(args[++index])
    else if (arg === '--seed') options.seed = Number(args[++index])
    else throw new Error(`Tùy chọn không được hỗ trợ: ${arg}`)
  }
  if (!options.local) throw new Error('Bị từ chối: lệnh phải có cờ --local.')
  return options
}

async function loadExisting() {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_FILE, 'utf8'))
    if (parsed.marker !== MARKER || !Array.isArray(parsed.users)) {
      throw new Error('Tệp không có dấu nhận diện dataset do BOOKI tạo.')
    }
    return parsed
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    console.error('Ví dụ: npm run qa:users -- --count 450 --seed 42')
    process.exitCode = 1
    return
  }

  if (options.command === 'generate') {
    const users = generateSyntheticUsers({ count: options.count, seed: options.seed })
    await mkdir(OUTPUT_DIR, { recursive: true })
    await writeFile(OUTPUT_FILE, `${JSON.stringify({
      marker: MARKER,
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Ho_Chi_Minh',
      seed: options.seed,
      users,
    }, null, 2)}\n`, { flag: 'w' })
    console.log(`Đã tạo ${users.length} hồ sơ tổng hợp tại .local-qa/synthetic-users.json. Không ghi vào Supabase/Auth và không gửi email.`)
    return
  }

  if (options.command === 'inspect') {
    const dataset = await loadExisting()
    console.log(dataset
      ? `Dataset hợp lệ: ${dataset.users.length} hồ sơ tổng hợp, múi giờ ${dataset.timezone}, seed ${dataset.seed}.`
      : 'Chưa có dataset tổng hợp cục bộ.')
    return
  }

  if (options.command === 'clean') {
    const dataset = await loadExisting()
    if (!dataset) {
      console.log('Không có dataset tổng hợp cục bộ để xóa.')
      return
    }
    await rm(OUTPUT_FILE)
    console.log(`Đã xóa đúng tệp dataset tổng hợp (${dataset.users.length} hồ sơ). Không có thao tác nào trên Supabase/Auth.`)
    return
  }

  throw new Error('Lệnh hợp lệ: generate, inspect, clean.')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Không thể xử lý dataset: ${error.message}`)
    process.exitCode = 1
  })
}
