const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
function harness(options = {}) {
 const writes=[], uploads=[], removed=[];
 const admin={rpc:async()=>options.rateError?{error:{}}:{data:{allowed:options.allowed!==false}},storage:{from(bucket){assert.equal(bucket,'request-images');return {upload:async(path,bytes,meta)=>{uploads.push({path,bytes,meta});return options.uploadError?{error:{}}:{};},remove:async paths=>{removed.push(...paths);return {};}};}},from(table){assert.equal(table,'content_requests');return {insert:async row=>{writes.push(row);return options.insertError?{error:{}}:{};}};}};
 const exports={};
 const code=ts.transpileModule(fs.readFileSync('src/app/api/content-requests/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,Request,Uint8Array,console,require(name){
   if(name==='next/server') return {NextResponse};
   if(name==='node:crypto') return require(name);
   if(name==='@/lib/auth/admin') return {createAdminClient:()=>admin};
   if(name==='@/lib/rate-limit') return {clientIp:()=> 'test-ip'};
   if(name==='@/lib/api/cors') return {withCors:(_req,res)=>res,corsPreflight:()=>new Response(null,{status:204})};
   throw Error(name);
 }});
 return {api:exports,writes,uploads,removed};
}
function request(overrides={}, image=png) {
 const form=new FormData();
 for(const [k,v] of Object.entries({kind:'offer',name:'Test Person',contact:'9123456780',details:'Our local offer',...overrides})) form.set(k,v);
 if(image!==null) form.set('image',new Blob([image],{type:'image/png'}),'poster.png');
 return new Request('http://localhost/api/content-requests',{method:'POST',body:form});
}
test('all request types store only approved contact fields with a private image',async()=>{
 for(const kind of ['offer','notice','service']) {
  const h=harness();const res=await h.api.POST(request({kind,status:'published',follow_up_notes:'injected'}));
  assert.equal(res.status,201);const result=await res.json();assert.equal(result.ok,true);assert.equal(h.writes.length,1);
  assert.equal(h.writes[0].kind,kind);assert.equal(h.writes[0].status,undefined);assert.equal(h.writes[0].follow_up_notes,undefined);
  assert.equal(h.writes[0].image_path,h.uploads[0].path);assert.equal(h.uploads[0].meta.contentType,'image/png');
 }
});
test('invalid contact, kind, missing image and non-image files are rejected',async()=>{
 for(const req of [request({kind:'unknown'}),request({name:' '}),request({contact:'bad'}),request({details:'x'.repeat(2001)}),request({},null),request({},Buffer.from('<svg onload="alert(1)"/>'))]) {
  const h=harness();assert.equal((await h.api.POST(req)).status,400);assert.equal(h.writes.length,0);assert.equal(h.uploads.length,0);
 }
});
test('oversized bodies and upload failures never insert requests',async()=>{
 const large=harness();assert.equal((await large.api.POST(request({},Buffer.alloc(3*1024*1024+20000)))).status,413);assert.equal(large.writes.length,0);
 const failed=harness({uploadError:true});assert.equal((await failed.api.POST(request())).status,503);assert.equal(failed.writes.length,0);
});
test('rate limiting fails closed before uploads',async()=>{
 for(const [options,status] of [[{allowed:false},429],[{rateError:true},503]]) {
  const h=harness(options);assert.equal((await h.api.POST(request())).status,status);assert.equal(h.uploads.length,0);
 }
});
test('failed database writes clean up the uploaded image',async()=>{
 const h=harness({insertError:true});assert.equal((await h.api.POST(request())).status,503);assert.equal(h.removed[0],h.uploads[0].path);
});
