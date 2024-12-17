import {mapObjIndexed as $lSb2y$mapObjIndexed, equals as $lSb2y$equals} from "ramda";
import {z as $lSb2y$z} from "zod";
import {v4 as $lSb2y$v4} from "uuid";




const $12d95564f480720d$var$RECORD_PREFIX = '$';
const $12d95564f480720d$var$baseModelInstanceValidator = (0, $lSb2y$z).object({
    $id: (0, $lSb2y$z).string(),
    $model: (0, $lSb2y$z).string()
});
class $12d95564f480720d$export$d2a2b5cdc8179a21 {
    constructor(db, name, model){
        this.db = db;
        this.name = name;
        this.model = model;
    }
    get(id) {
        return $12d95564f480720d$export$3988ae62b71be9a3({
            db: this.db,
            type: this.model,
            id: id,
            name: this.name
        });
    }
    put(value) {
        return $12d95564f480720d$export$327f7b26ebf455db({
            db: this.db,
            type: this.model,
            name: this.name,
            value: {
                ...value,
                $id: value['$id'] ?? (0, $lSb2y$v4)(),
                $model: value['$model'] ?? this.name
            }
        });
    }
    all() {
        return $12d95564f480720d$export$84bf76cd7afc7469({
            db: this.db,
            model: this.model,
            name: this.name
        });
    }
}
const $12d95564f480720d$export$647a65c929c59956 = (models, options)=>({ db: db })=>{
        const foo = (0, $lSb2y$mapObjIndexed)((def, name)=>{
            if (!options?.allowUnsafeModelName && name.includes($12d95564f480720d$var$RECORD_PREFIX)) throw new Error(`model ${name} contains illegal characters reserved for ORM '${$12d95564f480720d$var$RECORD_PREFIX}'`);
            return new $12d95564f480720d$export$d2a2b5cdc8179a21(db, name, def);
        }, models);
        return foo;
    };
const $12d95564f480720d$export$acd55aa037e791bb = (schema)=>{
    const unallowedProps = Object.keys(schema).filter((p)=>p.startsWith($12d95564f480720d$var$RECORD_PREFIX));
    if (unallowedProps.length > 0) throw new Error(`model can't contain any properties that are prefixed with $. found props: ${unallowedProps.join(', ')}`);
    return {
        schema: $12d95564f480720d$var$baseModelInstanceValidator.extend(schema)
    };
};
function* $12d95564f480720d$export$84bf76cd7afc7469({ db: db, model: model, name: name }) {
    for (const entry of db.getRange({
        start: $12d95564f480720d$var$firstModelKey(name)
    })){
        const baseParseResult = $12d95564f480720d$var$baseModelInstanceValidator.safeParse(entry.value);
        if (!baseParseResult.success) /* left the collection range */ return;
        if (baseParseResult.data.$model !== name) /* left the collection range */ return;
        const value = model.schema.parse(entry.value);
        const key = $12d95564f480720d$var$getKey({
            name: name,
            id: value.$id
        });
        if (!(0, $lSb2y$equals)(entry.key, key)) throw new Error(`internal data integrity problem. retriveved model ${name} with key ${String(entry.key)} but expected key was ${key}`);
        yield {
            key: key,
            value: value,
            version: entry.version
        };
    }
    return;
}
const $12d95564f480720d$export$3988ae62b71be9a3 = ({ db: db, name: name, type: type, id: id })=>{
    const key = $12d95564f480720d$var$getKey({
        name: name,
        id: id
    });
    const value = db.get(key);
    if (value === undefined) return undefined;
    return type.schema.parse(value);
};
const $12d95564f480720d$export$327f7b26ebf455db = ({ db: db, name: name, type: type, value: value })=>{
    const parseResults = type.schema.safeParse(value);
    if (!parseResults.success) return {
        success: false,
        error: parseResults.error,
        value: value
    };
    const key = $12d95564f480720d$var$getKey({
        name: name,
        id: value.$id
    });
    db.putSync(key, parseResults.data);
    return {
        success: true,
        error: undefined,
        value: value
    };
};
const $12d95564f480720d$var$getKey = ({ name: name, id: id })=>{
    return [
        $12d95564f480720d$var$RECORD_PREFIX,
        name,
        id
    ];
};
const $12d95564f480720d$var$firstModelKey = (modelName)=>[
        $12d95564f480720d$var$RECORD_PREFIX,
        modelName
    ];
class $12d95564f480720d$var$MigrationRunner {
    loadRunMigrations() {
        const existing = this.models.$migrations.get('singleton');
        if (!existing) {
            const result = this.models.$migrations.put({
                $id: 'singleton',
                migrationsRun: [],
                modelVersions: {}
            });
            if (!result.success) throw new Error('failed to save migrations record');
            return result.value;
        }
        return existing;
    }
    updateRunMigrations(migrationName) {
        const existing = this.loadRunMigrations();
        this.models.$migrations.put({
            ...existing,
            migrationsRun: existing.migrationsRun.concat([
                migrationName
            ])
        });
    }
    constructor(db, migrations){
        this.db = db;
        this.migrations = migrations;
        this.MigrationSchema = $12d95564f480720d$export$647a65c929c59956({
            [`${$12d95564f480720d$var$RECORD_PREFIX}migrations`]: $12d95564f480720d$export$acd55aa037e791bb({
                migrationsRun: (0, $lSb2y$z).string().array(),
                modelVersions: (0, $lSb2y$z).record((0, $lSb2y$z).string())
            })
        }, {
            allowUnsafeModelName: true
        });
        const uniqueMigrationNames = new Set(this.migrations.map((m)=>m.name));
        if (uniqueMigrationNames.size !== this.migrations.length) throw new Error('duplicate migration names');
        this.migrations.forEach((m)=>{
            if (m.name.trim().length !== m.name.length) throw new Error(`migration '${m.name}' contains whitespace in name`);
            if (m.name.length === 0) throw new Error('migration with empty space name');
        });
        this.models = this.MigrationSchema({
            db: db
        });
    }
    run() {
        const migrationsRun = this.loadRunMigrations();
        const migrationsThatNeedRunning = [];
        for(let i = 0; i < Math.max(migrationsRun.migrationsRun.length, this.migrations.length); i++){
            const migrationRun = migrationsRun.migrationsRun.at(i);
            const definedMigration = this.migrations.at(i)?.name;
            if (migrationRun) {
                if (definedMigration === migrationRun) continue;
                else throw new Error(`migrations previously run is out of order with the migrations provided in code. desprecepency is at index ${i} of hte migrations. Expected ${migrationRun}, got ${definedMigration}`);
            } else {
                if (!definedMigration) throw new Error('unexpected undefined migration at index ${i}');
                migrationsThatNeedRunning.push(this.migrations[i]);
            }
        }
        for (const migration of migrationsThatNeedRunning)this.#runMigration(migration);
    }
    #runMigration(migration) {
        this.db.transactionSync(()=>{
            const migrations = this.loadRunMigrations();
            if (migrations.migrationsRun.includes(migration.name)) return;
            if (migration.modelsBeforeMigration) {
                const models = $12d95564f480720d$export$647a65c929c59956(migration.modelsBeforeMigration)({
                    db: this.db
                });
                Object.keys(migration.modelsBeforeMigration ?? {}).forEach((modelName)=>{
                    for (let entry of models[modelName].all());
                });
            }
            migration.migration({
                db: this.db
            });
            if (migration.modelsAfterMigration) {
                const models = $12d95564f480720d$export$647a65c929c59956(migration.modelsAfterMigration)({
                    db: this.db
                });
                Object.keys(migration.modelsAfterMigration ?? {}).forEach((modelName)=>{
                    for (let entry of models[modelName].all());
                });
            }
            this.updateRunMigrations(migration.name);
        });
    }
}
function $12d95564f480720d$export$ce7f407e15fce6b5(db, migrations) {
    const runner = new $12d95564f480720d$var$MigrationRunner(db, migrations);
    runner.run();
}


export {$12d95564f480720d$export$d2a2b5cdc8179a21 as ModelHelper, $12d95564f480720d$export$3988ae62b71be9a3 as get, $12d95564f480720d$export$327f7b26ebf455db as put, $12d95564f480720d$export$84bf76cd7afc7469 as all, $12d95564f480720d$export$647a65c929c59956 as defineSchema, $12d95564f480720d$export$acd55aa037e791bb as defineModel, $12d95564f480720d$export$ce7f407e15fce6b5 as migrate};
//# sourceMappingURL=lib.js.map
