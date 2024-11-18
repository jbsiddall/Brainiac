import {equals as $lSb2y$equals} from "ramda";
import {z as $lSb2y$z} from "zod";
import {v4 as $lSb2y$v4} from "uuid";




const $12d95564f480720d$var$RECORD_PREFIX = '$';
const $12d95564f480720d$var$baseModelInstanceValidator = (0, $lSb2y$z).object({
    $id: (0, $lSb2y$z).string(),
    $model: (0, $lSb2y$z).string()
});
class $12d95564f480720d$export$d2a2b5cdc8179a21 {
    constructor(db, model){
        this.db = db;
        this.model = model;
    }
    get(id) {
        return $12d95564f480720d$export$3988ae62b71be9a3({
            db: this.db,
            type: this.model,
            id: id
        });
    }
    put(value) {
        return $12d95564f480720d$export$327f7b26ebf455db({
            db: this.db,
            type: this.model,
            value: {
                ...value,
                $id: value['$id'] ?? (0, $lSb2y$v4)(),
                $model: value['$model'] ?? this.model.model
            }
        });
    }
    all() {
        return $12d95564f480720d$export$84bf76cd7afc7469({
            db: this.db,
            model: this.model
        });
    }
}
const $12d95564f480720d$export$acd55aa037e791bb = ({ model: model })=>(schema)=>{
        if (model.includes($12d95564f480720d$var$RECORD_PREFIX)) throw new Error(`model ${model} contains illegal characters reserved for ORM '${$12d95564f480720d$var$RECORD_PREFIX}'`);
        const props = Object.keys(schema);
        if (props.includes('$id') || props.includes('$model')) throw new Error(`model ${model} can't contain any properties that are prefixed with $`);
        return $12d95564f480720d$var$defineModelUnsafe({
            model: model
        })(schema);
    };
const $12d95564f480720d$var$defineModelUnsafe = ({ model: model })=>(schema)=>{
        const finalSchema = $12d95564f480720d$var$baseModelInstanceValidator.extend(schema);
        const definedModel = {
            model: model,
            schema: finalSchema,
            helper (db) {
                return new $12d95564f480720d$export$d2a2b5cdc8179a21(db, definedModel);
            }
        };
        return definedModel;
    };
function* $12d95564f480720d$export$84bf76cd7afc7469({ db: db, model: model }) {
    for (const entry of db.getRange({
        start: $12d95564f480720d$var$firstModelKey(model)
    })){
        const baseParseResult = $12d95564f480720d$var$baseModelInstanceValidator.safeParse(entry.value);
        if (!baseParseResult.success) /* left the collection range */ return;
        if (baseParseResult.data.$model !== model.model) /* left the collection range */ return;
        const value = model.schema.parse(entry.value);
        const key = $12d95564f480720d$var$getKey({
            model: model,
            id: value.$id
        });
        if (!(0, $lSb2y$equals)(entry.key, key)) throw new Error(`internal data integrity problem. retriveved model ${model.model} with key ${String(entry.key)} but expected key was ${key}`);
        yield {
            key: key,
            value: value,
            version: entry.version
        };
    }
    return;
}
const $12d95564f480720d$export$3988ae62b71be9a3 = ({ db: db, type: type, id: id })=>{
    const key = $12d95564f480720d$var$getKey({
        model: type,
        id: id
    });
    const value = db.get(key);
    if (value === undefined) return undefined;
    return type.schema.parse(value);
};
const $12d95564f480720d$export$327f7b26ebf455db = ({ db: db, type: type, value: value })=>{
    const parseResults = type.schema.safeParse(value);
    if (!parseResults.success) return {
        success: false,
        error: parseResults.error,
        value: value
    };
    const key = $12d95564f480720d$var$getKey({
        model: type,
        id: value.$id
    });
    db.putSync(key, parseResults.data);
    return {
        success: true,
        error: undefined,
        value: value
    };
};
const $12d95564f480720d$var$getKey = ({ model: model, id: id })=>{
    return [
        $12d95564f480720d$var$RECORD_PREFIX,
        model.model,
        id
    ];
};
const $12d95564f480720d$var$firstModelKey = (model)=>[
        $12d95564f480720d$var$RECORD_PREFIX,
        model.model
    ];
class $12d95564f480720d$var$MigrationRunner {
    loadRunMigrations() {
        const existing = this.MigrationModel.helper(this.db).get('singleton');
        if (!existing) {
            const result = this.MigrationModel.helper(this.db).put({
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
        this.MigrationModel.helper(this.db).put({
            ...existing,
            migrationsRun: existing.migrationsRun.concat([
                migrationName
            ])
        });
    }
    constructor(db, migrations){
        this.db = db;
        this.migrations = migrations;
        this.MigrationModel = $12d95564f480720d$var$defineModelUnsafe({
            model: '$migrations'
        })({
            migrationsRun: (0, $lSb2y$z).string().array(),
            modelVersions: (0, $lSb2y$z).record((0, $lSb2y$z).string())
        });
        const uniqueMigrationNames = new Set(this.migrations.map((m)=>m.name));
        if (uniqueMigrationNames.size !== this.migrations.length) throw new Error('duplicate migration names');
        this.migrations.forEach((m)=>{
            if (m.name.trim().length !== m.name.length) throw new Error(`migration '${m.name}' contains whitespace in name`);
            if (m.name.length === 0) throw new Error('migration with empty space name');
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
            (migration.modelsBeforeMigration ?? []).forEach((model)=>{
                const helper = new $12d95564f480720d$export$d2a2b5cdc8179a21(this.db, model);
                for (let entry of helper.all());
            });
            migration.migration({
                db: this.db
            });
            (migration.modelsAfterMigration ?? []).forEach((model)=>{
                const helper = new $12d95564f480720d$export$d2a2b5cdc8179a21(this.db, model);
                for (let entry of helper.all());
            });
            this.updateRunMigrations(migration.name);
        });
    }
}
function $12d95564f480720d$export$ce7f407e15fce6b5(db, migrations) {
    const runner = new $12d95564f480720d$var$MigrationRunner(db, migrations);
    runner.run();
}


export {$12d95564f480720d$export$d2a2b5cdc8179a21 as ModelHelper, $12d95564f480720d$export$3988ae62b71be9a3 as get, $12d95564f480720d$export$327f7b26ebf455db as put, $12d95564f480720d$export$84bf76cd7afc7469 as all, $12d95564f480720d$export$acd55aa037e791bb as defineModel, $12d95564f480720d$export$ce7f407e15fce6b5 as migrate};
//# sourceMappingURL=lib.js.map
