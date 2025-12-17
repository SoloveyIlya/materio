// Util Imports
import { ensurePrefix } from '@/utils/string'

// Get the localized url (simplified version without i18n)
export const getLocalizedUrl = (url, languageCode) => {
  if (!url) return '/'
  // Simply return URL without localization
  return ensurePrefix(url, '/')
}
