import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-6xl font-bold mb-4">
          Marketing Analytics AI
        </h1>
        <p className="text-2xl text-gray-600 dark:text-gray-400 mb-8">
          AI-powered marketing analytics with Multi-LLM support
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">📊 Analytics</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Track campaign performance across multiple platforms
            </p>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">🤖 AI Insights</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Get intelligent recommendations from multiple LLMs
            </p>
          </div>
          
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">📈 Optimization</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Optimize campaigns with data-driven decisions
            </p>
          </div>
        </div>
        
        <div className="mt-12">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}