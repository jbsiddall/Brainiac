import { Database } from "lmdb";
import { z, ZodType } from "zod";
declare const baseModelInstanceValidator: z.ZodObject<{
    $id: z.ZodString;
    $model: z.ZodString;
}, "strip", z.ZodTypeAny, {
    $id: string;
    $model: string;
}, {
    $id: string;
    $model: string;
}>;
type BaseModelInstanceSchema = typeof baseModelInstanceValidator;
interface Model<Name extends string = string, Schema extends BaseModelInstanceSchema = BaseModelInstanceSchema> {
    model: Name;
    schema: Schema;
    helper(db: Database): ModelHelper<Model<Name, Schema>>;
}
export class ModelHelper<M extends Model> {
    constructor(db: Database, model: M);
    get(id: string): z.TypeOf<M["schema"]> | undefined;
    put(value: Omit<z.infer<M['schema']>, '$id' | '$model'> & Partial<z.infer<BaseModelInstanceSchema>>): {
        success: false;
        error: z.ZodError<{
            $id: string;
            $model: string;
        }>;
        value: z.TypeOf<M["schema"]>;
    } | {
        success: true;
        error: undefined;
        value: z.TypeOf<M["schema"]>;
    };
    all(): Generator<{
        key: string[];
        value: {
            $id: string;
            $model: string;
        };
        version: number | undefined;
    }, void, unknown>;
}
export const defineModel: <Name extends string>({ model }: {
    model: Name;
}) => <const Schema extends Record<string, ZodType>>(schema: Schema) => Model<Name, z.ZodObject<{
    $id: z.ZodString;
    $model: z.ZodString;
}, "strip", z.ZodTypeAny, {
    $id: string;
    $model: string;
}, {
    $id: string;
    $model: string;
}> & z.ZodObject<Schema, z.UnknownKeysParam, z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<Schema>, any> extends infer T ? { [k in keyof T]: z.objectUtil.addQuestionMarks<z.baseObjectOutputType<Schema>, any>[k]; } : never, z.baseObjectInputType<Schema> extends infer T_1 ? { [k_1 in keyof T_1]: z.baseObjectInputType<Schema>[k_1]; } : never>>;
export function all<T extends Model>({ db, model }: {
    db: Database;
    model: T;
}): Generator<{
    key: string[];
    value: {
        $id: string;
        $model: string;
    };
    version: number | undefined;
}, void, unknown>;
export const get: <T extends Model<any, any>>({ db, type, id }: {
    db: Database;
    type: T;
    id: string;
}) => undefined | z.infer<T["schema"]>;
export const put: <T extends Model>({ db, type, value }: {
    db: Database;
    type: T;
    value: z.infer<T["schema"]>;
}) => {
    success: false;
    error: z.ZodError<{
        $id: string;
        $model: string;
    }>;
    value: z.TypeOf<T["schema"]>;
} | {
    success: true;
    error: undefined;
    value: z.TypeOf<T["schema"]>;
};
interface Migration {
    name: string;
    modelsBeforeMigration?: Model[];
    modelsAfterMigration?: Model[];
    migration: ({ db }: {
        db: Database;
    }) => void;
}
export function migrate(db: Database, migrations: Migration[]): void;

//# sourceMappingURL=types.d.ts.map
