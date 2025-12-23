import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Activity, BarChart3, PieChart, LineChart } from 'lucide-react';

const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-400" />
          Analytics Dashboard
        </h1>
        <p className="text-gray-400 mt-1">Comprehensive analytics and insights</p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-xl shadow-blue-900/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">Total Revenue</p>
              <h3 className="text-3xl font-bold text-white mt-2">$0</h3>
            </div>
            <DollarSign className="w-10 h-10 text-blue-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 shadow-xl shadow-green-900/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm">Active Users</p>
              <h3 className="text-3xl font-bold text-white mt-2">0</h3>
            </div>
            <Users className="w-10 h-10 text-green-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 shadow-xl shadow-purple-900/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm">Conversion Rate</p>
              <h3 className="text-3xl font-bold text-white mt-2">0%</h3>
            </div>
            <Activity className="w-10 h-10 text-purple-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-2xl p-6 shadow-xl shadow-orange-900/50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-sm">Growth Rate</p>
              <h3 className="text-3xl font-bold text-white mt-2">+0%</h3>
            </div>
            <TrendingUp className="w-10 h-10 text-orange-200" />
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-900/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">User Growth</h3>
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart visualization coming soon
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-900/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="w-6 h-6 text-green-400" />
            <h3 className="text-xl font-bold text-white">Revenue Trends</h3>
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart visualization coming soon
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-900/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl font-bold text-white">User Distribution</h3>
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart visualization coming soon
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-blue-900/30"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-6 h-6 text-orange-400" />
            <h3 className="text-xl font-bold text-white">System Activity</h3>
          </div>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Chart visualization coming soon
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analytics;
