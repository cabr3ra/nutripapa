-- Spec 003 — Storage: bucket privado para los PDF enviados a la nutricionista.
-- Cada usuario solo puede subir y leer archivos dentro de su carpeta `{auth.uid()}/…`.
-- No hay políticas de update ni delete: el PDF archivado queda tal como se envió.
-- Ninguna política para `anon`: sin sesión no se puede leer ni subir nada.
-- No se activa RLS en storage.objects: Supabase ya lo trae activo y la tabla no es nuestra.

-- Bucket privado: solo PDF y hasta 10 MB (10 * 1024 * 1024 bytes).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sent-pdfs', 'sent-pdfs', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Lectura: el usuario autenticado solo ve los archivos de su propia carpeta.
create policy "sent_pdfs_owner_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'sent-pdfs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Subida: el usuario autenticado solo puede subir dentro de su propia carpeta.
create policy "sent_pdfs_owner_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'sent-pdfs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
