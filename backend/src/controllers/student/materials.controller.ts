import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get all available study materials for student
export const getStudyMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const { subject, type, search } = req.query;

    let query = supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        url,
        file_size,
        created_at,
        subject,
        module,
        course_id,
        courses (
          id,
          name
        )
      `)
      .eq('is_published', true);

    if (subject) {
      query = query.eq('subject', subject);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get study materials error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch study materials' });
  }
};

// Get material by ID
export const getMaterialById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;

    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        url,
        file_size,
        content,
        created_at,
        subject,
        module,
        viewed_by,
        view_count
      `)
      .eq('id', id)
      .eq('is_published', true)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: 'Material not found' });
    }

    // Log material view in the merged study_materials table
    const viewedBy = data.viewed_by || [];
    const alreadyViewed = viewedBy.some((v: any) => v.student_id === studentId);
    
    if (!alreadyViewed) {
      const updatedViewedBy = [...viewedBy, { student_id: studentId, viewed_at: new Date().toISOString() }];
      await supabaseAdmin
        .from('study_materials')
        .update({
          viewed_by: updatedViewedBy,
          view_count: (data.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', id);
    } else {
      // Just update last_viewed_at
      await supabaseAdmin
        .from('study_materials')
        .update({
          last_viewed_at: new Date().toISOString()
        })
        .eq('id', id);
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch material' });
  }
};

// Get materials by subject
export const getMaterialsBySubject = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.params; // subjectId is actually the subject name in the new schema

    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        url,
        file_size,
        created_at,
        subject,
        module
      `)
      .eq('subject', subjectId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Get materials by subject error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch materials' });
  }
};

// Get recently viewed materials
export const getRecentlyViewed = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    // We have to filter by student_id inside the viewed_by JSONB array
    // This is not very efficient in mock mode, but for the rebuild we follow the schema.
    // In real Postgres, we would use JSONB operators.
    const { data: allMaterials, error } = await supabaseAdmin
      .from('study_materials')
      .select('id, title, type, subject, viewed_by, last_viewed_at')
      .order('last_viewed_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    const recentlyViewed = allMaterials?.filter(m => {
      const viewedBy = m.viewed_by || [];
      return viewedBy.some((v: any) => v.student_id === studentId);
    }).slice(0, 10) || [];

    res.json({ success: true, data: recentlyViewed });
  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recently viewed' });
  }
};

// Get student's assigned subjects (from results table)
export const getMySubjects = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;

    // Get subjects from assigned tests in results table
    const { data, error } = await supabaseAdmin
      .from('results')
      .select(`
        tests (
          subject
        )
      `)
      .eq('student_id', studentId);

    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // Deduplicate subjects
    const subjects = Array.from(new Set(data?.map(record => record.tests?.subject).filter(Boolean)));

    res.json({ success: true, data: subjects });
  } catch (error) {
    console.error('Get my subjects error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
};

export default {
  getStudyMaterials,
  getMaterialById,
  getMaterialsBySubject,
  getRecentlyViewed,
  getMySubjects,
};
