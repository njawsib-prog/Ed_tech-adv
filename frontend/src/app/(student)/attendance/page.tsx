'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Badge, Card } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';

interface Attendance {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
}

export default function StudentAttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/student/attendance');
      setAttendance(response.data.data || []);
    } catch (error) {
      console.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (row: Attendance) => new Date(row.date).toLocaleDateString(),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Attendance) => (
        <Badge
          variant={
            row.status === 'present'
              ? 'success'
              : row.status === 'absent'
              ? 'danger'
              : 'warning'
          }
        >
          {row.status.toUpperCase()}
        </Badge>
      ),
    },
  ];

  const stats = attendance.reduce(
    (acc, curr) => {
      acc.total++;
      if (curr.status === 'present') acc.present++;
      return acc;
    },
    { total: 0, present: 0 }
  );

  const percentage = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;

  return (
    <PageWrapper title="My Attendance">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-4 flex flex-col items-center justify-center">
          <div className="text-sm text-gray-500 uppercase font-semibold">Total Classes</div>
          <div className="text-3xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center">
          <div className="text-sm text-gray-500 uppercase font-semibold">Present</div>
          <div className="text-3xl font-bold text-green-600">{stats.present}</div>
        </Card>
        <Card className="p-4 flex flex-col items-center justify-center">
          <div className="text-sm text-gray-500 uppercase font-semibold">Attendance Rate</div>
          <div className="text-3xl font-bold text-primary-600">{percentage.toFixed(1)}%</div>
        </Card>
      </div>

      <Table columns={columns} data={attendance} loading={loading} emptyMessage="No attendance records found" />
    </PageWrapper>
  );
}
