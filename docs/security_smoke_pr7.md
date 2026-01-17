# PR#7 Storage lockdown (logos, gear-images) smoke

## Inputs
- PROJECT_URL, anon key (if needed for list), provider UUIDs, sample object paths.
- Known public object URL for logos/gear-images: `https://<project>.supabase.co/storage/v1/object/public/<bucket>/<provider_id>/...`

## Scenarios
A) Anon GET known object (public read)
```bash
curl -I https://<project>.supabase.co/storage/v1/object/public/logos/<provider_id>/logo.png
# Expect: 200
```

B) Anon LIST root or other provider prefix (should be denied/empty)
```bash
curl -i -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "https://<project>.supabase.co/storage/v1/object/list/logos?prefix="
# Expect: 401/403 (no select policy for anon)
```

C) Auth non-member LIST other prefix (deny)
```bash
curl -i -H "Authorization: Bearer $USER_JWT" \
  "https://<project>.supabase.co/storage/v1/object/list/gear-images?prefix=<other_provider>/"
# Expect: 401/403/empty
```

D) Member LIST own prefix (allowed)
```bash
curl -i -H "Authorization: Bearer $MEMBER_JWT" \
  "https://<project>.supabase.co/storage/v1/object/list/gear-images?prefix=<my_provider>/"
# Expect: 200 with objects (if present)
```

E) Non-member DELETE other provider object (deny)
```bash
curl -i -X DELETE \
  -H "Authorization: Bearer $USER_JWT" \
  "https://<project>.supabase.co/storage/v1/object/gear-images/<other_provider>/somefile.jpg"
# Expect: 401/403
```

F) Member DELETE own object (allowed)
```bash
curl -i -X DELETE \
  -H "Authorization: Bearer $MEMBER_JWT" \
  "https://<project>.supabase.co/storage/v1/object/gear-images/<my_provider>/somefile.jpg"
# Expect: 200/204
```

G) Upload without service_role (deny)
```bash
curl -i -X POST \
  -H "Authorization: Bearer $USER_JWT" \
  -F file=@/tmp/test.jpg \
  "https://<project>.supabase.co/storage/v1/object/gear-images/<my_provider>/test.jpg"
# Expect: 401/403
```

H) Upload via signed URL (service role flow) – optional
- Use upload_ticket or signed URL issuance to obtain signed URL, then PUT object; expect 200.

## Policy expectations (verification)
- Buckets logos, gear-images: `public = true`, damage-photos: `public = false`.
- storage.objects policies present:
  - service_upload_only_public_buckets (INSERT service_role for gear-images, logos)
  - gear_images_select_member / logos_select_member (authenticated member/admin prefix-bound)
  - gear_images_delete_member / logos_delete_member (authenticated member/admin prefix-bound)
  - public_buckets_update_service (UPDATE service_role only)

## Prefix guard
- Policies use `split_part(name,'/',1)` = provider UUID to scope to tenant prefix; prefix collisions like `<uuid>X/` should be denied by membership checks.
