import { Database } from 'lmdb'
import { equals, mapObjIndexed } from 'ramda'
import { z, ZodType } from 'zod'
import { v4 as randomId } from 'uuid'


const RECORD_PREFIX = '$'


const baseModelInstanceValidator = z.object({
  $id: z.string(),
  $model: z.string(),
})

type BaseModelInstanceSchema = typeof baseModelInstanceValidator


interface SchemaModelDefinition<Schema extends BaseModelInstanceSchema = BaseModelInstanceSchema> {
  schema: Schema,
}

export class ModelHelper<M extends SchemaModelDefinition> {

  constructor(private db: Database, private name: string, private model: M) { }

  get(id: string) {
    return get({ db: this.db, type: this.model, id, name: this.name })
  }

  put(value: Omit<z.infer<M['schema']>, '$id' | '$model'> & Partial<z.infer<BaseModelInstanceSchema>>) {
    return put({
      db: this.db,
      type: this.model,
      name: this.name,
      value: {
        ...value,
        $id: value['$id'] ?? randomId(),
        $model: value['$model'] ?? this.name,
      }
    })
  }

  all() {
    return all({ db: this.db, model: this.model, name: this.name })
  }
}

export const defineSchema = <Models extends Record<string, SchemaModelDefinition>>(models: Models, options?: { allowUnsafeModelName: boolean }) => ({ db }: { db: Database }) => {


  const foo = mapObjIndexed((def, name) => {
    if (!options?.allowUnsafeModelName && name.includes(RECORD_PREFIX)) {
      throw new Error(`model ${name} contains illegal characters reserved for ORM '${RECORD_PREFIX}'`)
    }

    return new ModelHelper(db, name, def)

  }, models)

  return foo as { [K in keyof Models]: ModelHelper<Models[K]> }
}


export const defineModel = <const Schema extends Record<string, ZodType>>(schema: Schema) => {
  const unallowedProps = Object.keys(schema).filter(p => p.startsWith(RECORD_PREFIX))
  if (unallowedProps.length > 0) {
    throw new Error(`model can't contain any properties that are prefixed with $. found props: ${unallowedProps.join(', ')}`)
  }

  return {
    schema: baseModelInstanceValidator.extend(schema),
  }
}


export function* all<T extends SchemaModelDefinition>({ db, model, name }: { db: Database, model: T, name: string }) {
  for (const entry of db.getRange({ start: firstModelKey(name) })) {
    const baseParseResult = baseModelInstanceValidator.safeParse(entry.value)
    if (!baseParseResult.success) {
      /* left the collection range */
      return
    }
    if (baseParseResult.data.$model !== name) {
      /* left the collection range */
      return
    }

    const value = model.schema.parse(entry.value)
    const key = getKey({ name, id: value.$id })
    if (!equals(entry.key, key)) {
      throw new Error(`internal data integrity problem. retriveved model ${name} with key ${String(entry.key)} but expected key was ${key}`)
    }
    yield { key, value, version: entry.version }
  }
  return
}

export const get = <T extends SchemaModelDefinition>({ db, name, type, id }: { db: Database, name: string, type: T, id: string }): undefined | z.infer<T['schema']> => {
  const key = getKey({ name, id })
  const value = db.get(key)
  if (value === undefined) {
    return undefined
  }
  return type.schema.parse(value)
}

export const put = <T extends SchemaModelDefinition>({ db, name, type, value }: { db: Database, name: string, type: T, value: z.infer<T['schema']> }) => {
  const parseResults = type.schema.safeParse(value)
  if (!parseResults.success) {
    return { success: false as const, error: parseResults.error, value }
  }

  const key = getKey({ name, id: value.$id })
  db.putSync(key, parseResults.data)

  return { success: true as const, error: undefined, value }
}

const getKey = ({ name, id }: { name: string, id: string }) => {
  return [RECORD_PREFIX, name, id]
}
const firstModelKey = (modelName: string) => [RECORD_PREFIX, modelName]


interface Migration {
  name: string
  modelsBeforeMigration?: Record<string, SchemaModelDefinition>,
  modelsAfterMigration?: Record<string, SchemaModelDefinition>,
  migration: ({ db }: { db: Database }) => void
}


class MigrationRunner {

  MigrationSchema = defineSchema({
    [`${RECORD_PREFIX}migrations`]: defineModel({
      migrationsRun: z.string().array(),
      modelVersions: z.record(z.string()),
    })
  }, { allowUnsafeModelName: true })

  models: ReturnType<typeof this.MigrationSchema>;

  loadRunMigrations() {

    const existing = this.models.$migrations.get('singleton')
    if (!existing) {
      const result = this.models.$migrations.put({
        $id: 'singleton',
        migrationsRun: [],
        modelVersions: {}
      })
      if (!result.success) {
        throw new Error('failed to save migrations record')
      }
      return result.value
    }
    return existing
  }

  updateRunMigrations(migrationName: string) {
    const existing = this.loadRunMigrations()!

    this.models.$migrations.put({
      ...existing,
      migrationsRun: existing.migrationsRun.concat([migrationName])
    })
  }

  constructor(private db: Database, private migrations: Migration[]) {
    const uniqueMigrationNames = new Set(this.migrations.map(m => m.name))
    if (uniqueMigrationNames.size !== this.migrations.length) {
      throw new Error('duplicate migration names')
    }
    this.migrations.forEach(m => {
      if (m.name.trim().length !== m.name.length) {
        throw new Error(`migration '${m.name}' contains whitespace in name`)
      }
      if (m.name.length === 0) {
        throw new Error('migration with empty space name')
      }
    })

    this.models = this.MigrationSchema({ db })
  }

  run() {
    const migrationsRun = this.loadRunMigrations()

    const migrationsThatNeedRunning = [] as Migration[]

    for (let i = 0; i < Math.max(migrationsRun.migrationsRun.length, this.migrations.length); i++) {
      const migrationRun = migrationsRun.migrationsRun.at(i)
      const definedMigration = this.migrations.at(i)?.name

      if (migrationRun) {
        if (definedMigration === migrationRun) {
          continue
        } else {
          throw new Error(`migrations previously run is out of order with the migrations provided in code. desprecepency is at index ${i} of hte migrations. Expected ${migrationRun}, got ${definedMigration}`)
        }
      } else {
        if (!definedMigration) {
          throw new Error('unexpected undefined migration at index ${i}')
        }
        migrationsThatNeedRunning.push(this.migrations[i])
      }
    }

    for (const migration of migrationsThatNeedRunning) {
      this.#runMigration(migration)
    }
  }

  #runMigration(migration: Migration) {
    this.db.transactionSync(() => {
      const migrations = this.loadRunMigrations()
      if (migrations.migrationsRun.includes(migration.name)) {
        return
      }

      if (migration.modelsBeforeMigration) {
        const models = defineSchema(migration.modelsBeforeMigration)({ db: this.db })
        Object.keys(migration.modelsBeforeMigration ?? {}).forEach(modelName => {

          for (let entry of models[modelName].all()) {
            // implicitly validating all model records
          }
        })
      }


      migration.migration({ db: this.db })


      if (migration.modelsAfterMigration) {
        const models = defineSchema(migration.modelsAfterMigration)({ db: this.db })
        Object.keys(migration.modelsAfterMigration ?? {}).forEach(modelName => {

          for (let entry of models[modelName].all()) {
            // implicitly validating all model records
          }
        })
      }

      this.updateRunMigrations(migration.name)
    })
  }
}

export function migrate(db: Database, migrations: Migration[]) {
  const runner = new MigrationRunner(db, migrations)
  runner.run()
}
