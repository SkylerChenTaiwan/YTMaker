import React from 'react'
import {
  FilmIcon,
  CalendarIcon,
  ChartBarIcon,
  CloudIcon,
} from '@heroicons/react/24/outline'
import { Stats } from '@/services/api/stats'

export interface StatsCardsProps {
  stats: Stats
  className?: string
}

interface StatCard {
  title: string
  value: string | number
  subtitle?: string
  icon: typeof FilmIcon
  color: string
}

/**
 * StatsCards 元件
 * 顯示 Dashboard 統計卡片,包含總影片數、本月生成數、已排程影片、API 配額等資訊
 */
export const StatsCards: React.FC<StatsCardsProps> = ({ stats, className = '' }) => {
  // 計算 D-ID 配額百分比
  const didQuotaPercent = Math.round(
    (stats.api_quota.did_remaining_minutes / stats.api_quota.did_total_minutes) * 100
  )

  // 根據配額百分比決定顏色
  const getQuotaColor = (percent: number): string => {
    if (percent < 10) return 'red'
    if (percent < 30) return 'orange'
    return 'green'
  }

  const quotaColor = getQuotaColor(didQuotaPercent)

  const cards: StatCard[] = [
    {
      title: '總影片數',
      value: stats.total_projects,
      icon: FilmIcon,
      color: 'blue',
    },
    {
      title: '本月生成數',
      value: stats.this_month_generated,
      icon: ChartBarIcon,
      color: 'green',
    },
    {
      title: '已排程影片',
      value: stats.scheduled_videos,
      icon: CalendarIcon,
      color: 'purple',
    },
    {
      title: 'API 配額剩餘',
      value: `${didQuotaPercent}%`,
      subtitle: `D-ID: ${stats.api_quota.did_remaining_minutes}/${stats.api_quota.did_total_minutes} 分鐘`,
      icon: CloudIcon,
      color: quotaColor,
    },
  ]

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              {card.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              )}
            </div>
            <card.icon className={`w-12 h-12 text-${card.color}-500`} />
          </div>
        </div>
      ))}
    </div>
  )
}
