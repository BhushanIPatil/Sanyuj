// Run with Node 22+. Default is a read-only summary. No credentials/data printed.
// Hosted signup must be disabled before --apply; see OFFERS_NOTIFICATIONS.md.
const apply = process.argv.includes('--apply');
const base = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function api(path, method = 'GET', body) {
 const res = await fetch(base + path, { method, headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 if (!res.ok) throw new Error(method + ' ' + path.split('?')[0] + ' failed (' + res.status + '). Stop and inspect the project before retrying.');
 return res.status === 204 ? null : res.json();
}
async function main() {
 if (!base || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
 const admins = await api('/rest/v1/admins?select=id,is_active&limit=10000');
 if (!admins.some(a => a.is_active)) throw new Error('No active admin registered. Register and verify your admin account before retirement.');
 // Refuse a possibly truncated allowlist rather than risk deleting an administrator.
 if (admins.length >= 1000) throw new Error('Admin allowlist may be truncated; review pagination before cleanup.');
 const adminIds = new Set(admins.map(a => a.id));
 const retiredIds = [];
 for (let page = 1; ; page++) {
   const result = await api('/auth/v1/admin/users?page=' + page + '&per_page=1000');
   retiredIds.push(...result.users.filter(u => !adminIds.has(u.id)).map(u => u.id));
   if (result.users.length < 1000) break;
 }
 const buckets = await api('/storage/v1/bucket');
 const bucket = buckets.find(b => b.id === 'business-photos');
 console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', preservedAdmins: adminIds.size, retiredAccounts: retiredIds.length, removeBusinessPhotoBucket: Boolean(bucket) }));
 if (!apply) return;
 if (bucket) {
   await api('/storage/v1/bucket/business-photos', 'PUT', { public: false });
   await api('/storage/v1/bucket/business-photos/empty', 'POST', {});
   await api('/storage/v1/bucket/business-photos', 'DELETE');
 }
 for (const id of retiredIds) {
   // Recheck immediately before deletion in case an admin was added since the scan.
   const registered = await api('/rest/v1/admins?select=id&id=eq.' + encodeURIComponent(id));
   if (registered.length) continue;
   await api('/auth/v1/admin/users/' + encodeURIComponent(id), 'DELETE', { should_soft_delete: false });
 }
 console.log('Legacy auth accounts and business photo bucket removed. Apply the database migration next.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
