/* esm.sh - jose@5.9.6/dist/browser/runtime/digest */
import r from"./webcrypto.mjs";var i=async(t,e)=>{let s=`SHA-${t.slice(-3)}`;return new Uint8Array(await r.subtle.digest(s,e))},o=i;export{o as default};
//# sourceMappingURL=digest.mjs.map