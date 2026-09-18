// Disposable PostgreSQL tests with minimal Supabase Auth/Storage fixtures.
const fs = require("fs");
const { PGlite } = require("@electric-sql/pglite");
(async () => {
  const db = new PGlite();
  await db.exec(
    String.raw`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;create schema storage;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant all on sequences to anon,authenticated,service_role;
 create table auth.users(id uuid primary key,phone text,email text,raw_user_meta_data jsonb default '{}'::jsonb,banned_until timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.role() returns text language sql stable as $$ select current_user::text $$;
 create table storage.buckets(id text primary key,name text,public boolean);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
`,
  );
  for (const name of fs.readdirSync("supabase/migrations").sort()) {
    if (name === "20260910120000_business_requests.sql")
      await db.exec(
        String.raw`
 insert into auth.users(id,email) values ('30000000-0000-0000-0000-000000000001','migration-owner@example.test'),('30000000-0000-0000-0000-000000000002','migration-admin@example.test');
 insert into public.admins(id,email) values ('30000000-0000-0000-0000-000000000002','migration-admin@example.test');
 update public.profiles set full_name='Existing contact',phone='9123456780',pincode='425001',address='Existing address',lat=21,lng=75 where id='30000000-0000-0000-0000-000000000001';
 insert into public.businesses(id,owner_id,name,category_id) select '30000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','Existing business',id from public.categories where is_active and not is_deleted limit 1;
`,
      );
    if (name === "20260911120000_offers_notifications_only.sql") await db.exec(`
      insert into public.ads(id,brand_name,title) values('40000000-0000-0000-0000-000000000001','Test advertiser','Preserved offer');
      insert into public.notices(id,title) values('40000000-0000-0000-0000-000000000002','Preserved notice');
      insert into public.device_tokens(user_id,device_token,device_name) values(null,'anonymous-token','Private device name'),('30000000-0000-0000-0000-000000000001','legacy-token','Legacy name');
      insert into public.api_rate_limits(action,subject_type,subject_key) values('legacy_auth','email','old@example.test');
    `);
    if (name === "20260917120000_remove_services.sql") await db.exec(`
      insert into public.services(title) values('Retired listing');
      insert into public.content_requests(kind,name,contact,image_path) values('service','Retired request','9123456780','retired-request.png');
    `);
    let sql = fs
      .readFileSync("supabase/migrations/" + name, "utf8")
      .replace(/create extension if not exists "pgcrypto";/i, "");
    try {
      await db.exec(sql);
    } catch (e) {
      console.error("FAILED migration:", name, e.message, e.position);
      process.exit(1);
    }
  }
  console.log("All migrations applied to disposable PostgreSQL.");
  await db.exec(fs.readFileSync("supabase/tests/offers_notifications.sql", "utf8"));
  console.log("Retirement, content access and admin authorization tests passed.");
  await db.exec(fs.readFileSync("supabase/tests/remove_services.sql", "utf8"));
  console.log("Services removal and remaining content checks passed.");
  await db.exec(fs.readFileSync("supabase/tests/content_requests.sql", "utf8"));
  console.log("Private request and admin follow-up access tests passed.");
  await db.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
