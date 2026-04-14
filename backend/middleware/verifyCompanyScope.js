/**
 * verifyCompanyScope middleware
 * Extracts companyId from the authenticated user's JWT and injects it
 * into the request. Ensures no cross-company data leakage.
 * Super Admins bypass this check.
 */
const verifyCompanyScope = (req, res, next) => {
  try {
    // Super admin bypasses company scoping
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    // Extract companyId from the authenticated user
    const companyId = req.user?.company;

    if (!companyId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. No company associated with this account.',
        errors: [],
      });
    }

    // Inject companyId and companyFilter into request for downstream use
    req.companyId = companyId.toString();
    req.companyFilter = { company: companyId.toString() };
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Company scope verification failed.',
      errors: [],
    });
  }
};

/**
 * checkMustChangePassword middleware
 * Blocks access to any endpoint (except password change) if the user
 * has mustChangePassword: true
 */
const checkMustChangePassword = (req, res, next) => {
  // Allow the change-password endpoint itself
  if (req.path === '/change-password') {
    return next();
  }

  if (req.user && req.user.mustChangePassword) {
    return res.status(403).json({
      success: false,
      message: 'You must change your password before accessing the platform.',
      mustChangePassword: true,
      errors: [],
    });
  }

  next();
};

module.exports = { verifyCompanyScope, checkMustChangePassword };
