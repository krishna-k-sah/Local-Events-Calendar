export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for this resource.',
      });
    }

    const userRole = req.user.role.name;
    const hasRole = allowedRoles.includes(userRole) || (allowedRoles.includes('ATTENDEE') && userRole === 'USER') || (allowedRoles.includes('USER') && userRole === 'ATTENDEE');

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(', ')}]. Your role is: ${userRole}.`,
      });
    }

    next();
  };
};

