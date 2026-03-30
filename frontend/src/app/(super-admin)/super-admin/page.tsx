'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { StatCard } from '@/components/super-admin/StatCard';
import { BarChart, LineChart, PieChart } from '@/components/super-admin/charts';

interface DashboardStats {
  totalBranches: number;
  totalStudents: number;
  totalRevenue: number;
  activeCourses: number;
  totalCourses: number;
  totalTests: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentGrowth, setStudentGrowth] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [topBranches, setTopBranches] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, growthRes, revenueRes, attendanceRes, branchesRes] = await Promise.all([
        apiClient.get('/api/super-admin/dashboard/stats'),
        apiClient.get('/api/super-admin/dashboard/student-growth'),
        apiClient.get('/api/super-admin/dashboard/revenue'),
        apiClient.get('/api/super-admin/dashboard/attendance'),
        apiClient.get('/api/super-admin/dashboard/top-branches'),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (growthRes.data.success) setStudentGrowth(growthRes.data.data);
      if (revenueRes.data.success) setRevenueData(revenueRes.data.data);
      if (attendanceRes.data.success) setAttendanceData(attendanceRes.data.data);
      if (branchesRes.data.success) setTopBranches(branchesRes.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="text-center text-red-500">Failed to load dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600">Overview of all branches, students, and revenue</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Branches"
          value={stats.totalBranches}
          icon="branches"
          color="blue"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon="students"
          color="green"
        />
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon="payments"
          color="purple"
        />
        <StatCard
          title="Active Courses"
          value={stats.activeCourses}
          icon="courses"
          color="orange"
        />
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          icon="courses"
          color="indigo"
        />
        <StatCard
          title="Total Tests"
          value={stats.totalTests}
          icon="tests"
          color="pink"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student Growth Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Student Growth</h3>
          <LineChart data={studentGrowth} xKey="month" yKey="count" color="#10b981" />
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Analytics</h3>
          <BarChart data={revenueData} xKey="month" yKey="revenue" color="#6366f1" />
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Attendance Overview</h3>
          <PieChart data={attendanceData} />
        </div>

        {/* Top Branches */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performing Branches</h3>
          <div className="space-y-3">
            {topBranches.slice(0, 5).map((branch) => (
              <div key={branch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{branch.name}</p>
                  <p className="text-sm text-gray-500">{branch.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-indigo-600">{branch.active_students}</p>
                  <p className="text-sm text-gray-500">students</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/super-admin/branches"
            className="flex flex-col items-center p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-medium">Add Branch</span>
          </a>
          <a
            href="/super-admin/students"
            className="flex flex-col items-center p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
          >
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-medium">Add Student</span>
          </a>
          <a
            href="/super-admin/courses"
            className="flex flex-col items-center p-4 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-sm font-medium">Add Course</span>
          </a>
          <a
            href="/super-admin/notifications"
            className="flex flex-col items-center p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm font-medium">Send Notification</span>
          </a>
        </div>
      </div>
    </div>
  );
}
