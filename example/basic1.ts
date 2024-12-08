import { open } from 'lmdb'
import { defineModel, defineSchema } from '../lib'
import { z } from 'zod'

const env = open('mydb', {})

const Person = defineModel({
  name: z.string(),
  age: z.number(),
})


const Schema = defineSchema({
  Person
})

const models = Schema({ db: env })


models.Person.put({ name: 'foo', age: 55 })

env.getRange().forEach(x => {
  console.log(x)
})
