import Mustache from 'mustache'
import {readFileSync, writeFileSync} from 'fs'

const output = Mustache.render(
  readFileSync('./Readme.md.mustache', 'utf-8'),
  {
    package: JSON.parse(readFileSync('./package.json', 'utf-8')),
  },
  (partialName: string) => {
    return readFileSync(partialName, 'utf-8')
  }
)

writeFileSync('./Readme.md', output, 'utf-8')
