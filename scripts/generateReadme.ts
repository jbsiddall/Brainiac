import Mustache from 'mustache'
import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

async function main() {
  const stdout = execSync("pnpm dlx tsx ./bench.ts", { encoding: 'utf-8' })

  const output = Mustache.render(
    readFileSync('./Readme.md.mustache', 'utf-8'),
    {
      package: JSON.parse(readFileSync('./package.json', 'utf-8')),
      benchmarks: stdout
    },
    (partialName: string) => {
      return readFileSync(partialName, 'utf-8')
    }
  )

  writeFileSync('./Readme.md', output, 'utf-8')

}


main()
