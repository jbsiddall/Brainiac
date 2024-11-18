import {Database} from 'lmdb'
import {equals} from 'ramda'
import {z, ZodObject, ZodType} from 'zod' 
import {v4 as randomId} from 'uuid'


const RECORD_PREFIX = '$'


const baseModelInstanceValidator = z.object({
  $id: z.string(),
  $model: z.string(),
})

type BaseModelInstanceSchema = typeof baseModelInstanceValidator

interface Model<Name extends string = string, Schema extends BaseModelInstanceSchema = BaseModelInstanceSchema> {
  model: Name,
  schema: Schema,
  helper(db: Database): ModelHelper<Model<Name, Schema>>
}

export class ModelHelper<M extends Model> {

  constructor(private db: Database, private model: M) { }

  get(id: string) {
    return get({db: this.db, type: this.model, id})
  }

  put(value: Omit<z.infer<M['schema']>, '$id' | '$model'> & Partial<z.infer<BaseModelInstanceSchema>>) {
    return put({
      db: this.db,
      type: this.model,
      value: {
        ...value,
        $id: value['$id'] ?? randomId(),
        $model: value['$model'] ?? this.model.model,
      }
    })
  }

  all() {
    return all({db: this.db, model: this.model})
  }
}


export const defineModel = <Name extends string>({model}: {model: Name}) => <const Schema extends Record<string, ZodType>>(schema: Schema) => {
  if (model.includes(RECORD_PREFIX)) {
    throw new Error(`model ${model} contains illegal characters reserved for ORM '${RECORD_PREFIX}'`)
  }

  const props = Object.keys(schema)
  if (props.includes('$id') || props.includes('$model')) {
    throw new Error(`model ${model} can't contain any properties that are prefixed with $`)
  }

  return defineModelUnsafe({model})(schema)
}

const defineModelUnsafe = <Name extends string>({model}: {model: Name}) => <const Schema extends Record<string, ZodType>>(schema: Schema) => {
  const finalSchema = baseModelInstanceValidator.extend(schema) as any as (BaseModelInstanceSchema & ZodObject<Schema>)

  const definedModel: Model<Name, BaseModelInstanceSchema & ZodObject<Schema>> = {
    model: model,
    schema: finalSchema,
    helper(db) {
      return new ModelHelper(db, definedModel)
    }
  }
  return definedModel
}

export function* all<T extends Model>({db, model}: {db: Database, model: T}) {
  for (const entry of db.getRange({start: firstModelKey(model)})) {
    const baseParseResult = baseModelInstanceValidator.safeParse(entry.value)
    if (!baseParseResult.success) {
      /* left the collection range */
      return
    }
    if (baseParseResult.data.$model !== model.model) {
      /* left the collection range */
      return
    }

    const value = model.schema.parse(entry.value)
    const key  = getKey({model, id: value.$id})
    if (!equals(entry.key, key)) {
      throw new Error(`internal data integrity problem. retriveved model ${model.model} with key ${String(entry.key)} but expected key was ${key}`)
    }
    yield {key, value, version: entry.version}
  }
  return
}

export const get = <T extends Model<any, any>>({db, type, id}: {db: Database, type: T, id: string}): undefined | z.infer<T['schema']> => {
  const key =getKey({model: type, id})
  const value = db.get(key)
  if (value === undefined) {
    return undefined
  }
  return type.schema.parse(value)
}

export const put = <T extends Model>({db, type, value}: {db: Database, type: T, value: z.infer<T['schema']>}) => {
  const parseResults = type.schema.safeParse(value)
  if (!parseResults.success) {
    return {success: false as const, error: parseResults.error, value}
  }

  const key = getKey({model: type, id: value.$id})
  db.putSync(key, parseResults.data)

  return {success: true as const, error: undefined, value}
}

const getKey = ({model, id}: {model: Model, id: string}) => {
  return [RECORD_PREFIX, model.model, id]
}
const firstModelKey = (model: Model) => [RECORD_PREFIX, model.model]


interface Migration {
  name: string
  modelsBeforeMigration?: Model[]
  modelsAfterMigration?: Model[]
  migration: ({db}: {db: Database}) => void
}


class MigrationRunner {

  MigrationModel = defineModelUnsafe({model: '$migrations'})({
    migrationsRun: z.string().array(),
    modelVersions: z.record(z.string()),
  })

  loadRunMigrations() {
    const existing = this.MigrationModel.helper(this.db).get('singleton') 
    if (!existing) {
      const result = this.MigrationModel.helper(this.db).put({
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
    this.MigrationModel.helper(this.db).put({
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

      ;(migration.modelsBeforeMigration ?? []).forEach(model => {
        const helper = new ModelHelper(this.db, model)
        for (let entry of helper.all()) {
          // implicitly validating all model records
        }
      })

      migration.migration({db: this.db})

      ;(migration.modelsAfterMigration ?? []).forEach(model => {
        const helper = new ModelHelper(this.db, model)
        for (let entry of helper.all()) {
          // implicitly validating all model records
        }
      })

      this.updateRunMigrations(migration.name)
    })
  }
}

export function migrate(db: Database, migrations: Migration[]) {
  const runner = new MigrationRunner(db, migrations)
  runner.run()
}
