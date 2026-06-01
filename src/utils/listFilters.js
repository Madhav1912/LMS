function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

export function filterCoursesBySearch(courses, query) {
  const q = normalizeQuery(query);
  if (!q) return courses;

  return courses.filter((course) => {
    const title = (course.title ?? '').toLowerCase();
    const description = (course.description ?? '').toLowerCase();
    return title.includes(q) || description.includes(q);
  });
}

export function filterUsersBySearch(users, query) {
  const q = normalizeQuery(query);
  if (!q) return users;

  return users.filter((user) => {
    const name = (user.full_name ?? '').toLowerCase();
    const email = (user.email ?? '').toLowerCase();
    const designation = (user.designation ?? '').toLowerCase();
    const department = (user.department ?? '').toLowerCase();
    return (
      name.includes(q) ||
      email.includes(q) ||
      designation.includes(q) ||
      department.includes(q)
    );
  });
}

export function filterUsersByDepartment(users, department) {
  if (!department) return users;
  if (department === '__none__') {
    return users.filter((user) => !user.department?.trim());
  }
  return users.filter(
    (user) => (user.department ?? '').toLowerCase() === department.toLowerCase()
  );
}

export function getUniqueDepartments(users) {
  const values = new Set();
  for (const user of users) {
    const dept = user.department?.trim();
    if (dept) values.add(dept);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}
