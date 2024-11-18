import {Database} from 'lmdb'
import z, { ZodObject, ZodType } from 'zod'
import {equals} from 'ramda'
import {v4 as randomId} from 'uuid'


const RECORD_PREFIX = '$'


const baseModelValidator = z.object({
  $id: z.string(),
  $model: z.string(),
})

type BaseModelSchema = typeof baseModelValidator

interface Model<Name extends string = string, Schema extends BaseModelSchema = BaseModelSchema> {
  name: Name
  schema: Schema
}

export class ModelHelper<M extends Model> {

  constructor(private db: Database, private model: M) { }

  get(id: string) {
    return get({db: this.db, type: this.model, id})
  }

  put(value: Omit<z.infer<M['schema']>, '$id' | '$model'> & Partial<z.infer<BaseModelSchema>>) {
    put({
      db: this.db,
      type: this.model,
      value: {
        ...value,
        $id: value['$id'] ?? randomId(),
        $model: value['$model'] ?? this.model.name,
      }
    })
  }

  all() {
    return all({db: this.db, model: this.model})
  }
}


export const defineModel = <Name extends string>({name}: {name: Name}) => <const Schema extends Record<string, ZodType>>(schema: Schema) => {
  if (name.includes(RECORD_PREFIX)) {
    throw new Error(`model ${name} contains illegal characters reserved for ORM '${RECORD_PREFIX}'`)
  }

  const props = Object.keys(schema)
  if (props.includes('$id') || props.includes('$model')) {
    throw new Error(`model ${name} can't contain any properties that are prefixed with $`)
  }

  const base = {
    name,
    schema: baseModelValidator.extend(schema),
  } satisfies Model<Name, any>

  return base
}

export function* all<T extends Model>({db, model}: {db: Database, model: T}) {
  for (const entry of db.getRange({start: firstModelKey(model)})) {
    const baseParseResult = baseModelValidator.safeParse(entry.value)
    if (!baseParseResult.success) {
      /* left the collection range */
      return
    }
    if (baseParseResult.data.$model !== model.name) {
      /* left the collection range */
      return
    }

    const value = model.schema.parse(entry.value)
    const key  = getKey({model, id: value.$id})
    if (!equals(entry.key, key)) {
      throw new Error(`internal data integrity problem. retriveved model ${model.name} with key ${String(entry.key)} but expected key was ${key}`)
    }
    yield {key, value, version: entry.version}
  }
  return
}

export const get = <T extends Model<any, any>>({db, type, id}: {db: Database, type: T, id: string}): z.infer<T['schema']> => {
  const key = `${type.name}:${id}`
  const value = db.get(key)
  return type.schema.parse(value)
}

export const put = <T extends Model>({db, type, value}: {db: Database, type: T, value: z.infer<T['schema']>}) => {
  const parseResults = type.schema.safeParse(value)
  if (!parseResults.success) {
    return {success: false, error: parseResults.error}
  }

  const key = getKey({model: type, id: value.$id})
  db.putSync(key, parseResults.data)

  return {success: true, error: undefined}
}

const getKey = ({model, id}: {model: Model, id: string}) => {
  return [RECORD_PREFIX, model.name, id]
}
const firstModelKey = (model: Model) => [RECORD_PREFIX, model.name]


interface Migration {
  name: string
  modelsBeforeMigration?: Model[]
  modelsAfterMigration?: Model[]
  migration: () => void
}

class MigrationRunner {


  MigrationsRun = z.object({
    migrationsRun: z.string().array(),
    modelVersions: z.record(z.string()),
  })
  MigrationsRunKey = `${RECORD_PREFIX}${RECORD_PREFIX}migrations`

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

    try {
      this.db.get(this.MigrationsRunKey)
    } catch (e) {
      this.db.putSync(this.MigrationsRunKey, {migrationsRun: [], modelVersions: {}} satisfies z.infer<typeof this.MigrationsRun>)
    }
  }

  run() {
    const migrationsRun = this.MigrationsRun.parse(this.db.get(this.MigrationsRunKey))

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
      ;(migration.modelsBeforeMigration ?? []).forEach(model => {
        const helper = new ModelHelper(this.db, model)
        for (let entry of helper.all()) {
          // implicitly validating all model records
        }
      })

      migration.migration()

      ;(migration.modelsAfterMigration ?? []).forEach(model => {
        const helper = new ModelHelper(this.db, model)
        for (let entry of helper.all()) {
          // implicitly validating all model records
        }
      })

    })
  }

}

export function migrate(db: Database, migrations: Migration[]) {
  const runner = new MigrationRunner(db, migrations)
  runner.run()
}
