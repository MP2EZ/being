/* esm.sh - jose@5.9.6/dist/browser/runtime/is_key_like */
import{isCryptoKey as r}from"./webcrypto.mjs";var o=t=>r(t)?!0:t?.[Symbol.toStringTag]==="KeyObject",p=["CryptoKey"];export{o as default,p as types};
//# sourceMappingURL=is_key_like.mjs.map