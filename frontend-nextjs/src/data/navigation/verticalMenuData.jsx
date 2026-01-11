const verticalMenuData = (user = null, counts = { chat: 0, support: 0, tasks: 0, chat_by_admin: [], tasks_by_admin: [] }) => {
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
        label: 'Dashboard',
        icon: 'ri-dashboard-3-line',
        href: '/dashboard'
      },
      {
        label: 'Tasks',
        icon: 'ri-task-line',
        href: '/admin/tasks',
        ...(counts.tasks_by_admin && counts.tasks_by_admin.length > 0 && {
          suffix: counts.tasks_by_admin.map((adminCount, index) => {
            // Чередуем цвета: красный для первого, фиолетовый для второго, и так далее
            const colors = ['error', 'secondary'] // error = красный, secondary = фиолетовый
            const color = colors[index % colors.length]
            
            return {
              label: adminCount.count.toString(),
              color: color,
              size: 'small',
              key: `admin-${adminCount.admin_id}`, // Добавляем ключ для идентификации
            }
          })
        })
      },
      {
        label: 'Chat',
        icon: 'ri-message-3-line',
        href: '/chat',
        ...(counts.chat_by_admin && counts.chat_by_admin.length > 0 && {
          suffix: counts.chat_by_admin.map((adminCount, index) => {
            // Чередуем цвета: красный для первого, фиолетовый для второго, и так далее
            const colors = ['error', 'secondary'] // error = красный, secondary = фиолетовый
            const color = colors[index % colors.length]
            
            return {
              label: adminCount.count.toString(),
              color: color,
              size: 'small',
              key: `admin-${adminCount.admin_id}`, // Добавляем ключ для идентификации
            }
          })
        })
      },
      {
        label: 'Users',
        icon: 'ri-user-line',
        href: '/admin/users'
      },
      {
        label: 'Support',
        icon: 'ri-customer-service-2-line',
        href: '/admin/support',
        ...(counts.support > 0 && {
          suffix: {
            label: counts.support.toString(),
            color: 'error',
            size: 'small',
          }
        })
      },
      {
        label: 'Task Manager',
        icon: 'ri-home-smile-line',
        href: '/admin/tasks/kanban'
      },
      {
        label: 'Documentation',
        icon: 'ri-file-text-line',
        href: '/admin/documentation'
      },
      {
        label: 'Academy',
        icon: 'ri-graduation-cap-line',
        href: '/admin/tests'
      },
      {
        label: 'Tools',
        icon: 'ri-tools-line',
        href: '/admin/tools'
      },
      {
        label: 'Activity Logs',
        icon: 'ri-file-list-3-line',
        href: '/admin/activity-logs'
      },
      {
        label: 'Settings',
        icon: 'ri-settings-3-line',
        href: '/admin/settings'
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
        label: 'Academy',
        icon: 'ri-graduation-cap-line',
        href: '/moderator/academy'
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
        href: '/chat',
        ...(counts.chat > 0 && {
          suffix: {
            label: counts.chat.toString(),
            color: 'error',
            size: 'small',
          }
        })
      },
      {
        label: 'Support',
        icon: 'ri-customer-service-2-line',
        href: '/moderator/support',
        ...(counts.support > 0 && {
          suffix: {
            label: counts.support.toString(),
            color: 'error',
            size: 'small',
          }
        })
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
