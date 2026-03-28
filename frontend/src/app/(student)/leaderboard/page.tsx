'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/layout/PageWrapper';
import { Table, Badge, Card, Spinner } from '@/components/ui';
import { apiClient } from '@/lib/apiClient';

interface LeaderboardEntry {
  student_id: string;
  student_name: string;
  branch_name?: string;
  total_score: number;
  rank: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/student/leaderboard');
      setLeaderboard(response.data.data || []);
    } catch (error) {
      console.error('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'rank',
      label: 'Rank',
      render: (entry: LeaderboardEntry) => (
        <span className={`font-bold text-lg ${entry.rank <= 3 ? 'text-primary-600' : 'text-gray-500'}`}>
          #{entry.rank}
        </span>
      ),
    },
    {
      key: 'student',
      label: 'Student',
      render: (entry: LeaderboardEntry) => (
        <span className="font-semibold text-gray-900">{entry.student_name}</span>
      ),
    },
    {
      key: 'branch',
      label: 'Branch',
      render: (entry: LeaderboardEntry) => entry.branch_name || '-',
    },
    {
      key: 'score',
      label: 'Total Score',
      render: (entry: LeaderboardEntry) => (
        <span className="font-bold text-gray-900">{entry.total_score} pts</span>
      ),
    },
  ];

  return (
    <PageWrapper title="Leaderboard">
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {leaderboard.slice(0, 3).map((entry, idx) => (
          <Card key={entry.student_id} className={`p-6 flex flex-col items-center justify-center border-2 ${idx === 0 ? 'border-yellow-400 bg-yellow-50' : idx === 1 ? 'border-gray-300 bg-gray-50' : 'border-orange-400 bg-orange-50'}`}>
            <div className="text-4xl mb-2">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
            <div className="text-xl font-bold text-center mb-1">{entry.student_name}</div>
            <div className="text-sm text-gray-600 mb-2">{entry.branch_name}</div>
            <div className="text-2xl font-extrabold text-primary-600">{entry.total_score} pts</div>
          </Card>
        ))}
      </div>

      <Table columns={columns} data={leaderboard} loading={loading} emptyMessage="No rankings available yet" />
    </PageWrapper>
  );
}
