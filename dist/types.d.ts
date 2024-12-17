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
interface SchemaModelDefinition<Schema extends BaseModelInstanceSchema = BaseModelInstanceSchema> {
    schema: Schema;
}
export class ModelHelper<M extends SchemaModelDefinition> {
    constructor(db: Database, name: string, model: M);
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
export const defineSchema: <Models extends Record<string, SchemaModelDefinition>>(models: Models, options?: {
    allowUnsafeModelName: boolean;
}) => ({ db }: {
    db: Database;
}) => { [K in keyof Models]: ModelHelper<Models[K]>; };
export const defineModel: <const Schema extends Record<string, ZodType>>(schema: Schema) => {
    schema: z.ZodObject<z.objectUtil.extendShape<{
        $id: z.ZodString;
        $model: z.ZodString;
    }, Schema>, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<z.objectUtil.extendShape<{
        $id: z.ZodString;
        $model: z.ZodString;
    }, Schema>>, any> extends infer T ? { [k in keyof T]: z.objectUtil.addQuestionMarks<z.baseObjectOutputType<z.objectUtil.extendShape<{
        $id: z.ZodString;
        $model: z.ZodString;
    }, Schema>>, any>[k]; } : never, z.baseObjectInputType<z.objectUtil.extendShape<{
        $id: z.ZodString;
        $model: z.ZodString;
    }, Schema>> extends infer T_1 ? { [k_1 in keyof T_1]: z.baseObjectInputType<z.objectUtil.extendShape<{
        $id: z.ZodString;
        $model: z.ZodString;
    }, Schema>>[k_1]; } : never>;
};
export function all<T extends SchemaModelDefinition>({ db, model, name }: {
    db: Database;
    model: T;
    name: string;
}): Generator<{
    key: string[];
    value: {
        $id: string;
        $model: string;
    };
    version: number | undefined;
}, void, unknown>;
export const get: <T extends SchemaModelDefinition>({ db, name, type, id }: {
    db: Database;
    name: string;
    type: T;
    id: string;
}) => undefined | z.infer<T["schema"]>;
export const put: <T extends SchemaModelDefinition>({ db, name, type, value }: {
    db: Database;
    name: string;
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
    modelsBeforeMigration?: Record<string, SchemaModelDefinition>;
    modelsAfterMigration?: Record<string, SchemaModelDefinition>;
    migration: ({ db }: {
        db: Database;
    }) => void;
}
export function migrate(db: Database, migrations: Migration[]): void;

//# sourceMappingURL=types.d.ts.map
