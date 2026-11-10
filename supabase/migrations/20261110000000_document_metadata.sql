-- Web pages saved from the extension keep their author and site name, and the
-- clients look up existing documents by URL to avoid saving duplicates.

alter table public.documents
  add column author text check (char_length(author) <= 300),
  add column site_name text check (char_length(site_name) <= 200);

create index documents_user_source_idx on public.documents (user_id, source_name)
  where source_name is not null;

-- Recreated with two optional trailing parameters; existing callers that pass
-- only the original five keep working.
drop function public.create_document(text, public.document_source, text, text, jsonb);

create function public.create_document(
  p_title text,
  p_source_type public.document_source,
  p_body text,
  p_source_name text default null,
  p_sections jsonb default '[]'::jsonb,
  p_author text default null,
  p_site_name text default null
)
returns public.documents
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_doc public.documents;
  v_body text := btrim(p_body);
begin
  if v_body = '' then
    raise exception 'Document body is empty';
  end if;

  insert into public.documents (title, source_type, source_name, word_count, author, site_name)
  values (
    left(btrim(p_title), 300),
    p_source_type,
    p_source_name,
    coalesce(array_length(regexp_split_to_array(v_body, '\s+'), 1), 0),
    nullif(left(btrim(p_author), 300), ''),
    nullif(left(btrim(p_site_name), 200), '')
  )
  returning * into v_doc;

  insert into public.document_contents (document_id, body, sections)
  values (v_doc.id, v_body, coalesce(p_sections, '[]'::jsonb));

  return v_doc;
end;
$$;

revoke execute on function public.create_document(text, public.document_source, text, text, jsonb, text, text) from public, anon;
grant execute on function public.create_document(text, public.document_source, text, text, jsonb, text, text) to authenticated;
