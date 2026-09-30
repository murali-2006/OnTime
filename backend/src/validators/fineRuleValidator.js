const { fineRulesRepository } = require('../db/repositories/firestoreRepository');

/**
 * Validates fine rule parameters and checks for overlaps with active fine rules
 */
const validateFineRule = async (req, res, next) => {
  const { minMinutes, maxMinutes, fineAmount, active } = req.body;
  const ruleId = req.params.id ? parseInt(req.params.id, 10) : null;

  const min = parseInt(minMinutes, 10);
  const max = maxMinutes !== null && maxMinutes !== undefined && maxMinutes !== ''
    ? parseInt(maxMinutes, 10)
    : null;
  const fine = parseFloat(fineAmount);

  if (isNaN(min) || min < 1) {
    return res.status(400).json({
      success: false,
      message: 'Minimum minutes must be a positive integer (at least 1).'
    });
  }

  if (max !== null && (isNaN(max) || max < min)) {
    return res.status(400).json({
      success: false,
      message: 'Maximum minutes must be greater than or equal to minimum minutes (or leave empty for unlimited).'
    });
  }

  if (isNaN(fine) || fine < 0) {
    return res.status(400).json({
      success: false,
      message: 'Fine amount must be a positive number.'
    });
  }

  // If the rule is being set to active, check for range overlaps with other active rules
  const isActive = active !== undefined ? Boolean(active) : true;

  if (isActive) {
    try {
      const existingRules = await fineRulesRepository.findActive();

      const newMin = min;
      const newMax = max !== null ? max : Infinity;

      for (const rule of existingRules) {
        if (ruleId && Number(rule.id) === Number(ruleId)) {
          continue; // Skip self when updating
        }

        const exMin = parseInt(rule.min_minutes, 10);
        const exMax = rule.max_minutes !== null ? parseInt(rule.max_minutes, 10) : Infinity;

        // Overlap condition: max(newMin, exMin) <= min(newMax, exMax)
        const startOverlap = Math.max(newMin, exMin);
        const endOverlap = Math.min(newMax, exMax);

        if (startOverlap <= endOverlap) {
          const exLabel = rule.max_minutes ? `${rule.min_minutes}–${rule.max_minutes} min` : `${rule.min_minutes}+ min`;
          return res.status(400).json({
            success: false,
            message: `Conflicting rule: The range (${newMin}${max !== null ? '–' + max : '+'} min) overlaps with existing active rule (${exLabel} = ₹${rule.fine_amount}).`
          });
        }
      }
    } catch (err) {
      return next(err);
    }
  }

  req.sanitizedRule = {
    minMinutes: min,
    maxMinutes: max,
    fineAmount: fine,
    active: isActive
  };

  next();
};

module.exports = {
  validateFineRule
};
