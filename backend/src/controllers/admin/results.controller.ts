import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';
import { AuthRequest } from '../../types';

// Get all results with filtering and pagination
export const getResults = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      testId,
      studentId,
      status,
      sortBy = 'submitted_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        status,
        time_taken_seconds,
        submitted_at,
        started_at,
        tests (
          id,
          title,
          total_marks as test_total_marks,
          passing_marks
        ),
        students (
          id,
          name,
          email,
          roll_number
        )
      `, { count: 'exact' })
      ;

    // Apply filters
    if (testId) {
      query = query.eq('test_id', testId);
    }
    if (studentId) {
      query = query.eq('student_id', studentId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    // Apply sorting
    const allowedSortFields = ['submitted_at', 'score', 'percentage', 'started_at'];
    const sortField = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : 'submitted_at';
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      results: data || [],
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
};

// Get detailed result by ID
export const getResultById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        status,
        time_taken_seconds,
        submitted_at,
        started_at,
        answers,
        tests (
          id,
          title,
          total_marks,
          passing_marks,
          time_limit_mins,
          questions
        ),
        students (
          id,
          name,
          email,
          roll_number
        )
      `)
      .eq('id', id)
      
      .single();

    if (error) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
};

// Get analytics for a specific test
export const getTestAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { testId } = req.params;

    // Get test details
    const { data: test, error: testError } = await supabaseAdmin
      .from('tests')
      .select('id, title, total_marks, passing_marks, questions')
      .eq('id', testId)
      
      .single();

    if (testError || !test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get all results for this test with student details for top performers
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('results')
      .select(`
        id,
        score, 
        percentage, 
        time_taken_seconds, 
        status, 
        answers,
        submitted_at,
        students (id, name, email, roll_number)
      `)
      .eq('test_id', testId)
      ;

    if (resultsError) {
      return res.status(400).json({ error: resultsError.message });
    }

    // Calculate basic statistics
    const totalAttempts = results?.length || 0;
    const passedAttempts = results?.filter(r => r.status === 'passed').length || 0;
    const failedAttempts = totalAttempts - passedAttempts;

    // Calculate averages
    const averageScore = results?.length 
      ? results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length 
      : 0;
    const averagePercentage = results?.length 
      ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length 
      : 0;
    
    // Time statistics
    const resultsWithTime = results?.filter(r => r.time_taken_seconds) || [];
    const averageTime = resultsWithTime.length
      ? resultsWithTime.reduce((sum, r) => sum + (r.time_taken_seconds || 0), 0) / resultsWithTime.length
      : 0;
    const fastestTime = resultsWithTime.length > 0
      ? Math.min(...resultsWithTime.map(r => r.time_taken_seconds || Infinity))
      : 0;
    const slowestTime = resultsWithTime.length > 0
      ? Math.max(...resultsWithTime.map(r => r.time_taken_seconds || 0))
      : 0;

    // Calculate median and standard deviation
    const sortedPercentages = results?.map(r => r.percentage || 0).sort((a, b) => a - b) || [];
    const medianPercentage = sortedPercentages.length > 0
      ? sortedPercentages.length % 2 === 0
        ? (sortedPercentages[sortedPercentages.length / 2 - 1] + sortedPercentages[sortedPercentages.length / 2]) / 2
        : sortedPercentages[Math.floor(sortedPercentages.length / 2)]
      : 0;
    
    const variance = results?.length > 0
      ? results.reduce((sum, r) => sum + Math.pow((r.percentage || 0) - averagePercentage, 2), 0) / results.length
      : 0;
    const stdDeviation = Math.sqrt(variance);

    // Calculate question-wise statistics
    const questions = test.questions as any[] || [];
    const questionStats = questions.map((q, index) => {
      const responses = results?.map(r => {
        const answers = r.answers as any[];
        return {
          selected: answers?.[index]?.selected,
          isCorrect: answers?.[index]?.selected === q.correctAnswer
        };
      }) || [];

      const correctCount = responses.filter(r => r.isCorrect).length;
      const optionCounts = { a: 0, b: 0, c: 0, d: 0 };
      responses.forEach(r => {
        if (r.selected && ['a', 'b', 'c', 'd'].includes(r.selected)) {
          optionCounts[r.selected as keyof typeof optionCounts]++;
        }
      });

      const accuracy = totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0;

      return {
        questionNumber: index + 1,
        correctResponses: correctCount,
        totalResponses: totalAttempts,
        accuracy,
        difficulty: accuracy < 30 ? 'very_hard' :
                   accuracy < 50 ? 'hard' :
                   accuracy > 80 ? 'easy' :
                   accuracy > 90 ? 'very_easy' : 'medium',
        optionDistribution: optionCounts
      };
    });

    // Enhanced score distribution (10-point ranges)
    const scoreRanges = [
      { range: '0-10', min: 0, max: 10, count: 0, label: 'Very Poor' },
      { range: '11-20', min: 11, max: 20, count: 0, label: 'Poor' },
      { range: '21-30', min: 21, max: 30, count: 0, label: 'Below Average' },
      { range: '31-40', min: 31, max: 40, count: 0, label: 'Below Average' },
      { range: '41-50', min: 41, max: 50, count: 0, label: 'Average' },
      { range: '51-60', min: 51, max: 60, count: 0, label: 'Average' },
      { range: '61-70', min: 61, max: 70, count: 0, label: 'Good' },
      { range: '71-80', min: 71, max: 80, count: 0, label: 'Good' },
      { range: '81-90', min: 81, max: 90, count: 0, label: 'Excellent' },
      { range: '91-100', min: 91, max: 100, count: 0, label: 'Outstanding' }
    ];

    results?.forEach(r => {
      const pct = r.percentage || 0;
      const range = scoreRanges.find(r => pct >= r.min && pct <= r.max);
      if (range) range.count++;
    });

    // Top performers
    const topPerformers = results
      ?.filter(r => r.percentage !== null)
      .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
      .slice(0, 10)
      .map((r, index) => ({
        rank: index + 1,
        resultId: r.id,
        student: r.students,
        score: r.score,
        percentage: r.percentage,
        timeTakenSeconds: r.time_taken_seconds,
        submittedAt: r.submitted_at
      })) || [];

    // Performance trends by submission time (if date range provided)
    const performanceTrend = results
      ?.filter(r => r.submitted_at)
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime())
      .map(r => ({
        date: r.submitted_at,
        percentage: r.percentage,
        score: r.score
      })) || [];

    // Calculate percentile ranks
    const percentileRanks = {
      p90: sortedPercentages[Math.floor(sortedPercentages.length * 0.9)] || 0,
      p75: sortedPercentages[Math.floor(sortedPercentages.length * 0.75)] || 0,
      p50: sortedPercentages[Math.floor(sortedPercentages.length * 0.5)] || 0,
      p25: sortedPercentages[Math.floor(sortedPercentages.length * 0.25)] || 0,
      p10: sortedPercentages[Math.floor(sortedPercentages.length * 0.1)] || 0,
    };

    res.json({
      test: {
        id: test.id,
        title: test.title,
        totalMarks: test.total_marks,
        passingMarks: test.passing_marks
      },
      summary: {
        totalAttempts,
        passedAttempts,
        failedAttempts,
        passRate: totalAttempts > 0 ? (passedAttempts / totalAttempts) * 100 : 0,
        failRate: totalAttempts > 0 ? (failedAttempts / totalAttempts) * 100 : 0,
        averageScore: Number(averageScore.toFixed(2)),
        averagePercentage: Number(averagePercentage.toFixed(2)),
        medianPercentage: Number(medianPercentage.toFixed(2)),
        stdDeviation: Number(stdDeviation.toFixed(2)),
        averageTimeSeconds: Math.round(averageTime),
        fastestTimeSeconds: fastestTime === Infinity ? 0 : Math.round(fastestTime),
        slowestTimeSeconds: Math.round(slowestTime)
      },
      percentileRanks,
      questionStats,
      scoreDistribution: scoreRanges,
      topPerformers,
      performanceTrend: performanceTrend.slice(-50) // Last 50 submissions for trend
    });
  } catch (error) {
    console.error('Get test analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

// Get student performance history
export const getStudentPerformance = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    // Verify student belongs to institute
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, name, email, roll_number')
      .eq('id', studentId)
      
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Get all results for the student
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        status,
        submitted_at,
        tests (
          id,
          title,
          subject_id,
          subjects (name)
        )
      `)
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });

    if (resultsError) {
      return res.status(400).json({ error: resultsError.message });
    }

    // Calculate overall statistics
    const totalTests = results?.length || 0;
    const passedTests = results?.filter(r => r.status === 'passed').length || 0;
    const averagePercentage = results?.length
      ? results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length
      : 0;

    // Subject-wise performance
    const subjectPerformance: Record<string, { total: number; passed: number; avgPercentage: number }> = {};
    results?.forEach(r => {
      const subjectName = (r.tests as any)?.subjects?.name || 'Unknown';
      if (!subjectPerformance[subjectName]) {
        subjectPerformance[subjectName] = { total: 0, passed: 0, avgPercentage: 0 };
      }
      subjectPerformance[subjectName].total++;
      if (r.status === 'passed') subjectPerformance[subjectName].passed++;
      subjectPerformance[subjectName].avgPercentage += r.percentage || 0;
    });

    Object.keys(subjectPerformance).forEach(subject => {
      subjectPerformance[subject].avgPercentage /= subjectPerformance[subject].total;
    });

    res.json({
      student,
      summary: {
        totalTests,
        passedTests,
        passRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
        averagePercentage
      },
      results,
      subjectPerformance
    });
  } catch (error) {
    console.error('Get student performance error:', error);
    res.status(500).json({ error: 'Failed to fetch student performance' });
  }
};

// Export results to CSV
export const exportResultsCSV = async (req: AuthRequest, res: Response) => {
  try {
    const { testId, status } = req.query;

    let query = supabaseAdmin
      .from('results')
      .select(`
        id,
        score,
        total_marks,
        percentage,
        status,
        time_taken_seconds,
        submitted_at,
        tests (title),
        students (name, email, roll_number)
      `)
      ;

    if (testId) {
      query = query.eq('test_id', testId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('submitted_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate CSV
    const headers = [
      'Student Name',
      'Roll Number',
      'Email',
      'Test Title',
      'Score',
      'Total Marks',
      'Percentage',
      'Status',
      'Time Taken (minutes)',
      'Submitted At'
    ];

    const rows = data?.map(r => [
      (r.students as any)?.name || '',
      (r.students as any)?.roll_number || '',
      (r.students as any)?.email || '',
      (r.tests as any)?.title || '',
      r.score || 0,
      r.total_marks || 0,
      r.percentage?.toFixed(2) || '0',
      r.status || '',
      r.time_taken_seconds ? Math.floor(r.time_taken_seconds / 60) : '',
      r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ''
    ]) || [];

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=results-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export results error:', error);
    res.status(500).json({ error: 'Failed to export results' });
  }
};

// Delete a result
export const deleteResult = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('results')
      .delete()
      .eq('id', id)
      ;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Result deleted successfully' });
  } catch (error) {
    console.error('Delete result error:', error);
    res.status(500).json({ error: 'Failed to delete result' });
  }
};