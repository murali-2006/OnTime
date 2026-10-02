const {
  settingsRepository,
  fineRulesRepository,
  paymentRepository,
  dashboardRepository,
  lateRecordRepository
} = require('../db/repositories/firestoreRepository');

/**
 * Admin Dashboard Aggregated Statistics
 * Route: GET /api/admin/dashboard
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const data = await dashboardRepository.getStats();
    res.json({
      success: true,
      stats: data.stats,
      recentLateStudents: data.recentLateStudents,
      deptBreakdown: data.deptBreakdown
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get college reporting settings
 * Route: GET /api/admin/settings
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsRepository.getSettings();
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update college reporting settings
 * Route: PUT /api/admin/settings
 */
const updateSettings = async (req, res, next) => {
  try {
    const { reportingTime, lateEnabled } = req.body;

    if (!reportingTime) {
      return res.status(400).json({
        success: false,
        message: 'Reporting time is required (e.g. 09:00:00 or 09:15).'
      });
    }

    const settings = await settingsRepository.updateSettings({ reportingTime, lateEnabled });

    res.json({
      success: true,
      message: 'College reporting settings updated successfully.',
      settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get fine rules
 * Route: GET /api/admin/fine-rules
 */
const getFineRules = async (req, res, next) => {
  try {
    const rules = await fineRulesRepository.findAll();
    res.json({
      success: true,
      rules
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new fine rule
 * Route: POST /api/admin/fine-rules
 */
const createFineRule = async (req, res, next) => {
  try {
    const rule = await fineRulesRepository.create(req.sanitizedRule);
    res.status(201).json({
      success: true,
      message: 'Fine rule created successfully.',
      rule
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing fine rule
 * Route: PUT /api/admin/fine-rules/:id
 */
const updateFineRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await fineRulesRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Fine rule not found.' });
    }

    const updated = await fineRulesRepository.update(id, req.sanitizedRule);
    res.json({
      success: true,
      message: 'Fine rule updated successfully.',
      rule: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle fine rule active status
 * Route: PATCH /api/admin/fine-rules/:id/status
 */
const toggleFineRuleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Active must be a boolean.' });
    }

    const existing = await fineRulesRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Fine rule not found.' });
    }

    const updated = await fineRulesRepository.toggleStatus(id, active);
    res.json({
      success: true,
      message: `Fine rule is now ${active ? 'Active' : 'Inactive'}.`,
      rule: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all payment records (Payment Logs displays ONLY SUCCESS and FAILED payments)
 * Route: GET /api/admin/payments
 */
const getAllPayments = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let payments = await paymentRepository.findAll({ search });

    // Payment Logs audit displays ONLY SUCCESS and FAILED records (excludes internal CREATED)
    if (status === 'SUCCESS') {
      payments = payments.filter((p) => p.status === 'SUCCESS');
    } else if (status === 'FAILED') {
      payments = payments.filter((p) => p.status === 'FAILED');
    } else {
      // "All Payment Statuses" -> show both SUCCESS and FAILED records
      payments = payments.filter((p) => p.status === 'SUCCESS' || p.status === 'FAILED');
    }

    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Safe Demo Reset: Clears today's demo late records and payment test transactions.
 * Preserves students, users, staff, fine rules, college settings, barcodes, and permanent configuration.
 * Route: POST /api/admin/demo-reset
 */
const resetDemoData = async (req, res, next) => {
  try {
    const { studentId, date } = req.body || {};
    const result = await lateRecordRepository.resetTodayDemoRecords({
      studentId: studentId ? Number(studentId) : null,
      dateStr: date || null
    });

    res.json({
      success: true,
      message: `Demo reset complete. Safely cleared ${result.deletedLateRecordsCount} record(s) and ${result.deletedPaymentsCount} payment transaction(s) for ${result.targetDate}. Students can now be scanned again for demonstration.`,
      result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getSettings,
  updateSettings,
  getFineRules,
  createFineRule,
  updateFineRule,
  toggleFineRuleStatus,
  getAllPayments,
  resetDemoData
};
