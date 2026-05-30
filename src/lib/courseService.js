import { supabase } from './supabaseClient';

const COURSE_SELECT = `
  id,
  title,
  description,
  status,
  created_at,
  updated_at,
  course_modules (
    id,
    title,
    description,
    position,
    module_items (
      id,
      title,
      item_type,
      position,
      duration_seconds,
      is_required,
      asset_id,
      assets (
        id,
        kind,
        storage_bucket,
        storage_path,
        content_type
      )
    )
  )
`;

function sortCourseContent(course) {
  if (!course) return course;

  const modules = [...(course.course_modules ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((mod) => ({
      ...mod,
      module_items: [...(mod.module_items ?? [])].sort((a, b) => a.position - b.position),
    }));

  return { ...course, course_modules: modules };
}

export function getAssetUrl(asset) {
  if (!asset) return '';
  if (asset.storage_bucket === 'external') return asset.storage_path;
  const { data } = supabase.storage.from(asset.storage_bucket).getPublicUrl(asset.storage_path);
  return data?.publicUrl ?? asset.storage_path;
}

export async function fetchCoursesList() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, description, status, created_at, updated_at, course_modules(count)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchCourseWithContent(courseId) {
  const { data, error } = await supabase
    .from('courses')
    .select(COURSE_SELECT)
    .eq('id', courseId)
    .single();

  if (error) throw error;
  return sortCourseContent(data);
}

export async function createCourse({ title, description, status, createdBy }) {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      title,
      description,
      status: status ?? 'draft',
      created_by: createdBy,
    })
    .select('id, title, description, status, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateCourse(courseId, { title, description, status }) {
  const { data, error } = await supabase
    .from('courses')
    .update({ title, description, status })
    .eq('id', courseId)
    .select('id, title, description, status, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCourse(courseId) {
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) throw error;
}

export async function createExternalAsset({ url, kind, userId }) {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('Asset URL is required.');
  }
  if (!kind || !['video', 'pdf', 'image', 'other'].includes(kind)) {
    throw new Error(`Invalid asset kind: ${kind ?? 'missing'}`);
  }

  const { data, error } = await supabase
    .from('assets')
    .insert({
      kind,
      storage_bucket: 'external',
      storage_path: trimmed,
      content_type: kind === 'video' ? 'video/url' : 'application/pdf',
      created_by: userId,
    })
    .select('id, kind, storage_bucket, storage_path, content_type')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This URL is already registered as an asset.');
    }
    throw error;
  }
  return data;
}

export async function updateExternalAsset(assetId, { url, kind }) {
  const trimmed = url.trim();
  const { data, error } = await supabase
    .from('assets')
    .update({
      kind,
      storage_path: trimmed,
      content_type: kind === 'video' ? 'video/url' : 'application/pdf',
    })
    .eq('id', assetId)
    .select('id, kind, storage_bucket, storage_path, content_type')
    .single();

  if (error) throw error;
  return data;
}

export async function createModule({ courseId, title, description, position }) {
  const { data, error } = await supabase
    .from('course_modules')
    .insert({
      course_id: courseId,
      title,
      description: description || null,
      position,
    })
    .select('id, title, description, position')
    .single();

  if (error) throw error;
  return data;
}

export async function updateModule(moduleId, { title, description }) {
  const { data, error } = await supabase
    .from('course_modules')
    .update({ title, description: description || null })
    .eq('id', moduleId)
    .select('id, title, description, position')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteModule(moduleId) {
  const { error } = await supabase.from('course_modules').delete().eq('id', moduleId);
  if (error) throw error;
}

export async function createModuleItem({
  moduleId,
  title,
  itemType,
  item_type,
  url,
  durationSeconds,
  duration_seconds,
  isRequired,
  is_required,
  userId,
  position,
}) {
  const resolvedType = itemType ?? item_type;
  if (!resolvedType || !['video', 'pdf'].includes(resolvedType)) {
    throw new Error('Item type must be video or pdf.');
  }
  if (!url?.trim()) {
    throw new Error('Content URL is required.');
  }

  const asset = await createExternalAsset({
    url,
    kind: resolvedType,
    userId,
  });

  const { data, error } = await supabase
    .from('module_items')
    .insert({
      module_id: moduleId,
      title,
      item_type: resolvedType,
      asset_id: asset.id,
      position,
      duration_seconds: durationSeconds ?? duration_seconds ?? null,
      is_required: isRequired ?? is_required ?? true,
    })
    .select(`
      id,
      title,
      item_type,
      position,
      duration_seconds,
      is_required,
      asset_id,
      assets ( id, kind, storage_bucket, storage_path, content_type )
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function updateModuleItem({
  itemId,
  assetId,
  title,
  itemType,
  item_type,
  url,
  durationSeconds,
  duration_seconds,
  isRequired,
  is_required,
}) {
  const resolvedType = itemType ?? item_type;
  if (!resolvedType || !['video', 'pdf'].includes(resolvedType)) {
    throw new Error('Item type must be video or pdf.');
  }
  if (!url?.trim()) {
    throw new Error('Content URL is required.');
  }

  await updateExternalAsset(assetId, { url, kind: resolvedType });

  const { data, error } = await supabase
    .from('module_items')
    .update({
      title,
      item_type: resolvedType,
      duration_seconds: durationSeconds ?? duration_seconds ?? null,
      is_required: isRequired ?? is_required ?? true,
    })
    .eq('id', itemId)
    .select(`
      id,
      title,
      item_type,
      position,
      duration_seconds,
      is_required,
      asset_id,
      assets ( id, kind, storage_bucket, storage_path, content_type )
    `)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteModuleItem(itemId) {
  const { error } = await supabase.from('module_items').delete().eq('id', itemId);
  if (error) throw error;
}

export async function getNextModulePosition(courseId) {
  const { data, error } = await supabase
    .from('course_modules')
    .select('position')
    .eq('course_id', courseId)
    .order('position', { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data?.[0]?.position ?? 0) + 1;
}

export async function getNextItemPosition(moduleId) {
  const { data, error } = await supabase
    .from('module_items')
    .select('position')
    .eq('module_id', moduleId)
    .order('position', { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data?.[0]?.position ?? 0) + 1;
}
