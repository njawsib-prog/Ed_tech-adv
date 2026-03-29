import { Request, Response } from 'express';
import { supabaseAdmin } from '../../db/supabaseAdmin';

// Get all courses
export const getCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        modules (
          id,
          name,
          order_index,
          subjects (
            id,
            name,
            order_index
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Get counts for each course
    const coursesWithCounts = await Promise.all(
      (courses || []).map(async (course) => {
        const { count: studentCount } = await supabaseAdmin
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
          .eq('is_active', true);

        const { count: testCount } = await supabaseAdmin
          .from('tests')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        const { count: materialCount } = await supabaseAdmin
          .from('study_materials')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        return {
          ...course,
          student_count: studentCount || 0,
          test_count: testCount || 0,
          material_count: materialCount || 0,
        };
      })
    );

    res.json({ courses: coursesWithCounts });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new course
export const createCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      title,
      description,
      price,
      duration_value,
      duration_unit,
      duration_hours,
      start_date,
      end_date,
      last_enrollment_date,
      thumbnail,
      instructor,
      terms_and_conditions,
      category,
      level,
      status,
      is_published,
    } = req.body;

    if (!name && !title) {
      res.status(400).json({ error: 'Course name or title is required' });
      return;
    }

    const insertData: Record<string, unknown> = {
      name: name || title,
      title: title || name,
      is_active: true,
      status: status || 'active',
    };

    if (description !== undefined) insertData.description = description;
    if (thumbnail !== undefined) insertData.thumbnail = thumbnail;
    if (instructor !== undefined) insertData.instructor = instructor;
    if (terms_and_conditions !== undefined) insertData.terms_and_conditions = terms_and_conditions;
    if (category !== undefined) insertData.category = category;

    // Price validation
    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        res.status(400).json({ error: 'Invalid price. Must be a non-negative number.' });
        return;
      }
      insertData.price = parsedPrice;
    }

    // Duration: support both old (duration_hours) and new (duration_value + duration_unit)
    if (duration_value !== undefined) {
      const parsed = Number(duration_value);
      if (isNaN(parsed) || parsed < 0) {
        res.status(400).json({ error: 'Invalid duration_value. Must be a positive number.' });
        return;
      }
      insertData.duration_value = parsed;
    }
    if (duration_unit !== undefined) {
      const validUnits = ['days', 'weeks', 'months', 'years'];
      if (!validUnits.includes(duration_unit as string)) {
        res.status(400).json({ error: `Invalid duration_unit. Must be one of: ${validUnits.join(', ')}` });
        return;
      }
      insertData.duration_unit = duration_unit;
    }
    // Legacy support
    if (duration_hours !== undefined) {
      const parsed = Number(duration_hours);
      if (!isNaN(parsed) && parsed >= 0) insertData.duration_hours = parsed;
    }

    if (start_date !== undefined) insertData.start_date = start_date;
    if (end_date !== undefined) insertData.end_date = end_date;
    if (last_enrollment_date !== undefined) insertData.last_enrollment_date = last_enrollment_date;

    if (level !== undefined) {
      const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
      if (!validLevels.includes(level as string)) {
        res.status(400).json({ error: `Invalid level. Must be one of: ${validLevels.join(', ')}` });
        return;
      }
      insertData.level = level;
    }

    if (is_published !== undefined) insertData.is_published = Boolean(is_published);

    const { data, error } = await supabaseAdmin
      .from('courses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a course
export const updateCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      title,
      description,
      price,
      duration_value,
      duration_unit,
      duration_hours,
      start_date,
      end_date,
      last_enrollment_date,
      thumbnail,
      instructor,
      terms_and_conditions,
      category,
      level,
      status,
      is_active,
      is_published,
    } = req.body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (name) { updateData.name = name; updateData.title = updateData.title ?? name; }
    if (title) { updateData.title = title; updateData.name = updateData.name ?? title; }
    if (description !== undefined) updateData.description = description;
    if (typeof is_active === 'boolean') updateData.is_active = is_active;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
    if (instructor !== undefined) updateData.instructor = instructor;
    if (terms_and_conditions !== undefined) updateData.terms_and_conditions = terms_and_conditions;
    if (category !== undefined) updateData.category = category;

    if (status && ['active', 'inactive', 'draft'].includes(status as string)) {
      updateData.status = status;
      updateData.is_active = status === 'active';
    }

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        res.status(400).json({ error: 'Invalid price. Must be a non-negative number.' });
        return;
      }
      updateData.price = parsedPrice;
    }

    if (duration_value !== undefined) {
      const parsed = Number(duration_value);
      if (isNaN(parsed) || parsed < 0) {
        res.status(400).json({ error: 'Invalid duration_value. Must be a positive number.' });
        return;
      }
      updateData.duration_value = parsed;
    }
    if (duration_unit !== undefined) {
      const validUnits = ['days', 'weeks', 'months', 'years'];
      if (!validUnits.includes(duration_unit as string)) {
        res.status(400).json({ error: `Invalid duration_unit. Must be one of: ${validUnits.join(', ')}` });
        return;
      }
      updateData.duration_unit = duration_unit;
    }
    if (duration_hours !== undefined) {
      const parsed = Number(duration_hours);
      if (!isNaN(parsed) && parsed >= 0) updateData.duration_hours = parsed;
    }

    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (last_enrollment_date !== undefined) updateData.last_enrollment_date = last_enrollment_date;

    if (level !== undefined) {
      const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
      if (!validLevels.includes(level as string)) {
        res.status(400).json({ error: `Invalid level. Must be one of: ${validLevels.join(', ')}` });
        return;
      }
      updateData.level = level;
    }

    if (is_published !== undefined) updateData.is_published = Boolean(is_published);

    const { data, error } = await supabaseAdmin
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a course
export const deleteCourse = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if any active students are enrolled
    const { count } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id)
      .eq('is_active', true);

    if (count && count > 0) {
      res.status(400).json({ error: 'Cannot delete course with active students' });
      return;
    }

    const { error } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get modules for a course
export const getCourseModules = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('modules')
      .select(`
        *,
        subjects (*)
      `)
      .eq('course_id', id)
      .order('order_index');

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Get course modules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a module
export const createModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, order_index } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Module name is required' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('modules')
      .insert({
        course_id: id,
        name,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a module
export const updateModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, order_index } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (order_index !== undefined) updateData.order_index = order_index;

    const { data, error } = await supabaseAdmin
      .from('modules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a module
export const deleteModule = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('modules')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Module deleted successfully' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a subject
export const createSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, order_index } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Subject name is required' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('subjects')
      .insert({
        module_id: id,
        name,
        order_index: order_index || 0,
      })
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Create subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update a subject
export const updateSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, order_index } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (name) updateData.name = name;
    if (order_index !== undefined) updateData.order_index = order_index;

    const { data, error } = await supabaseAdmin
      .from('subjects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json(data);
  } catch (error) {
    console.error('Update subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a subject
export const deleteSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('subjects')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    console.error('Delete subject error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export default {
  getCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseModules,
  createModule,
  updateModule,
  deleteModule,
  createSubject,
  updateSubject,
  deleteSubject,
};