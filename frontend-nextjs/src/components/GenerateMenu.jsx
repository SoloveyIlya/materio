// Next Imports
import { useParams } from 'next/navigation'

// React Imports
import { Fragment } from 'react'

// MUI Imports
import Chip from '@mui/material/Chip'

// Component Imports
import { SubMenu as HorizontalSubMenu, MenuItem as HorizontalMenuItem } from '@menu/horizontal-menu'
import { SubMenu as VerticalSubMenu, MenuItem as VerticalMenuItem, MenuSection } from '@menu/vertical-menu'

// Util Imports
import { getLocalizedUrl } from '@/utils/i18n'

// Generate a menu from the menu data array
export const GenerateVerticalMenu = ({ menuData }) => {
  // Hooks
  const params = useParams()
  const locale = params?.lang || 'en'

  const renderMenuItems = data => {
    // Use the map method to iterate through the array of menu data
    return data.map((item, index) => {
      const menuSectionItem = item
      const subMenuItem = item
      const menuItem = item

      // Check if the current item is a section
      if (menuSectionItem.isSection) {
        const { children, isSection, ...rest } = menuSectionItem

        // If it is, return a MenuSection component and call generateMenu with the current menuSectionItem's children
        return (
          <MenuSection key={index} {...rest}>
            {children && renderMenuItems(children)}
          </MenuSection>
        )
      }

      // Check if the current item is a sub menu
      if (subMenuItem.children) {
        const { children, icon, prefix, suffix, ...rest } = subMenuItem
        const Icon = icon ? <i className={icon} /> : null
        const subMenuPrefix = prefix && prefix.label ? (() => {
          const { key, ...prefixProps } = prefix
          return <Chip size='small' {...prefixProps} />
        })() : prefix
        // Поддержка массива suffix для отображения нескольких бейджей
        const subMenuSuffix = Array.isArray(suffix) 
          ? <Fragment>{suffix.map((s, idx) => {
              if (!s || !s.label) return null
              const { key: sKey, ...sProps } = s
              return <Chip key={sKey || idx} size='small' {...sProps} sx={{ ml: 0.5 }} />
            }).filter(Boolean)}</Fragment>
          : (suffix && suffix.label ? (() => {
              const { key, ...suffixProps } = suffix
              return <Chip size='small' {...suffixProps} />
            })() : suffix)

        // If it is, return a SubMenu component and call generateMenu with the current subMenuItem's children
        return (
          <VerticalSubMenu
            key={index}
            prefix={subMenuPrefix}
            suffix={subMenuSuffix}
            {...rest}
            {...(Icon && { icon: Icon })}
          >
            {children && renderMenuItems(children)}
          </VerticalSubMenu>
        )
      }

      // If the current item is neither a section nor a sub menu, return a MenuItem component
      const { label, excludeLang, icon, prefix, suffix, ...rest } = menuItem

      // Localize the href (simplified - no locale prefix)
      const href = rest.href?.startsWith('http')
        ? rest.href
        : rest.href || '#'

      const Icon = icon ? <i className={icon} /> : null
      const menuItemPrefix = prefix && prefix.label ? (() => {
        const { key, ...prefixProps } = prefix
        return <Chip size='small' {...prefixProps} />
      })() : prefix
      // Поддержка массива suffix для отображения нескольких бейджей
      const menuItemSuffix = Array.isArray(suffix) 
        ? <Fragment>{suffix.map((s, idx) => {
            if (!s || !s.label) return null
            const { key: sKey, ...sProps } = s
            return <Chip key={sKey || idx} size='small' {...sProps} sx={{ ml: 0.5 }} />
          }).filter(Boolean)}</Fragment>
        : (suffix && suffix.label ? (() => {
            const { key, ...suffixProps } = suffix
            return <Chip size='small' {...suffixProps} />
          })() : suffix)

      return (
        <VerticalMenuItem
          key={index}
          prefix={menuItemPrefix}
          suffix={menuItemSuffix}
          {...rest}
          href={href}
          {...(Icon && { icon: Icon })}
        >
          {label}
        </VerticalMenuItem>
      )
    })
  }

  return <>{renderMenuItems(menuData)}</>
}

// Generate a menu from the menu data array
export const GenerateHorizontalMenu = ({ menuData }) => {
  // Hooks
  const params = useParams()
  const locale = params?.lang || 'en'

  const renderMenuItems = data => {
    // Use the map method to iterate through the array of menu data
    return data.map((item, index) => {
      const subMenuItem = item
      const menuItem = item

      // Check if the current item is a sub menu
      if (subMenuItem.children) {
        const { children, icon, prefix, suffix, ...rest } = subMenuItem
        const Icon = icon ? <i className={icon} /> : null
        const subMenuPrefix = prefix && prefix.label ? (() => {
          const { key, ...prefixProps } = prefix
          return <Chip size='small' {...prefixProps} />
        })() : prefix
        const subMenuSuffix = suffix && suffix.label ? (() => {
          const { key, ...suffixProps } = suffix
          return <Chip size='small' {...suffixProps} />
        })() : suffix

        // If it is, return a SubMenu component and call generateMenu with the current subMenuItem's children
        return (
          <HorizontalSubMenu
            key={index}
            prefix={subMenuPrefix}
            suffix={subMenuSuffix}
            {...rest}
            {...(Icon && { icon: Icon })}
          >
            {children && renderMenuItems(children)}
          </HorizontalSubMenu>
        )
      }

      // If the current item is not a sub menu, return a MenuItem component
      const { label, excludeLang, icon, prefix, suffix, ...rest } = menuItem

      // Localize the href (simplified - no locale prefix)
      const href = rest.href?.startsWith('http')
        ? rest.href
        : rest.href || '#'

      const Icon = icon ? <i className={icon} /> : null
      const menuItemPrefix = prefix && prefix.label ? (() => {
        const { key, ...prefixProps } = prefix
        return <Chip size='small' {...prefixProps} />
      })() : prefix
      const menuItemSuffix = suffix && suffix.label ? (() => {
        const { key, ...suffixProps } = suffix
        return <Chip size='small' {...suffixProps} />
      })() : suffix

      return (
        <HorizontalMenuItem
          key={index}
          prefix={menuItemPrefix}
          suffix={menuItemSuffix}
          {...rest}
          href={href}
          {...(Icon && { icon: Icon })}
        >
          {label}
        </HorizontalMenuItem>
      )
    })
  }

  return <>{renderMenuItems(menuData)}</>
}
