const verticalMenuData = (user = null) => {
  const baseMenu = [
    {
      label: 'Home',
      icon: 'ri-home-smile-line',
      href: '/home'
    },
    {
      label: 'Dashboard',
      icon: 'ri-dashboard-3-line',
      href: '/dashboard'
    },
    {
      label: 'Chats',
      icon: 'ri-message-3-line',
      href: '/chat'
    }
  ]

  // Check user role
  const isAdmin = user?.roles?.some((role) => role.name === 'admin')
  const isModerator = user?.roles?.some((role) => role.name === 'moderator')

  const menu = [...baseMenu]

  // Add admin menu items
  if (isAdmin) {
    menu.push(
      {
        label: 'Documentation',
        icon: 'ri-file-text-line',
        href: '/admin/documentation'
      },
      {
        label: 'Tools',
        icon: 'ri-tools-line',
        href: '/admin/tools'
      },
      {
        label: 'Users',
        icon: 'ri-user-line',
        href: '/admin/users'
      },
      {
        label: 'Activity Logs',
        icon: 'ri-file-list-3-line',
        href: '/admin/activity-logs'
      }
    )
  }

  // Add moderator menu items
  if (isModerator) {
    menu.push(
      {
        label: 'Documentation',
        icon: 'ri-file-text-line',
        href: '/moderator/documentation'
      },
      {
        label: 'Tools',
        icon: 'ri-tools-line',
        href: '/moderator/tools'
      }
    )
  }

  return menu
}

export default verticalMenuData
