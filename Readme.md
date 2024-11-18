# Brainiac

What:

Sugar for LMDB. You can still sue lmdb exeactly how you want but have some extra structures on top.

Features:
* typescript
* zod validated orm
* records
* good readme with examples
* migrations

Migration
migrations arn't sql, they're zod transformations.

your entire zod schema is in schema.ts. 
copy the schema from schema.ts to schema-<date>.ts
edit schema.ts to make the change you want.

```
example - schema change

// schema.ts
const Person = z.object({
    name: z.string()
})


const Schema = z.object({
    version: z.literal('2024-08-19'),
    Person,
})

// you want to split out name to be first and last name
// * rename Schema to be Schema20240819
// then:

const Schema = Schema20240819.transform(old => {
})
```

## Examples


```ts
import {z} from 'zod'
import {defineModel} from '../lib'


export const Person = defineModel({name: 'person'})(z.object({
  name: z.string(),
  age: z.number(),
}))

const env = open('mydb', {})

// full type checking on database entry
put({db: env, type: Person, id: '10', value: {name: 'joseph', age: 33}})

env.getRange().forEach(x => {
  console.log(x)
}) // => { key: 'person:10', value: { name: 'joseph', age: 33 } }
```

lets pull the record back out:

```ts

// value is fully type checked of type person with runtime data validation with zod
const value = get({db: env, type: Person, id: '10'})
console.log(value) // => { key: 'person:10', value: { name: 'joseph', age: 33 } }
```
