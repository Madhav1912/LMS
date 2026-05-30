import { supabase } from './supabaseClient';

export async function fetchPublishedCoursesForAssign() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, status')
    .eq('status', 'published')
    .order('title');

  if (error) throw error;
  return data ?? [];
}

export async function fetchUserCourseProgress(userId) {
  const { data, error } = await supabase.rpc('admin_get_user_course_progress', {
    p_user_id: userId,
  });

  if (error) throw error;
  return data ?? [];
}

export async function assignCourseToUser({ userId, courseId, assignedBy }) {
  const { data, error } = await supabase
    .from('course_enrollments')
    .insert({
      user_id: userId,
      course_id: courseId,
      source: 'admin',
      assigned_by: assignedBy,
      status: 'assigned',
    })
    .select('id, course_id, status, assigned_at, time_spent_ms')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This course is already assigned to the user.');
    }
    throw error;
  }
  return data;
}

export async function unassignCourse(enrollmentId) {
  const { error } = await supabase.from('course_enrollments').delete().eq('id', enrollmentId);
  if (error) throw error;
}
