import { Response, Request } from 'express';
import supabaseAdmin from '../db/supabaseAdmin';

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { branch_id, limit = 10 } = req.query;

    let query = supabaseAdmin
      .from('results')
      .select('student_id, students(name, branch_id, branches(name)), score');

    if (branch_id) {
      // In a real DB we would use a join or filter on the related table
      // Supabase supports filtering on joined tables: students.branch_id
      // but the exact syntax depends on the version/setup.
      // For this implementation, we'll assume a flattened view or simple filter.
      query = query.eq('students.branch_id', branch_id);
    }

    const { data, error } = await query
      .order('score', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    // Aggregate scores per student if they have multiple results
    const studentScores: Record<string, any> = {};
    
    data.forEach((result: any) => {
      const studentId = result.student_id;
      if (!studentScores[studentId]) {
        studentScores[studentId] = {
          student_id: studentId,
          student_name: result.students?.name,
          branch_id: result.students?.branch_id,
          branch_name: result.students?.branches?.name,
          total_score: 0,
        };
      }
      studentScores[studentId].total_score += result.score;
    });

    const leaderboard = Object.values(studentScores)
      .sort((a, b) => b.total_score - a.total_score)
      .slice(0, Number(limit))
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    res.json({ data: leaderboard });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
