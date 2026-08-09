/* esm.sh - jose@5.9.6/dist/browser/runtime/check_key_length */
var o=(t,e)=>{if(t.startsWith("RS")||t.startsWith("PS")){let{modulusLength:r}=e.algorithm;if(typeof r!="number"||r<2048)throw new TypeError(`${t} requires key modulusLength to be 2048 bits or larger`)}};export{o as default};
//# sourceMappingURL=check_key_length.mjs.map