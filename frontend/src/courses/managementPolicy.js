export function isAdmin(user) {
  return Boolean(user?.roles?.includes('admin'))
}

export function wasPublished(course) {
  return Boolean(course?.current_published_version ||
    course?.versions?.some(version => version.state === 'published'))
}

export function canManageCourse(user, course) {
  if (isAdmin(user)) return course?.visibility === 'public' || course?.owner === user.id
  return Boolean(user?.roles?.includes('mentor') && course?.owner === user.id &&
    (course.visibility === 'private' || !wasPublished(course)))
}

export function canManageVersion(user, version, course) {
  // A public mentor needs explicit history before any mutation is offered.
  if (!isAdmin(user) && version.course_visibility === 'public' && !course) return false
  return canManageCourse(user, course ?? {
    owner: version.course_owner,
    visibility: version.course_visibility,
    versions: [version],
  })
}

// A version number alone is not proof of a publication. The mentor author
// needs history for mutations; a non-owner admin needs it for direct publish.
export function needsPublicationHistory(user, version) {
  if (version.course_visibility !== 'public') return false
  if (isAdmin(user)) {
    return version.course_owner !== user.id && version.number >= 2 &&
      ['draft', 'rejected'].includes(version.state)
  }
  return user?.roles?.includes('mentor') &&
    version.course_owner === user.id && version.state !== 'published'
}

export function canPublishVersion(user, version, course) {
  if (!canManageVersion(user, version, course)) return false
  if (version.course_visibility === 'private') return true
  return isAdmin(user) && (version.course_owner === user.id ||
    (version.number >= 2 && wasPublished(course)))
}
