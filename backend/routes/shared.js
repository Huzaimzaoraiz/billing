const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function branchWhere(user, { branchId = null, where = {}, branchKey = 'branch_id' } = {}) {
  if (!user || !user.role) {
    throw new Error('authenticated user required');
  }

  const scopedWhere = { ...where };

  if (branchId) {
    if (!isUuid(branchId)) {
      throw new Error('invalid branch id');
    }

    if (user.role !== 'SUPER_ADMIN' && branchId !== user.branch_id) {
      throw new Error('forbidden branch access');
    }

    scopedWhere[branchKey] = branchId;
    return scopedWhere;
  }

  if (user.role !== 'SUPER_ADMIN') {
    scopedWhere[branchKey] = user.branch_id || '00000000-0000-0000-0000-000000000000';
  }

  return scopedWhere;
}

function canAccessBranch(user, branchId) {
  return isUuid(branchId) && (user.role === 'SUPER_ADMIN' || user.branch_id === branchId);
}

module.exports = { branchWhere, canAccessBranch, isUuid };