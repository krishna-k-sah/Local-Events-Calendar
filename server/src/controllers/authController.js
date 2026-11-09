import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import { signToken } from '../config/jwt.js';

export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, role: requestedRole, phone, city, avatarUrl } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // 2. Prevent arbitrary role escalation to ADMIN on public signup
    let targetRoleName = 'ATTENDEE';
    if (requestedRole === 'ORGANIZER') {
      targetRoleName = 'ORGANIZER';
    }

    let roleRecord = await prisma.role.findUnique({
      where: { name: targetRoleName },
    });

    if (!roleRecord) {
      roleRecord = await prisma.role.create({
        data: { name: targetRoleName, description: `${targetRoleName} role` },
      });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user
    const newUser = await prisma.user.create({
      data: {
        fullName,
        email: normalizedEmail,
        passwordHash,
        roleId: roleRecord.id,
        phone: phone || null,
        city: city || null,
        avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      },
      include: { role: true },
    });

    // 5. Generate JWT
    const token = signToken({ userId: newUser.id, role: newUser.role.name });

    const { passwordHash: _, ...safeUser } = newUser;

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: newUser.id,
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: newUser.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: safeUser,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const token = signToken({ userId: user.id, role: user.role.name });
    const { passwordHash: _, ...safeUser } = user;

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGGED_IN',
        entityType: 'User',
        entityId: user.id,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: safeUser,
      token,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

export const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
};

export const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, city, avatarUrl } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName || undefined,
        phone: phone !== undefined ? phone : undefined,
        city: city !== undefined ? city : undefined,
        avatarUrl: avatarUrl || undefined,
      },
      include: { role: true },
    });

    const { passwordHash: _, ...safeUser } = updated;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'The current password provided is incorrect.',
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    res.status(200).json({
      success: true,
      message: 'Password successfully updated.',
    });
  } catch (error) {
    next(error);
  }
};

