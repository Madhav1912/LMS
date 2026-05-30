import { supabase } from './supabaseClient';
import { getAssetUrl } from './courseService';

const PUBLISHED_COURSE_SELECT = `
  id,
  title,
  description,
  status,
  created_at,
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
      assets (
        storage_bucket,
        storage_path
      )
    )
  )
`;

function sortModules(modules = []) {
  return [...modules]
    .sort((a, b) => a.position - b.position)
    .map((mod) => ({
      id: mod.id,
      title: mod.title,
      description: mod.description ?? '',
      position: mod.position,
      items: [...(mod.module_items ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((item) => ({
          id: item.id,
          title: item.title,
          itemType: item.item_type,
          position: item.position,
          durationSeconds: item.duration_seconds,
          isRequired: item.is_required,
          url: getAssetUrl(item.assets),
        })),
    }));
}

function getFirstLessonUrl(modules) {
  for (const mod of modules) {
    for (const item of mod.items) {
      if (item.url) return item.url;
    }
  }
  return '';
}

function attachItemProgress(modules, itemProgressById) {
  return modules.map((mod) => ({
    ...mod,
    items: mod.items.map((item) => ({
      ...item,
      progressStatus: itemProgressById[item.id]?.status ?? 'not_started',
    })),
  }));
}

export function getCourseLessonStats(modules) {
  const requiredItems = modules.flatMap((m) => m.items.filter((i) => i.isRequired));
  const completed = requiredItems.filter((i) => i.progressStatus === 'completed').length;
  return {
    totalLessons: modules.reduce((sum, m) => sum + m.items.length, 0),
    requiredTotal: requiredItems.length,
    requiredCompleted: completed,
  };
}

export function enrollmentToKanbanStatus(enrollment) {
  if (!enrollment) return 'todo';
  switch (enrollment.status) {
    case 'in_progress':
      return 'in-progress';
    case 'completed':
      return 'done';
    default:
      return 'todo';
  }
}

export function kanbanToEnrollmentStatus(kanbanStatus) {
  switch (kanbanStatus) {
    case 'in-progress':
      return 'in_progress';
    case 'done':
      return 'completed';
    default:
      return 'assigned';
  }
}

export function mapCourseForDashboard(course, enrollment, localProgress = {}, itemProgressById = {}) {
  const modules = attachItemProgress(sortModules(course.course_modules), itemProgressById);
  const stats = getCourseLessonStats(modules);
  const dbTime = enrollment?.time_spent_ms ?? 0;
  const localTime = localProgress.timeTracked ?? 0;
  const timeTracked = Math.max(dbTime, localTime);

  return {
    id: course.id,
    title: course.title,
    description: course.description ?? '',
    url: getFirstLessonUrl(modules),
    status: enrollmentToKanbanStatus(enrollment),
    modules,
    moduleCount: modules.length,
    lessonStats: stats,
    timeTracked,
    currentSessionStart: localProgress.currentSessionStart ?? null,
    startedAt: enrollment?.started_at ? new Date(enrollment.started_at).getTime() : null,
    completedAt: enrollment?.completed_at ? new Date(enrollment.completed_at).getTime() : null,
    enrollmentId: enrollment?.id ?? null,
    source: 'database',
  };
}

export async function fetchAssignedCourses(userId) {
  const { data: enrollments, error: enrollError } = await supabase
    .from('course_enrollments')
    .select('id, course_id, status, started_at, completed_at, time_spent_ms, assigned_at')
    .eq('user_id', userId)
    .neq('status', 'dropped');

  if (enrollError) throw enrollError;
  if (!enrollments?.length) return { enrollments: [], courses: [] };

  const courseIds = enrollments.map((e) => e.course_id);
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select(PUBLISHED_COURSE_SELECT)
    .in('id', courseIds)
    .order('created_at', { ascending: false });

  if (courseError) throw courseError;
  return { enrollments, courses: courses ?? [] };
}

export async function fetchUserEnrollments(userId) {
  const { data, error } = await supabase
    .from('course_enrollments')
    .select('id, course_id, status, started_at, completed_at, time_spent_ms')
    .eq('user_id', userId)
    .neq('status', 'dropped');

  if (error) throw error;
  return data ?? [];
}

export async function fetchUserItemProgress(userId) {
  const { data, error } = await supabase
    .from('item_progress')
    .select('module_item_id, status, progress_percent, completed_at')
    .eq('user_id', userId);

  if (error) throw error;
  return data ?? [];
}

export async function syncEnrollmentStatus({ userId, courseId, enrollment, kanbanStatus, timeSpentMs }) {
  if (!enrollment?.id) {
    throw new Error('This course has not been assigned to you.');
  }

  const dbStatus = kanbanToEnrollmentStatus(kanbanStatus);
  const now = new Date().toISOString();

  const updates = { status: dbStatus };

  if (typeof timeSpentMs === 'number') {
    updates.time_spent_ms = timeSpentMs;
  }

  if (dbStatus === 'in_progress' && !enrollment.started_at) {
    updates.started_at = now;
  }
  if (dbStatus === 'completed') {
    updates.completed_at = now;
    if (!enrollment.started_at) updates.started_at = now;
  }
  if (dbStatus === 'assigned') {
    updates.completed_at = null;
  }

  const { data, error } = await supabase
    .from('course_enrollments')
    .update(updates)
    .eq('id', enrollment.id)
    .select('id, course_id, status, started_at, completed_at, time_spent_ms')
    .single();

  if (error) throw error;
  return data;
}

export async function upsertItemProgress({ userId, moduleItemId, status }) {
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    module_item_id: moduleItemId,
    status,
    progress_percent: status === 'completed' ? 100 : status === 'in_progress' ? 50 : 0,
    last_viewed_at: now,
    completed_at: status === 'completed' ? now : null,
    started_at: status !== 'not_started' ? now : null,
  };

  const { data, error } = await supabase
    .from('item_progress')
    .upsert(payload, { onConflict: 'user_id,module_item_id' })
    .select('module_item_id, status, progress_percent, completed_at')
    .single();

  if (error) throw error;
  return data;
}
