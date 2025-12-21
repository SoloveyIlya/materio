const verticalMenuData = (user = null) => {
  // Check user role
  const isAdmin = user?.roles?.some((role) => role.name === 'admin')
  const isModerator = user?.roles?.some((role) => role.name === 'moderator')

  // Base menu for admin and regular users
  const baseMenu = [
    {
      label: isAdmin ? 'Task Manager' : 'Home',
      icon: 'ri-home-smile-line',
      href: isAdmin ? '/admin/tasks/kanban' : '/dashboard'
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

  let menu = []

  // Admin menu
  if (isAdmin) {
    menu = [
      {
        label: 'Task Manager',
        icon: 'ri-home-smile-line',
        href: '/admin/tasks/kanban'
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
      },
      {
        label: 'Tasks',
        icon: 'ri-task-line',
        href: '/admin/tasks'
      },
      {
        label: 'Categories',
        icon: 'ri-price-tag-3-line',
        href: '/admin/categories'
      },
      {
        label: 'Documentation',
        icon: 'ri-file-text-line',
        href: '/admin/documentation'
      },
      {
        label: 'Tests',
        icon: 'ri-questionnaire-line',
        href: '/admin/tests'
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
    ]
  }
  // Moderator menu - согласно ТЗ
  else if (isModerator) {
    menu = [
      {
        label: 'Dashboard',
        icon: 'ri-dashboard-3-line',
        href: '/moderator/dashboard'
      },
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
        label: 'Messages',
        icon: 'ri-message-3-line',
        href: '/chat'
      },
      {
        label: 'Support',
        icon: 'ri-customer-service-2-line',
        href: '/moderator/support'
      }
    ]
  }
  // Default menu for other users
  else {
    menu = [...baseMenu]
  }

  return menu
}

export default verticalMenuData
