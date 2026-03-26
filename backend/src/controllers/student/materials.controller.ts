import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    instituteId: string;
  };
}

// Get all available study materials for student
export const getStudyMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;
    const { subjectId, type, search } = req.query;

    let query = supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        file_url,
        file_size,
        created_at,
        subjects (
          id,
          name,
          modules (
            id,
            name,
            courses (
              id,
              name
            )
          )
        )
      `)
      .eq('institute_id', instituteId)
      .eq('is_published', true);

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
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
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get study materials error:', error);
    res.status(500).json({ error: 'Failed to fetch study materials' });
  }
};

// Get material by ID
export const getMaterialById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        file_url,
        file_size,
        content,
        created_at,
        subjects (
          id,
          name
        )
      `)
      .eq('id', id)
      .eq('institute_id', instituteId)
      .eq('is_published', true)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Log material view
    await supabaseAdmin.from('material_views').insert({
      material_id: id,
      student_id: studentId,
      institute_id: instituteId
    });

    res.json(data);
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
};

// Get materials by subject
export const getMaterialsBySubject = async (req: AuthRequest, res: Response) => {
  try {
    const { subjectId } = req.params;
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        file_url,
        file_size,
        created_at
      `)
      .eq('subject_id', subjectId)
      .eq('institute_id', instituteId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Get materials by subject error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
};

// Get recently viewed materials
export const getRecentlyViewed = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    const { data, error } = await supabaseAdmin
      .from('material_views')
      .select(`
        viewed_at,
        study_materials (
          id,
          title,
          type,
          subjects (
            name
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('institute_id', instituteId)
      .order('viewed_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data?.map(v => ({
      ...v.study_materials,
      viewedAt: v.viewed_at
    })));
  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({ error: 'Failed to fetch recently viewed' });
  }
};

// Get student's assigned subjects (from test assignments)
export const getMySubjects = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    const instituteId = req.user?.instituteId;

    // Get subjects from assigned tests
    const { data, error } = await supabaseAdmin
      .from('test_assignments')
      .select(`
        tests (
          subjects (
            id,
            name,
            modules (
              name,
              courses (
                name
              )
            )
          )
        )
      `)
      .eq('student_id', studentId)
      .eq('institute_id', instituteId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Deduplicate subjects
    const subjectsMap = new Map();
    data?.forEach(assignment => {
      const subject = (assignment.tests as any)?.subjects;
      if (subject && !subjectsMap.has(subject.id)) {
        subjectsMap.set(subject.id, subject);
      }
    });

    res.json(Array.from(subjectsMap.values()));
  } catch (error) {
    console.error('Get my subjects error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};