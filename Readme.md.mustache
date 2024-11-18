# 🧠 Brainiac

> A lightweight, type-safe ORM for LMDB with Zod validation and schema migrations

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/brainiac.svg)](https://badge.fury.io/js/brainiac)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)

Brainiac is a TypeScript-first ORM for LMDB that brings the safety and convenience of modern tooling to the lightning-fast LMDB key-value store. It combines the simplicity of a key-value store with the safety of strong typing and schema validation.

## ✨ Features

- 🏃‍♂️ **Zero Runtime Overhead** - Brainiac is designed to be as thin as possible while providing maximum safety
- 🔒 **Type-Safe by Default** - Full TypeScript support with inferred types from your schemas
- ✅ **Runtime Validation** - Zod schemas ensure your data is always valid, both reading and writing
- 🔄 **Safe Migrations** - Transaction-based migrations with automatic validation of affected models
- 🤝 **Hybrid Usage** - Use LMDB directly alongside Brainiac when you need to
- 📦 **Lightweight** - No heavy dependencies, just LMDB + Zod

## 🚀 Quick Start

```bash
npm install jbsiddall/Brainiac lmdb zod
```

```typescript
import { open } from 'lmdb'
import { defineModel } from 'Brainiac'
import { z } from 'zod'

// Define your model with type-safe schema
const Person = defineModel({ model: 'person' })({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
  createdAt: z.date()
})

// Open LMDB database
const db = open('mydb')

// Create a helper for working with Person records
const people = Person.helper(db)

// Create a new person
people.put({
  name: "Alice",
  age: 30,
  email: "alice@example.com",
  createdAt: new Date()
})

// Fetch all people
for (const person of people.all()) {
  console.log(person.value.name) // Fully typed!
}
```

## 🛡️ Safety First

Brainiac is built with data integrity as the top priority:

### Schema Validation
Every record is validated against its Zod schema both when reading and writing:

```typescript
// This will throw a validation error!
people.put({
  name: "Bob",
  age: "not a number", // Type error + runtime validation error
  email: "invalid-email",
  createdAt: "2023" // Not a Date object
})
```

### Record Identity Protection
Each record stored includes its model type and ID, preventing accidental cross-model data access:

```typescript
const value = db.get('person:123') // Raw LMDB access
if (value.$model !== 'person') {
  throw new Error('Retrieved wrong model type!')
}
```

### Transaction-Safe Migrations

Migrations in Brainiac are simple yet powerful. Here's a complete example:

```typescript
import { defineModel, migrate, Migration } from 'Brainiac'
import { z } from 'zod'
import { open } from 'lmdb'

const Product = defineModel({ model: 'product' })({
  name: z.string(),
  price: z.number(),
})

const baseMigration = {
  name: 'populate_products',
  migration({ db }) {
    const product = Product.helper(db)
    product.put({ name: 'milk', price: 1.25 })
    product.put({ name: 'cheese', price: 3 })
  }
} satisfies Migration

const db = open('mydb', {})
migrate(db, [baseMigration])
```

## 🤝 Hybrid Usage

Brainiac doesn't lock you into using its ORM for everything. You can freely mix direct LMDB usage with Brainiac models:

```typescript
// Direct LMDB usage for simple key-value pairs
db.put('settings:theme', 'dark')
const theme = db.get('settings:theme')

// Brainiac ORM usage for complex models
const user = people.get('user-123') // Full type safety + validation
```

Brainiac uses a `$` prefix for its keys to prevent collisions with your direct LMDB usage.

## 💡 Why Brainiac?

- **When you need speed**: LMDB is one of the fastest key-value stores available
- **When you need safety**: Zod validation ensures your data is always valid
- **When you need flexibility**: Mix ORM and raw key-value access as needed
- **When you need simplicity**: No complex setup or configurations required

## 🔍 Advanced Usage

### Custom ID Generation

```typescript
const people = Person.helper(db)
people.put({
  $id: 'custom-id', // Optional - defaults to UUID
  name: "Joseph",
  age: 55
})
```

### Migrations with Data Transformation

```typescript
const migration = {
  name: 'normalize-emails',
  modelsBeforeMigration: [PersonV1],
  modelsAfterMigration: [PersonV2],
  migration: ({ db }) => {
    const people = PersonV1.helper(db)
    for (const person of people.all()) {
      people.put({
        ...person.value,
        email: person.value.email.toLowerCase()
      })
    }
  }
}
```

## 📚 API Reference

### `defineModel(options)`
Creates a new model definition with Zod schema validation:

```typescript
const Model = defineModel({ model: 'modelName' })({
  field1: z.string(),
  field2: z.number(),
  // ... more fields
})
```

### Model Helper Methods
Each model provides access to type-safe CRUD operations through its helper:

- `Model.helper(db).get(id)`: Retrieve a record by ID
- `Model.helper(db).put(value)`: Create or update a record
- `Model.helper(db).all()`: Iterate over all records of this model

### `migrate(db, migrations)`
Runs migrations in order, with automatic validation and rollback on failure.

## 📦 Installation

```bash
# npm
npm install jbsiddall/Brainiac lmdb zod

# yarn
yarn add jbsiddall/Brainiac lmdb zod

# pnpm
pnpm add jbsiddall/Brainiac lmdb zod
```

## 📄 License

MIT © Joseph Siddall