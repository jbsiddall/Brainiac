import $lSb2y$zod from "zod";
import {equals as $lSb2y$equals} from "ramda";
import {v4 as $lSb2y$v4} from "uuid";




const $12d95564f480720d$var$RECORD_PREFIX = '$';
const $12d95564f480720d$var$baseModelValidator = (0, $lSb2y$zod).object({
    $id: (0, $lSb2y$zod).string(),
    $model: (0, $lSb2y$zod).string()
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
        $12d95564f480720d$export$327f7b26ebf455db({
            db: this.db,
            type: this.model,
            value: {
                ...value,
                $id: value['$id'] ?? (0, $lSb2y$v4)(),
                $model: value['$model'] ?? this.model.name
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
const $12d95564f480720d$export$acd55aa037e791bb = ({ name: name })=>(schema)=>{
        if (name.includes($12d95564f480720d$var$RECORD_PREFIX)) throw new Error(`model ${name} contains illegal characters reserved for ORM '${$12d95564f480720d$var$RECORD_PREFIX}'`);
        const props = Object.keys(schema);
        if (props.includes('$id') || props.includes('$model')) throw new Error(`model ${name} can't contain any properties that are prefixed with $`);
        const base = {
            name: name,
            schema: $12d95564f480720d$var$baseModelValidator.extend(schema)
        };
        return base;
    };
function* $12d95564f480720d$export$84bf76cd7afc7469({ db: db, model: model }) {
    for (const entry of db.getRange({
        start: $12d95564f480720d$var$firstModelKey(model)
    })){
        const baseParseResult = $12d95564f480720d$var$baseModelValidator.safeParse(entry.value);
        if (!baseParseResult.success) /* left the collection range */ return;
        if (baseParseResult.data.$model !== model.name) /* left the collection range */ return;
        const value = model.schema.parse(entry.value);
        const key = $12d95564f480720d$var$getKey({
            model: model,
            id: value.$id
        });
        if (!(0, $lSb2y$equals)(entry.key, key)) throw new Error(`internal data integrity problem. retriveved model ${model.name} with key ${String(entry.key)} but expected key was ${key}`);
        yield {
            key: key,
            value: value,
            version: entry.version
        };
    }
    return;
}
const $12d95564f480720d$export$3988ae62b71be9a3 = ({ db: db, type: type, id: id })=>{
    const key = `${type.name}:${id}`;
    const value = db.get(key);
    return type.schema.parse(value);
};
const $12d95564f480720d$export$327f7b26ebf455db = ({ db: db, type: type, value: value })=>{
    const parseResults = type.schema.safeParse(value);
    if (!parseResults.success) return {
        success: false,
        error: parseResults.error
    };
    const key = $12d95564f480720d$var$getKey({
        model: type,
        id: value.$id
    });
    db.putSync(key, parseResults.data);
    return {
        success: true,
        error: undefined
    };
};
const $12d95564f480720d$var$getKey = ({ model: model, id: id })=>{
    return [
        $12d95564f480720d$var$RECORD_PREFIX,
        model.name,
        id
    ];
};
const $12d95564f480720d$var$firstModelKey = (model)=>[
        $12d95564f480720d$var$RECORD_PREFIX,
        model.name
    ];
class $12d95564f480720d$var$MigrationRunner {
    constructor(db, migrations){
        this.db = db;
        this.migrations = migrations;
        this.MigrationsRun = (0, $lSb2y$zod).object({
            migrationsRun: (0, $lSb2y$zod).string().array(),
            modelVersions: (0, $lSb2y$zod).record((0, $lSb2y$zod).string())
        });
        this.MigrationsRunKey = `${$12d95564f480720d$var$RECORD_PREFIX}${$12d95564f480720d$var$RECORD_PREFIX}migrations`;
        const uniqueMigrationNames = new Set(this.migrations.map((m)=>m.name));
        if (uniqueMigrationNames.size !== this.migrations.length) throw new Error('duplicate migration names');
        this.migrations.forEach((m)=>{
            if (m.name.trim().length !== m.name.length) throw new Error(`migration '${m.name}' contains whitespace in name`);
            if (m.name.length === 0) throw new Error('migration with empty space name');
        });
        try {
            this.db.get(this.MigrationsRunKey);
        } catch (e) {
            this.db.putSync(this.MigrationsRunKey, {
                migrationsRun: [],
                modelVersions: {}
            });
        }
    }
    run() {
        const migrationsRun = this.MigrationsRun.parse(this.db.get(this.MigrationsRunKey));
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
            (migration.modelsBeforeMigration ?? []).forEach((model)=>{
                const helper = new $12d95564f480720d$export$d2a2b5cdc8179a21(this.db, model);
                for (let entry of helper.all());
            });
            migration.migration();
            (migration.modelsAfterMigration ?? []).forEach((model)=>{
                const helper = new $12d95564f480720d$export$d2a2b5cdc8179a21(this.db, model);
                for (let entry of helper.all());
            });
        });
    }
}
function $12d95564f480720d$export$ce7f407e15fce6b5(db, migrations) {
    const runner = new $12d95564f480720d$var$MigrationRunner(db, migrations);
    runner.run();
}


export {$12d95564f480720d$export$d2a2b5cdc8179a21 as ModelHelper, $12d95564f480720d$export$3988ae62b71be9a3 as get, $12d95564f480720d$export$327f7b26ebf455db as put, $12d95564f480720d$export$84bf76cd7afc7469 as all, $12d95564f480720d$export$acd55aa037e791bb as defineModel, $12d95564f480720d$export$ce7f407e15fce6b5 as migrate};
//# sourceMappingURL=lib.js.map
