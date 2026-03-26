import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor your marketing campaigns and AI insights
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Total Spend</h3>
          <p className="text-3xl font-bold text-primary-600">$0.00</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Impressions</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Clicks</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Conversions</h3>
          <p className="text-3xl font-bold text-primary-600">0</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Campaigns</h2>
          <div className="text-gray-500 dark:text-gray-400">
            <p>No campaigns yet. Connect your Meta Ads account to get started.</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">AI Insights</h2>
          <div className="text-gray-500 dark:text-gray-400">
            <p>Insights will appear here once you have campaign data.</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link 
              href="/campaigns" 
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              View Campaigns
            </Link>
            <Link 
              href="/chat" 
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              AI Chat
            </Link>
            <Link 
              href="/settings" 
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}