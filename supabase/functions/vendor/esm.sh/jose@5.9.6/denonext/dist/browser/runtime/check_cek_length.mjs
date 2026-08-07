/* esm.sh - jose@5.9.6/dist/browser/runtime/check_cek_length */
import{JWEInvalid as o}from"../../../errors.mjs";var i=(e,t)=>{let n=e.byteLength<<3;if(n!==t)throw new o(`Invalid Content Encryption Key length. Expected ${t} bits, got ${n} bits`)},a=i;export{a as default};
//# sourceMappingURL=check_cek_length.mjs.map