import { defineModel } from './lib'
import { z } from "zod"
import { open } from 'lmdb'

class Suite {

  constructor(private suites: Record<string, () => void> = {}) {
  }

  add(name: string, f: () => void) {
    this.suites[name] = f
    return this
  }

  run() {
    for (const name of Object.keys(this.suites)) {
      const f = this.suites[name]
      const start = Date.now()
      const ITERS = 10
      for (let i = 0; i < ITERS; i++) {
        f()
      }
      const avg = (Date.now() - start) / ITERS
      console.log(name, avg, 'ms')
    }
  }

}

const suite = new Suite()


{
  const Customer = defineModel({ model: 'Customer' })({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.date(),
  })

  const db = open('./benchdb', {})

  const helper = Customer.helper(db)

  suite.add('writing 1000 Person Records | sync | Brainiac', () => {
    for (let i = 0; i < 1000; i++) {
      helper.put({ $id: `${i}`, dateOfBirth: new Date(), firstName: 'John', lastName: "Wick" })
    }
  })

  suite.add('writing 1000 Person Records | sync | No Brainiac', () => {
    for (let i = 0; i < 1000; i++) {
      db.putSync(`${i}`, { $id: `${i}`, dateOfBirth: new Date(), firstName: 'John', lastName: "Wick" })
    }
  })

  suite.add('writing 1000 Person Records | batched | sync | Brainiac', () => {
    db.transactionSync(() => {
      for (let i = 0; i < 1000; i++) {
        helper.put({ $id: `${i}`, dateOfBirth: new Date(), firstName: 'John', lastName: "Wick" })
      }
    })
  })

  suite.add('writing 1000 Person Records | batched | sync | No Brainiac', () => {
    db.transactionSync(() => {
      for (let i = 0; i < 1000; i++) {
        db.putSync(`${i}`, { $id: `${i}`, dateOfBirth: new Date(), firstName: 'John', lastName: "Wick" })
      }
    })
  })

}

suite.run()
