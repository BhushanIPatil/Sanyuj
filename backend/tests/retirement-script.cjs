const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const code=fs.readFileSync('scripts/retire-directory-data.cjs','utf8');
async function run({apply=false,active=true,storageFailure=false,newAdmin=false}={}) {
 const requests=[], logs=[];let adminReads=0;
 const process={argv:apply?['node','script','--apply']:['node','script'],env:{SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'test-key'}};
 await vm.runInNewContext(code,{process,console:{log:s=>logs.push(s),error:s=>logs.push(s)},fetch:async(url,opts)=>{
 const path=new URL(url).pathname;requests.push([opts.method,path]);let data={};
 if(path==='/rest/v1/admins') {adminReads++;data=adminReads===1?[{id:'admin',is_active:active}]:newAdmin?[{id:'customer',is_active:true}]:[];}
 else if(path==='/auth/v1/admin/users')data={users:[{id:'admin'},{id:'customer'}]};
 else if(path==='/storage/v1/bucket')data=[{id:'business-photos'}];
 return {ok:!(storageFailure&&path.endsWith('/empty')),status:storageFailure&&path.endsWith('/empty')?500:200,json:async()=>data};
 }});
 return {requests,logs,process};
}
test('retirement dry-run performs only reads and prints counts',async()=>{const result=await run();assert.ok(result.requests.every(([method])=>method==='GET'));assert.equal(JSON.parse(result.logs[0]).retiredAccounts,1);});
test('cleanup preserves admins and removes only the retired bucket and customer',async()=>{const result=await run({apply:true});assert.equal(result.process.exitCode,undefined);assert.ok(result.requests.some(([method,path])=>method==='DELETE'&&path==='/auth/v1/admin/users/customer'));assert.ok(!result.requests.some(([method,path])=>method==='DELETE'&&path==='/auth/v1/admin/users/admin'));});
test('missing active admin blocks all writes',async()=>{const result=await run({apply:true,active:false});assert.equal(result.process.exitCode,1);assert.ok(result.requests.every(([method])=>method==='GET'));});
test('storage failure stops before account deletion',async()=>{const result=await run({apply:true,storageFailure:true});assert.equal(result.process.exitCode,1);assert.ok(!result.requests.some(([method,path])=>method==='DELETE'&&path.startsWith('/auth/')));});
test('admin registration added after enumeration is preserved',async()=>{const result=await run({apply:true,newAdmin:true});assert.ok(!result.requests.some(([method,path])=>method==='DELETE'&&path.startsWith('/auth/')));});
