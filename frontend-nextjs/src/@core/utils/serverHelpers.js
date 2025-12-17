// Next Imports
import { cookies } from 'next/headers'

// Third-party Imports
import 'server-only'

// Config Imports
import themeConfig from '@configs/themeConfig'

export const getSettingsFromCookie = async () => {
  try {
    const cookieStore = await cookies()
    const cookieName = themeConfig.settingsCookieName
    const cookieValue = cookieStore.get(cookieName)?.value

    if (!cookieValue) {
      return {}
    }

    try {
      return JSON.parse(cookieValue)
    } catch (e) {
      // Invalid JSON in cookie, return empty object
      return {}
    }
  } catch (error) {
    // If cookies() fails, return empty object
    return {}
  }
}

export const getMode = async () => {
  try {
    const settingsCookie = await getSettingsFromCookie()

    // Get mode from cookie or fallback to theme config
    const _mode = settingsCookie.mode || themeConfig.mode

    return _mode
  } catch (error) {
    console.warn('Failed to get mode:', error)
    return themeConfig.mode || 'light'
  }
}

export const getSystemMode = async () => {
  try {
    const cookieStore = await cookies()
    const mode = await getMode()
    const colorPrefCookie = cookieStore.get('colorPref')?.value || 'light'

    return (mode === 'system' ? colorPrefCookie : mode) || 'light'
  } catch (error) {
    // If cookies() fails, return default light mode
    return 'light'
  }
}

export const getServerMode = async () => {
  const mode = await getMode()
  const systemMode = await getSystemMode()

  return mode === 'system' ? systemMode : mode
}

export const getSkin = async () => {
  const settingsCookie = await getSettingsFromCookie()

  return settingsCookie.skin || 'default'
}
