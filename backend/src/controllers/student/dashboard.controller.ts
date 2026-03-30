import { Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

// Get student dashboard data (unified profile + performance + ranking)
export const getStudentDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    if (!studentId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Run all queries in parallel for performance
    const [
      profileResult,
      allResultsResult,
      recentTestsResult,
      todayTestsResult,
      upcomingTestsResult,
      leaderboardResult,
    ] = await Promise.all([
      // 1. Profile info
      (() => {
        let q = supabaseAdmin
          .from('users')
          .select('id, name, email, roll_number, phone, avatar_url, created_at, last_login, is_active, current_streak')
          .eq('id', studentId);
        return q.single();
      })(),

      // 2. All results for performance stats
      (() => {
        let q = supabaseAdmin
          .from('results')
          .select('score, total_marks, percentage, status, time_taken_seconds')
          .eq('student_id', studentId);
        return q;
      })(),

      // 3. Recent 5 test history
      (() => {
        let q = supabaseAdmin
          .from('results')
          .select('id, score, total_marks, percentage, status, submitted_at, tests(id, title)')
          .eq('student_id', studentId)
          .order('submitted_at', { ascending: false })
          .limit(5);
        return q;
      })(),

      // 4. Today's assigned tests
      (() => {
        let q = supabaseAdmin
          .from('results')
          .select('id, tests!inner(id, title, time_limit_mins, scheduled_at, courses(name))')
          .eq('student_id', studentId)
          .eq('assignment_status', 'pending')
          .gte('tests.scheduled_at', today.toISOString())
          .lt('tests.scheduled_at', tomorrow.toISOString());
        return q;
      })(),

      // 5. Upcoming tests (next 7 days)
      (() => {
        let q = supabaseAdmin
          .from('results')
          .select('id, tests!inner(id, title, time_limit_mins, scheduled_at, courses(name))')
          .eq('student_id', studentId)
          .eq('assignment_status', 'pending')
          .gte('tests.scheduled_at', tomorrow.toISOString())
          .lte('tests.scheduled_at', weekFromNow.toISOString())
          .limit(5);
        return q;
      })(),

      // 6. Leaderboard: total scores per student for ranking
      (() => {
        let q = supabaseAdmin
          .from('results')
          .select('student_id, score');
        return q;
      })(),
    ]);

    const profile = profileResult.data;
    const allResults = allResultsResult.data || [];
    const recentTests = recentTestsResult.data || [];
    const todayTests = todayTestsResult.data || [];
    const upcomingTests = upcomingTestsResult.data || [];
    const leaderboardRaw = leaderboardResult.data || [];

    // --- Performance calculations ---
    const totalTests = allResults.length;
    const passed = allResults.filter((r) => r.status === 'passed').length;
    const failed = allResults.filter((r) => r.status === 'failed').length;
    const avgScore =
      totalTests > 0
        ? Math.round((allResults.reduce((s, r) => s + (r.percentage || 0), 0) / totalTests) * 10) / 10
        : 0;
    const highestScore =
      totalTests > 0 ? Math.max(...allResults.map((r) => r.percentage || 0)) : 0;

    const timeTakenValues = allResults
      .map((r) => r.time_taken_seconds)
      .filter((t): t is number => typeof t === 'number' && t > 0);
    const avgTimeTakenSeconds =
      timeTakenValues.length > 0
        ? Math.round(timeTakenValues.reduce((s, t) => s + t, 0) / timeTakenValues.length)
        : null;

    // Accuracy: percentage of correct marks out of total possible marks
    const totalMarksObtained = allResults.reduce((s, r) => s + (r.score || 0), 0);
    const totalMarksPossible = allResults.reduce((s, r) => s + (r.total_marks || 0), 0);
    const accuracy =
      totalMarksPossible > 0
        ? Math.round((totalMarksObtained / totalMarksPossible) * 1000) / 10
        : null;

    // --- Leaderboard rank calculation ---
    const studentTotals: Record<string, number> = {};
    leaderboardRaw.forEach((r: any) => {
      const sid = r.student_id;
      studentTotals[sid] = (studentTotals[sid] || 0) + (r.score || 0);
    });
    const myTotalScore = studentTotals[studentId] || 0;
    const sortedScores = Object.values(studentTotals).sort((a, b) => b - a);
    // Count students with a strictly higher score for correct tie-handling
    const rank = sortedScores.filter((s) => s > myTotalScore).length + 1;
    const totalStudents = sortedScores.length;

    let rankBadge: string | null = null;
    if (totalStudents > 0) {
      const percentile = rank / totalStudents;
      if (rank === 1) rankBadge = '🥇 #1';
      else if (rank <= 3) rankBadge = '🥈 Top 3';
      else if (percentile <= 0.1) rankBadge = '🏆 Top 10%';
      else if (percentile <= 0.25) rankBadge = '⭐ Top 25%';
      else if (percentile <= 0.5) rankBadge = 'Top 50%';
    }

    res.json({
      success: true,
      data: {
        profile: profile || null,
        performance: {
          totalTests,
          passed,
          failed,
          avgScore,
          highestScore,
          accuracy,
          avgTimeTakenSeconds,
          streak: profile?.current_streak || 0,
        },
        leaderboard: {
          rank: totalStudents > 0 ? rank : null,
          totalPoints: myTotalScore,
          totalStudents,
          rankBadge,
        },
        recentTests,
        todayTests,
        upcomingTests,
      },
    });
  } catch (error) {
    console.error('Get student dashboard error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export default { getStudentDashboard };
