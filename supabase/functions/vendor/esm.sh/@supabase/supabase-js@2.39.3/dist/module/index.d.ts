import SupabaseClient from './SupabaseClient.d.ts';
import type { GenericSchema, SupabaseClientOptions } from './lib/types.d.ts';
export * from 'https://esm.sh/@supabase/gotrue-js@2.67.3/dist/module/index.d.ts';
export type { User as AuthUser, Session as AuthSession } from 'https://esm.sh/@supabase/gotrue-js@2.67.3/dist/module/index.d.ts';
export type { PostgrestResponse, PostgrestSingleResponse, PostgrestMaybeSingleResponse, PostgrestError, } from 'https://esm.sh/@supabase/postgrest-js@1.17.11/dist/cjs/index.d.ts';
export { FunctionsHttpError, FunctionsFetchError, FunctionsRelayError, FunctionsError, } from 'https://esm.sh/@supabase/functions-js@2.4.4/dist/module/index.d.ts';
export * from 'https://esm.sh/@supabase/realtime-js@2.11.3/dist/module/index.d.ts';
export { default as SupabaseClient } from './SupabaseClient.d.ts';
export type { SupabaseClientOptions, QueryResult, QueryData, QueryError } from './lib/types.d.ts';
/**
 * Creates a new Supabase Client.
 */
export declare const createClient: <Database = any, SchemaName extends string & keyof Database = "public" extends keyof Database ? "public" : string & keyof Database, Schema extends GenericSchema = Database[SchemaName] extends GenericSchema ? Database[SchemaName] : any>(supabaseUrl: string, supabaseKey: string, options?: SupabaseClientOptions<SchemaName> | undefined) => SupabaseClient<Database, SchemaName, Schema>;
//# sourceMappingURL=index.d.ts.map
