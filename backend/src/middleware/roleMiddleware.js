/**
 * Role-Based Access Control Middleware
 * @param {string[]|string} allowedRoles - Single role or array of authorized roles
 */
const authorize = (allowedRoles = []) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}] only.`
      });
    }

    next();
  };
};

module.exports = authorize;
