import { coursesApi } from './api.js'
import { isAdmin, needsPublicationHistory } from './managementPolicy.js'

export async function loadVersionManagement(user, version, courseId, readOnlyFallback = false) {
  if (!needsPublicationHistory(user, version)) return { course: null, managementError: null }
  try {
    return { course: await coursesApi.getMine(courseId), managementError: null }
  } catch (error) {
    // A readable version is independent of the additional permission metadata.
    // Keep the error visible and deny history-dependent mutations if it fails.
    if (!readOnlyFallback && !isAdmin(user)) throw error
    return { course: null, managementError: error }
  }
}
