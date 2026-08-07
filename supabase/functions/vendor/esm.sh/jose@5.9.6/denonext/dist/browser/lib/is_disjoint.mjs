/* esm.sh - jose@5.9.6/dist/browser/lib/is_disjoint */
var a=(...o)=>{let t=o.filter(Boolean);if(t.length===0||t.length===1)return!0;let e;for(let s of t){let r=Object.keys(s);if(!e||e.size===0){e=new Set(r);continue}for(let n of r){if(e.has(n))return!1;e.add(n)}}return!0},c=a;export{c as default};
//# sourceMappingURL=is_disjoint.mjs.map