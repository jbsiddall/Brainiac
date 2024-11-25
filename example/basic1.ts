import {open} from 'lmdb'
import {put, ModelHelper, defineModel} from '../lib'
import {z} from 'zod'

const env = open('mydb', {})

export const Person = defineModel({ model: 'person'})({
  $id: z.string(),
  $model: z.string(),
  name: z.string(),
  age: z.number(),
})

const helper = new ModelHelper(env, Person)
helper.put({name: 'foo', age: 55})

env.getRange().forEach(x => {
  console.log(x)
})
