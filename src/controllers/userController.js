import pool from '../db/db.js';

export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with profile (LEFT JOIN to include users without profiles)
    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.email_verified, u.user_type, u.created_at,
        p.id as profile_id, p.full_name, p.display_name, p.professional_title,
        p.category, p.experience_level, p.skills, p.bio, p.timezone, 
        p.country, p.avatar_url, p.portfolio_links, p.completed_at,
        p.created_at as profile_created_at
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const data = result.rows[0];

    const response = {
      id: data.id,
      email: data.email,
      emailVerified: data.email_verified,
      userType: data.user_type,
      createdAt: data.created_at,
      profile: data.profile_id ? {
        id: data.profile_id,
        fullName: data.full_name,
        displayName: data.display_name,
        professionalTitle: data.professional_title,
        category: data.category,
        experienceLevel: data.experience_level,
        skills: data.skills || [],
        bio: data.bio,
        timezone: data.timezone,
        country: data.country,
        avatarUrl: data.avatar_url,
        portfolioLinks: data.portfolio_links || {},
        completed: !!data.completed_at,
        completedAt: data.completed_at,
        createdAt: data.profile_created_at
      } : null
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
};

export const createProfile = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const profileData = req.validatedData;

    await client.query('BEGIN');

    // Check if profile already exists
    const existingProfile = await client.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (existingProfile.rows.length > 0) {
      await client.query('ROLLBACK');
      
      // Return existing profile with 409 Conflict
      const profileResult = await pool.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [userId]
      );

      return res.status(409).json({
        success: false,
        message: 'Profile already exists for this user. Use PATCH /api/profile to update.',
        data: profileResult.rows[0]
      });
    }

    // Insert profile with completed_at timestamp
    const result = await client.query(
      `INSERT INTO profiles (
        user_id, full_name, display_name, professional_title, category,
        experience_level, skills, bio, timezone, country, avatar_url,
        portfolio_links, completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *`,
      [
        userId,
        profileData.fullName || null,
        profileData.displayName || null,
        profileData.professionalTitle || null,
        profileData.category || null,
        profileData.experienceLevel || null,
        JSON.stringify(profileData.skills || []),
        profileData.bio || null,
        profileData.timezone || null,
        profileData.country || null,
        profileData.avatarUrl || null,
        JSON.stringify(profileData.portfolioLinks || {})
      ]
    );

    await client.query('COMMIT');

    console.log(`✅ Profile created for user ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Profile created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    
    // Handle unique constraint violation
    if (error.code === '23505') { // PostgreSQL unique violation code
      console.error('❌ Duplicate profile creation attempted:', error.detail);
      
      // Fetch existing profile
      const profileResult = await pool.query(
        'SELECT * FROM profiles WHERE user_id = $1',
        [req.user.id]
      );

      return res.status(409).json({
        success: false,
        message: 'Profile already exists. Cannot create duplicate.',
        data: profileResult.rows[0]
      });
    }

    console.error('Create profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating profile'
    });
  } finally {
    client.release();
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.validatedData;

    // Check if profile exists
    const existingProfile = await pool.query(
      'SELECT id FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (existingProfile.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Please create a profile first.'
      });
    }

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (profileData.fullName !== undefined) {
      updates.push(`full_name = $${paramCount}`);
      values.push(profileData.fullName);
      paramCount++;
    }
    if (profileData.displayName !== undefined) {
      updates.push(`display_name = $${paramCount}`);
      values.push(profileData.displayName);
      paramCount++;
    }
    if (profileData.professionalTitle !== undefined) {
      updates.push(`professional_title = $${paramCount}`);
      values.push(profileData.professionalTitle);
      paramCount++;
    }
    if (profileData.category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(profileData.category);
      paramCount++;
    }
    if (profileData.experienceLevel !== undefined) {
      updates.push(`experience_level = $${paramCount}`);
      values.push(profileData.experienceLevel);
      paramCount++;
    }
    if (profileData.skills !== undefined) {
      updates.push(`skills = $${paramCount}`);
      values.push(JSON.stringify(profileData.skills));
      paramCount++;
    }
    if (profileData.bio !== undefined) {
      updates.push(`bio = $${paramCount}`);
      values.push(profileData.bio);
      paramCount++;
    }
    if (profileData.timezone !== undefined) {
      updates.push(`timezone = $${paramCount}`);
      values.push(profileData.timezone);
      paramCount++;
    }
    if (profileData.country !== undefined) {
      updates.push(`country = $${paramCount}`);
      values.push(profileData.country);
      paramCount++;
    }
    if (profileData.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${paramCount}`);
      values.push(profileData.avatarUrl);
      paramCount++;
    }
    if (profileData.portfolioLinks !== undefined) {
      updates.push(`portfolio_links = $${paramCount}`);
      values.push(JSON.stringify(profileData.portfolioLinks));
      paramCount++;
    }

    // Set completed_at if not already set (marks profile as complete)
    updates.push(`completed_at = COALESCE(completed_at, NOW())`);

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(userId);

    const query = `
      UPDATE profiles 
      SET ${updates.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

export const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        p.*, u.email, u.user_type, u.created_at as user_created_at
       FROM profiles p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1 OR p.user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};
