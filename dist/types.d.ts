import { Database } from "lmdb";
import z, { ZodType } from "zod";
declare const baseModelValidator: any;
type BaseModelSchema = typeof baseModelValidator;
interface Model<Name extends string = string, Schema extends BaseModelSchema = BaseModelSchema> {
    name: Name;
    schema: Schema;
}
export class ModelHelper<M extends Model> {
    constructor(db: Database, model: M);
    get(id: string): z.infer<T["schema"]>;
    put(value: Omit<z.infer<M['schema']>, '$id' | '$model'> & Partial<z.infer<BaseModelSchema>>): void;
    all(): {};
}
export const defineModel: <Name extends string>({ name }: {
    name: Name;
}) => <const Schema extends Record<string, ZodType>>(schema: Schema) => {
    name: Name;
    schema: any;
};
export function all<T extends Model>({ db, model }: {
    db: Database;
    model: T;
}): {};
export const get: <T extends Model<any, any>>({ db, type, id }: {
    db: Database;
    type: T;
    id: string;
}) => z.infer<T["schema"]>;
export const put: <T extends Model>({ db, type, value }: {
    db: Database;
    type: T;
    value: z.infer<T["schema"]>;
}) => {
    success: boolean;
    error: any;
};
interface Migration {
    name: string;
    modelsBeforeMigration?: Model[];
    modelsAfterMigration?: Model[];
    migration: () => void;
}
export function migrate(db: Database, migrations: Migration[]): void;

//# sourceMappingURL=types.d.ts.map
