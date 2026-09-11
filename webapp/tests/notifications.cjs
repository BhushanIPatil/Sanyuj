const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');
function load(path, imports = {}) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
 vm.runInNewContext(code, { exports, console, require(name) {
   if (name === 'next/server') return { NextResponse };
   if (name === '@/lib/api/cors') return { withCors: (_req, res) => res, corsPreflight: () => new Response(null, { status: 204 }) };
   if (name in imports) return imports[name];
   throw Error('Unexpected dependency: ' + name);
 } });
 return exports;
}
function request(body, method = 'POST', headers = {}) { return new Request('http://localhost/api/notifications/devices', { method, headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }); }
function devices(options = {}) {
 const writes = [];
 const filters = [];
 const admin = {
   rpc: async () => options.rateError ? { error: {} } : { data: { allowed: options.allowed !== false } },
   from(table) { assert.equal(table, 'device_tokens'); return {
     upsert(row) { writes.push(row); return Promise.resolve(options.writeError ? { error: {} } : {}); },
     update(row) { writes.push(row); return { eq(key, value) { filters.push([key, value]); return Promise.resolve({}); } }; },
   }; },
 };
 return { writes, filters, api: load('src/app/api/notifications/devices/route.ts', { '@/lib/auth/admin': { createAdminClient: () => admin }, '@/lib/rate-limit': { clientIp: () => 'test-ip' } }) };
}
test('anonymous registration ignores account and identifying device fields', async () => {
 const h = devices(); const response = await h.api.POST(request({ deviceToken: 'valid-notification-token', user_id: 'injected', deviceId: 'hardware', deviceName: 'Personal name', osVersion: 'private', deviceOs: 'Android', appVersion: '2.0' }));
 assert.equal(response.status, 200);
 assert.deepEqual(Object.keys(h.writes[0]).sort(), ['app_version','device_os','device_token','is_active','last_active_at'].sort());
 assert.equal(h.writes[0].device_token, 'valid-notification-token');
});
test('malformed or excessive registration data is rejected before writes', async () => {
 for (const body of ['{broken', { deviceToken: 'short' }, { deviceToken: 'x'.repeat(2050) }, 'x'.repeat(5001)]) {
 const h = devices(); const res = await h.api.POST(request(body)); assert.ok([400,413].includes(res.status)); assert.equal(h.writes.length, 0);
 }
});
test('registration rate limits fail closed', async () => {
 for (const [options, status] of [[{ allowed: false },429], [{ rateError: true },503]]) {
 const h = devices(options); assert.equal((await h.api.POST(request({deviceToken:'valid-notification-token'}))).status,status); assert.equal(h.writes.length,0);
 }
});
test('device disable is scoped to the supplied token', async () => {
 const h=devices(); assert.equal((await h.api.DELETE(request({deviceToken:'valid-notification-token'},'DELETE'))).status,200);
 assert.deepEqual(h.filters,[['device_token','valid-notification-token']]); assert.equal(h.writes[0].is_active,false);
});
test('retired account and request APIs do not process submitted contact data', async () => {
 for (const path of ['business-requests','auth/login','auth/register','account/delete']) {
 const api=load('src/app/api/'+path+'/route.ts'); const response=await (api.POST || api.DELETE)(request({contact_name:'Do not persist',phone:'123',password:'Do not persist'})); assert.equal(response.status,410);
 }
});
function sender(active) {
 let sent=0;
 const admin={auth:{getUser:async()=>({data:{user:{id:'admin-test'}}})},from(table){assert.equal(table,'admins');const q={select(){return q;},eq(){return q;},maybeSingle:async()=>({data:active===null?null:{id:'admin-test',is_active:active,email:'admin@example.test'}})};return q;}};
 return { get sent(){return sent;},api:load('src/app/api/notifications/send/route.ts',{'@/lib/auth/admin':{createAdminClient:()=>admin},'@/lib/notifications':{sendStoredNotification:async()=>{sent++;return {notificationId:'campaign',successCount:1,failureCount:0,invalidTokens:[]};}}})};
}
test('broadcast requires an active admin',async()=>{
 const guest=sender(true);assert.equal((await guest.api.POST(request({notificationId:'campaign'}))).status,401);assert.equal(guest.sent,0);
 for(const active of [false,null]) {const h=sender(active);assert.equal((await h.api.POST(request({notificationId:'campaign'},'POST',{Authorization:'Bearer test'}))).status,403);assert.equal(h.sent,0);}
 const h=sender(true);assert.equal((await h.api.POST(request({notificationId:'campaign'},'POST',{Authorization:'Bearer test'}))).status,200);assert.equal(h.sent,1);
});
test('broadcast token listing pages beyond the default database limit',async()=>{
 const ranges=[];const api=load('src/lib/notifications/devices.ts');
 const q={select(){return q;},eq(){return q;},order(){return q;},range(start,end){ranges.push([start,end]);return Promise.resolve({data:Array.from({length:start===0?1000:2},(_,i)=>({device_token:'token-'+(start+i)}))});}};
 const tokens=await api.listActiveTokens({from(){return q;}});assert.equal(tokens.length,1002);assert.deepEqual(ranges,[[0,999],[1000,1999]]);
});
