/* esm.sh - jose@5.9.6/dist/browser/lib/check_iv_length */
import{JWEInvalid as n}from"../../../errors.mjs";import{bitLength as e}from"./iv.mjs";var o=(t,i)=>{if(i.length<<3!==e(t))throw new n("Invalid Initialization Vector length")},l=o;export{l as default};
//# sourceMappingURL=check_iv_length.mjs.map