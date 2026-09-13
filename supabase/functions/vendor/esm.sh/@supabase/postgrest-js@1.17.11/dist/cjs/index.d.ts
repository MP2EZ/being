import PostgrestClient from './PostgrestClient.d.ts';
import PostgrestQueryBuilder from './PostgrestQueryBuilder.d.ts';
import PostgrestFilterBuilder from './PostgrestFilterBuilder.d.ts';
import PostgrestTransformBuilder from './PostgrestTransformBuilder.d.ts';
import PostgrestBuilder from './PostgrestBuilder.d.ts';
import PostgrestError from './PostgrestError.d.ts';
export { PostgrestClient, PostgrestQueryBuilder, PostgrestFilterBuilder, PostgrestTransformBuilder, PostgrestBuilder, PostgrestError, };
declare const _default: {
    PostgrestClient: typeof PostgrestClient;
    PostgrestQueryBuilder: typeof PostgrestQueryBuilder;
    PostgrestFilterBuilder: typeof PostgrestFilterBuilder;
    PostgrestTransformBuilder: typeof PostgrestTransformBuilder;
    PostgrestBuilder: typeof PostgrestBuilder;
    PostgrestError: typeof PostgrestError;
};
export default _default;
export type { PostgrestResponse, PostgrestResponseFailure, PostgrestResponseSuccess, PostgrestSingleResponse, PostgrestMaybeSingleResponse, } from './types.d.ts';
export type { GetResult as UnstableGetResult } from './select-query-parser/result.d.ts';
//# sourceMappingURL=index.d.ts.map
