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
        label: 'Tasks',
        icon: 'ri-task-line',
        href: '/admin/tasks'
      },
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
      },
      {
        label: 'Support',
        icon: 'ri-customer-service-2-line',
        href: '/admin/support'
      }
    )
  }

  // Add moderator menu items
  if (isModerator) {
    menu.push(
      {
        label: 'Tasks',
        icon: 'ri-task-line',
        href: '/moderator/tasks'
      },
      {
        label: 'Training Center',
        icon: 'ri-graduation-cap-line',
        href: '/moderator/training'
      },
      {
        label: 'Documentation',
        icon: 'ri-file-text-line',
        href: '/moderator/documentation'
      },
      {
        label: 'Tools',
        icon: 'ri-tools-line',
        href: '/moderator/tools'
      },
      {
        label: 'Support',
        icon: 'ri-customer-service-2-line',
        href: '/moderator/support'
      }
    )
  }

  return menu
}

export default verticalMenuData
