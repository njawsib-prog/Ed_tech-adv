import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get all study materials with filtering
export const getMaterials = async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      subject,
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
        url,
        file_size,
        is_published,
        created_at,
        updated_at,
        subject,
        module,
        course_id,
        courses (
          id,
          name
        ),
        users!study_materials_created_by_fkey (
          id,
          name
        )
      `, { count: 'exact' });

    // Apply filters
    if (subject) {
      query = query.eq('subject', subject);
    }
    if (courseId) {
      query = query.eq('course_id', courseId);
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
        limit: Number(limit)
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
        is_published,
        created_at,
        updated_at,
        subject,
        module,
        course_id,
        courses (
          id,
          name
        ),
        users!study_materials_created_by_fkey (
          id,
          name
        )
      `)
      .eq('id', id)
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
    const adminId = req.user?.id;
    const {
      title,
      description,
      type,
      subject,
      module,
      course_id,
      url,
      fileSize,
      content,
      isPublished = false
    } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .insert({
        title,
        description,
        type,
        subject,
        module,
        course_id,
        url,
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
    const updates = req.body;

    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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

    const { error } = await supabaseAdmin
      .from('study_materials')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Failed to delete material' });
  }
};

// Toggle publish status
export const togglePublish = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get current status
    const { data: material, error: fetchError } = await supabaseAdmin
      .from('study_materials')
      .select('is_published')
      .eq('id', id)
      .single();

    if (fetchError || !material) {
      return res.status(404).json({ error: 'Material not found' });
    }

    // Toggle status
    const { data, error } = await supabaseAdmin
      .from('study_materials')
      .update({ is_published: !material.is_published, updated_at: new Date().toISOString() })
      .eq('id', id)
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

export default {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  togglePublish,
};
