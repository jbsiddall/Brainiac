# Brainiac

What:

Sugar for LMDB. You can still sue lmdb exeactly how you want but have some extra structures on top.

Features:
* typescript
* zod validated orm
* records
* good readme with examples
* migrations
* Hybrid usage: you can use lmdb as key/value store along side using Brainiac
* safety

## Hybrid usage
doesn't block normal usage of lmdb. use lmdb as a lightweight keystore when you need to and add in orm usage from Brainiac when you need to. 
Brainiac uses a `$` prefix on keys to prevent key colisions with all your normal keys.

## Safety

* all records retrieved are validated against zod schema. Zod schemas can provide even more validation than sql in postgres so your validator can now encode even more business logic.
* all records being stored are validated against zod schema to ensure the database never looses integrity
* normally key/value stores you just trust that the value at a key is what you want. Brainia stores both the ID and model name inside the object so you can validate if the value is what you were expecting.
* our migratinos are insanely simple whilst providing a ton of safety featurse:
    * all migrations are run each inside a transaction so if any migration fails, the transaction rollsback and don't need to write a `down`.
    * all migrations can specify what models are effected by the migration and then all records in teh database are validated against the old models before the migratino and the new models after the migration. 

## Migration
migrations arn't sql, they're zod transformations.


your entire zod schema is in schema.ts. 
copy the schema from schema.ts to schema-<date>.ts
edit schema.ts to make the change you want.

## Examples

```ts title="./example/basic1.ts"
