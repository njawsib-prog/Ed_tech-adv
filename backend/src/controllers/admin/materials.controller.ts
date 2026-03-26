import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    instituteId: string;
  };
}

// Get all study materials with filtering
export const getMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const {
      page = 1,
      limit = 20,
      subjectId,
      courseId,
      type,
      search
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabaseAdmin
      .from('study_materials')
      .select(`
        id,
        title,
        description,
        type,
        file_url,
        file_size,
        is_published,
        created_at,
        updated_at,
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
        ),
        created_by_admin (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('institute_id', instituteId);

    // Apply filters
    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }
    if (type) {
      query = query.eq('type', type);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + Number(limit) - 1);
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      materials: data,
      pagination: {
        total: count || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
};

// Get material by ID
export const getMaterialById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
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
        is_published,
        created_at,
        updated_at,
        subject_id,
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
        ),
        created_by_admin (
          id,
          name
        )
      `)
      .eq('id', id)
      .eq('institute_id', instituteId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Get material error:', error);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
};

// Create new study material
export const createMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const instituteId = req.user?.instituteId;
    const adminId = req.user?.id;
    const {
      title,
      description,
      type,
      subjectId,
      fileUrl,
      fileSize,
      content,
      isPublished = false
    } = req.body;

    if (!title || !subjectId || !type) {
      return res.status(400).json({ error: 'Title, subject, and type are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .insert({
        institute_id: instituteId,
        title,
        description,
        type,
        subject_id: subjectId,
        file_url: fileUrl,
        file_size: fileSize,
        content,
        is_published: isPublished,
        created_by: adminId
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log activity
    await supabaseAdmin.from('activity_log').insert({
      institute_id: instituteId,
      user_id: adminId,
      user_type: 'admin',
      action: 'create_material',
      details: { material_id: data.id, title }
    });

    res.status(201).json(data);
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Failed to create material' });
  }
};

// Update study material
export const updateMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;
    const {
      title,
      description,
      type,
      subjectId,
      fileUrl,
      fileSize,
      content,
      isPublished
    } = req.body;

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (subjectId !== undefined) updateData.subject_id = subjectId;
    if (fileUrl !== undefined) updateData.file_url = fileUrl;
    if (fileSize !== undefined) updateData.file_size = fileSize;
    if (content !== undefined) updateData.content = content;
    if (isPublished !== undefined) updateData.is_published = isPublished;

    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .update(updateData)
      .eq('id', id)
      .eq('institute_id', instituteId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Failed to update material' });
  }
};

// Delete study material
export const deleteMaterial = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    const { error } = await supabaseAdmin
      .from('study_materials')
      .delete()
      .eq('id', id)
      .eq('institute_id', instituteId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};

// Toggle publish status
export const togglePublish = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const instituteId = req.user?.instituteId;

    // Get current status
    const { data: material, error: fetchError } = await supabaseAdmin
      .from('study_materials')
      .select('is_published')
      .eq('id', id)
      .eq('institute_id', instituteId)
      .single();

    if (fetchError || !material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Toggle status
    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .update({ is_published: !material.is_published, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('institute_id', instituteId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Toggle publish error:', error);
    res.status(500).json({ error: 'Failed to toggle publish status' });
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
        type,
        file_url,
        file_size,
        is_published
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