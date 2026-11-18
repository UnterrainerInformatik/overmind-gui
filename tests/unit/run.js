/*
 * Minimal, dependency-free unit-test runner.
 *
 * - Registers a require hook so `.ts` files from src/ load in plain node: each
 *   file is compiled with `typescript.transpileModule` (CommonJS, ES2019).
 *   No type checking happens here; `npm run build` does that.
 * - Exposes a global `test(name, fn)` collector. Test files use node's built-in
 *   `assert`.
 * - Requires every `*.test.js` below tests/unit, runs the collected tests in
 *   order and exits non-zero if any fails.
 *
 * Run with `npm run test:unit`.
 */
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

// Deprecated but still the simplest dependency-free hook, and stable in node 14+.
// eslint-disable-next-line node/no-deprecated-api
require.extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true
    },
    fileName: filename
  })
  module._compile(outputText, filename)
}

const tests = []
let currentFile = null
global.test = function (name, fn) {
  tests.push({ name, fn, file: currentFile })
}

function findTests (dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return findTests(full)
    }
    return entry.name.endsWith('.test.js') ? [full] : []
  })
}

for (const file of findTests(__dirname).sort()) {
  currentFile = path.relative(__dirname, file)
  require(file)
}

async function run () {
  let failed = 0
  for (const t of tests) {
    try {
      await t.fn()
      console.log(`  ok   ${t.file} > ${t.name}`)
    } catch (e) {
      failed++
      console.log(`  FAIL ${t.file} > ${t.name}`)
      console.log('       ' + String(e && e.stack ? e.stack : e).split('\n').join('\n       '))
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`)
  process.exitCode = failed > 0 ? 1 : 0
}

run()
