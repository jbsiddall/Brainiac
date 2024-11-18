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
import { defineModel, ModelHelper } from 'Brainiac'
import { z } from 'zod'

// Define your model with type-safe schema
const Person = defineModel({ name: 'person' })({
  name: z.string(),
  age: z.number(),
  email: z.string().email(),
  createdAt: z.date()
})

// Open LMDB database
const db = open('mydb')

// Create a helper for working with Person records
const people = new ModelHelper(db, Person)

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
Migrations in Brainiac are simple yet powerful:

```typescript
import { migrate } from 'Brainiac'

// Define your migration
const addPhoneNumber = {
  name: 'add-phone-number',
  modelsBeforeMigration: [PersonV1],
  modelsAfterMigration: [PersonV2],
  migration: () => {
    // Your migration logic here
    // If anything fails, the entire transaction rolls back
  }
}

migrate(db, [addPhoneNumber])
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
const helper = new ModelHelper(db, Person)
helper.put({
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
  migration: () => {
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
const Model = defineModel({ name: 'modelName' })({
  field1: z.string(),
  field2: z.number(),
  // ... more fields
})
```

### `ModelHelper`
Provides type-safe CRUD operations for a model:

- `get(id: string)`: Retrieve a record by ID
- `put(value: T)`: Create or update a record
- `all()`: Iterate over all records of this model

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
