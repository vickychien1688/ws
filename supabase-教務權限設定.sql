-- ws.our-reading-space.com 學習單工具：開放教務共用帳號
-- 2026-08-07 建立。把 ws-projects 的門禁名單從「只有 Vicky」改成「Vicky＋教務」。
-- 用法：Supabase Dashboard → SQL Editor → 貼上全部 → Run。

drop policy if exists "ws read" on storage.objects;
drop policy if exists "ws insert" on storage.objects;
drop policy if exists "ws update" on storage.objects;
drop policy if exists "ws delete" on storage.objects;

create policy "ws read" on storage.objects
  for select to authenticated
  using (bucket_id = 'ws-projects'
    and auth.email() in ('vickychien127@gmail.com', 'pas.english@gmail.com'));

create policy "ws insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ws-projects'
    and auth.email() in ('vickychien127@gmail.com', 'pas.english@gmail.com'));

create policy "ws update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ws-projects'
    and auth.email() in ('vickychien127@gmail.com', 'pas.english@gmail.com'))
  with check (bucket_id = 'ws-projects'
    and auth.email() in ('vickychien127@gmail.com', 'pas.english@gmail.com'));

create policy "ws delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ws-projects'
    and auth.email() in ('vickychien127@gmail.com', 'pas.english@gmail.com'));

-- 注意：Vicky 私人雲端硬碟（vicky-drive）的政策完全沒動，教務進不去。
-- 之後要加人或換人：改上面的 email 名單，整段重新執行一次即可。
-- （AI 修圖功能另有名單，在 Edge Function ws-ai-edit 裡的 ALLOWED_EMAILS。）
