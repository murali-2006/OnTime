const { getFirestore } = require('../firestore');
const { getIndiaTodayStr } = require('../../utils/indiaTime');

const db = () => getFirestore();

// Helper to extract clean object data with document id
const docToData = (doc) => {
  if (!doc || !doc.exists) return null;
  const data = doc.data();
  return { id: data.id !== undefined ? data.id : parseInt(doc.id, 10) || doc.id, ...data };
};

// Helper to get next sequence ID for a collection
const getNextId = async (colName) => {
  const snapshot = await db().collection(colName).get();
  let maxId = 0;
  snapshot.forEach((doc) => {
    const data = doc.data();
    const numericId = parseInt(data.id || doc.id, 10);
    if (!isNaN(numericId) && numericId > maxId) {
      maxId = numericId;
    }
  });
  return maxId + 1;
};

// ==========================================
// 1. USERS REPOSITORY
// ==========================================
const userRepository = {
  async findById(id) {
    const doc = await db().collection('users').doc(String(id)).get();
    return docToData(doc);
  },

  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const snapshot = await db().collection('users').where('email', '==', cleanEmail).limit(1).get();
    if (snapshot.empty) return null;
    return docToData(snapshot.docs[0]);
  },

  async create({ email, password_hash, role, status = 'ACTIVE' }) {
    const cleanEmail = email.trim().toLowerCase();
    const existing = await this.findByEmail(cleanEmail);
    if (existing) {
      const err = new Error('A user with this email already exists.');
      err.code = '23505';
      err.constraint = 'idx_users_email';
      throw err;
    }

    const nextId = await getNextId('users');
    const now = new Date().toISOString();
    const userData = {
      id: nextId,
      email: cleanEmail,
      password_hash,
      role: role.toUpperCase(),
      status: status.toUpperCase(),
      created_at: now,
      updated_at: now
    };

    await db().collection('users').doc(String(nextId)).set(userData);
    return userData;
  },

  async update(id, updates) {
    const now = new Date().toISOString();
    const dataToUpdate = { ...updates, updated_at: now };
    if (dataToUpdate.email) {
      dataToUpdate.email = dataToUpdate.email.trim().toLowerCase();
    }
    await db().collection('users').doc(String(id)).update(dataToUpdate);
    return await this.findById(id);
  },

  async delete(id) {
    await db().collection('users').doc(String(id)).delete();
    return true;
  }
};

// ==========================================
// 2. STUDENTS REPOSITORY
// ==========================================
const studentRepository = {
  async findAll({ search, department, year, status } = {}) {
    const snapshot = await db().collection('students').get();
    let students = [];
    snapshot.forEach((doc) => students.push(docToData(doc)));

    if (department) {
      students = students.filter((s) => s.department === department);
    }
    if (year) {
      students = students.filter((s) => s.year === year);
    }
    if (status) {
      students = students.filter((s) => s.status === status);
    }
    if (search) {
      const q = search.trim().toLowerCase();
      students = students.filter(
        (s) =>
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.student_code && s.student_code.toLowerCase().includes(q)) ||
          (s.register_number && s.register_number.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q))
      );
    }

    students.sort((a, b) => (b.id || 0) - (a.id || 0));
    return students;
  },

  async findById(id) {
    const doc = await db().collection('students').doc(String(id)).get();
    return docToData(doc);
  },

  async findByCode(studentCode) {
    if (!studentCode) return null;
    const cleanCode = String(studentCode).trim().toUpperCase();
    const snapshot = await db().collection('students').get();
    let found = null;
    snapshot.forEach((doc) => {
      const data = docToData(doc);
      if (
        (data.student_code && data.student_code.trim().toUpperCase() === cleanCode) ||
        (data.barcode_data && data.barcode_data.trim().toUpperCase() === cleanCode) ||
        (data.register_number && data.register_number.trim().toUpperCase() === cleanCode) ||
        String(data.id) === cleanCode
      ) {
        found = data;
      }
    });
    return found;
  },

  async findByBarcode(barcode) {
    return this.findByCode(barcode);
  },

  async findByRegisterNumber(regNo) {
    if (!regNo) return null;
    const cleanReg = String(regNo).trim().toUpperCase();
    const snapshot = await db().collection('students').get();
    let found = null;
    snapshot.forEach((doc) => {
      const data = docToData(doc);
      if (data.register_number && data.register_number.trim().toUpperCase() === cleanReg) {
        found = data;
      }
    });
    return found;
  },

  async findByUserId(userId) {
    const snapshot = await db().collection('students').where('user_id', '==', Number(userId)).limit(1).get();
    if (snapshot.empty) return null;
    return docToData(snapshot.docs[0]);
  },

  async create(data) {
    const nextId = await getNextId('students');
    const now = new Date().toISOString();
    const studentData = {
      id: nextId,
      student_code: String(data.studentCode || data.student_code).trim().toUpperCase(),
      name: String(data.name).trim(),
      register_number: String(data.registerNumber || data.register_number).trim().toUpperCase(),
      department: String(data.department).trim(),
      year: String(data.year).trim(),
      email: String(data.email).trim().toLowerCase(),
      phone: data.phone ? String(data.phone).trim() : null,
      status: data.status || 'ACTIVE',
      user_id: data.user_id || data.userId || null,
      created_at: now,
      updated_at: now
    };

    await db().collection('students').doc(String(nextId)).set(studentData);
    return studentData;
  },

  async update(id, updates) {
    const now = new Date().toISOString();
    const dataToUpdate = { ...updates, updated_at: now };
    if (dataToUpdate.register_number) {
      dataToUpdate.register_number = dataToUpdate.register_number.trim().toUpperCase();
    }
    if (dataToUpdate.student_code) {
      dataToUpdate.student_code = dataToUpdate.student_code.trim().toUpperCase();
    }
    if (dataToUpdate.email) {
      dataToUpdate.email = dataToUpdate.email.trim().toLowerCase();
    }
    await db().collection('students').doc(String(id)).update(dataToUpdate);
    return await this.findById(id);
  },

  async delete(id) {
    await db().collection('students').doc(String(id)).delete();
    return true;
  }
};

// ==========================================
// 3. STAFF REPOSITORY
// ==========================================
const staffRepository = {
  async findById(id) {
    const doc = await db().collection('staff').doc(String(id)).get();
    return docToData(doc);
  },

  async findByUserId(userId) {
    const snapshot = await db().collection('staff').where('user_id', '==', Number(userId)).limit(1).get();
    if (snapshot.empty) return null;
    return docToData(snapshot.docs[0]);
  },

  async create(data) {
    const nextId = await getNextId('staff');
    const now = new Date().toISOString();
    const staffData = {
      id: nextId,
      user_id: data.user_id || data.userId,
      name: data.name,
      employee_id: data.employee_id || data.employeeId,
      department: data.department,
      created_at: now,
      updated_at: now
    };
    await db().collection('staff').doc(String(nextId)).set(staffData);
    return staffData;
  }
};

// ==========================================
// 4. COLLEGE SETTINGS REPOSITORY
// ==========================================
const settingsRepository = {
  async get() {
    return this.getSettings();
  },

  async getSettings() {
    const doc = await db().collection('college_settings').doc('1').get();
    if (!doc.exists) {
      return {
        id: 1,
        reporting_time: '09:00:00',
        late_enabled: true,
        sessions: [
          { name: '1st Period', time: '09:00:00', label: '9:00 AM' },
          { name: '1st Break', time: '11:00:00', label: '11:00 AM' },
          { name: 'Lunch', time: '13:15:00', label: '1:15 PM' },
          { name: '2nd Break', time: '15:00:00', label: '3:00 PM' }
        ]
      };
    }
    return docToData(doc);
  },

  async updateSettings({ reportingTime, lateEnabled }) {
    const now = new Date().toISOString();
    let cleanTime = reportingTime ? reportingTime.trim() : '09:00:00';
    if (cleanTime.split(':').length === 2) {
      cleanTime += ':00';
    }

    const data = {
      id: 1,
      reporting_time: cleanTime,
      late_enabled: lateEnabled !== undefined ? Boolean(lateEnabled) : true,
      sessions: [
        { name: '1st Period', time: '09:00:00', label: '9:00 AM' },
        { name: '1st Break', time: '11:00:00', label: '11:00 AM' },
        { name: 'Lunch', time: '13:15:00', label: '1:15 PM' },
        { name: '2nd Break', time: '15:00:00', label: '3:00 PM' }
      ],
      updated_at: now
    };

    await db().collection('college_settings').doc('1').set(data, { merge: true });
    return data;
  }
};

// ==========================================
// 5. FINE RULES REPOSITORY
// ==========================================
const fineRulesRepository = {
  async findAll() {
    const snapshot = await db().collection('fine_rules').get();
    const rules = [];
    snapshot.forEach((doc) => rules.push(docToData(doc)));
    rules.sort((a, b) => (a.min_minutes || 0) - (b.min_minutes || 0));
    return rules;
  },

  async findActive() {
    const snapshot = await db().collection('fine_rules').get();
    const rules = [];
    snapshot.forEach((doc) => {
      const r = docToData(doc);
      if (r.active) rules.push(r);
    });
    rules.sort((a, b) => (a.min_minutes || 0) - (b.min_minutes || 0));
    return rules;
  },

  async findAllActive() {
    return this.findActive();
  },

  async findById(id) {
    const doc = await db().collection('fine_rules').doc(String(id)).get();
    return docToData(doc);
  },

  async create(data) {
    const nextId = await getNextId('fine_rules');
    const now = new Date().toISOString();
    const ruleData = {
      id: nextId,
      min_minutes: parseInt(data.minMinutes || data.min_minutes, 10),
      max_minutes: data.maxMinutes !== null && data.maxMinutes !== undefined ? parseInt(data.maxMinutes || data.max_minutes, 10) : null,
      fine_amount: parseFloat(data.fineAmount || data.fine_amount).toFixed(2),
      active: data.active !== undefined ? Boolean(data.active) : true,
      created_at: now,
      updated_at: now
    };
    await db().collection('fine_rules').doc(String(nextId)).set(ruleData);
    return ruleData;
  },

  async update(id, data) {
    const now = new Date().toISOString();
    const ruleData = {
      min_minutes: parseInt(data.minMinutes || data.min_minutes, 10),
      max_minutes: data.maxMinutes !== null && data.maxMinutes !== undefined ? parseInt(data.maxMinutes || data.max_minutes, 10) : null,
      fine_amount: parseFloat(data.fineAmount || data.fine_amount).toFixed(2),
      active: data.active !== undefined ? Boolean(data.active) : true,
      updated_at: now
    };
    await db().collection('fine_rules').doc(String(id)).update(ruleData);
    return await this.findById(id);
  },

  async toggleStatus(id, active) {
    const now = new Date().toISOString();
    await db().collection('fine_rules').doc(String(id)).update({ active: Boolean(active), updated_at: now });
    return await this.findById(id);
  }
};

// ==========================================
// 6. LATE RECORDS REPOSITORY
// ==========================================
const lateRecordRepository = {
  async findDuplicateForDate(studentId, dateStr) {
    return this.findDuplicate(studentId, dateStr);
  },

  async findDuplicate(studentId, dateStr, reportingTime = null) {
    const snapshot = await db().collection('late_records').get();
    let found = null;
    snapshot.forEach((doc) => {
      const data = docToData(doc);
      const recDate = data.date ? (data.date.includes('T') ? data.date.split('T')[0] : data.date) : '';
      if (
        Number(data.student_id) === Number(studentId) &&
        recDate === dateStr &&
        (!reportingTime || data.reporting_time === reportingTime)
      ) {
        found = data;
      }
    });
    return found;
  },

  async findRecordsForStudentAndDate(studentId, dateStr) {
    const snapshot = await db().collection('late_records').get();
    const records = [];
    snapshot.forEach((doc) => {
      const data = docToData(doc);
      const recDate = data.date ? (data.date.includes('T') ? data.date.split('T')[0] : data.date) : '';
      if (Number(data.student_id) === Number(studentId) && recDate === dateStr) {
        records.push(data);
      }
    });
    return records;
  },

  async create(data) {
    const nextId = await getNextId('late_records');
    const now = new Date().toISOString();
    const dateStr = data.date || getIndiaTodayStr();

    const record = {
      id: nextId,
      student_id: Number(data.student_id || data.studentId),
      staff_id: data.staff_id || data.staffId ? Number(data.staff_id || data.staffId) : null,
      date: dateStr,
      session_name: data.session_name || data.sessionName || null,
      reporting_time: data.reporting_time || data.reportingTime,
      arrival_time: data.arrival_time || data.arrivalTime,
      late_minutes: Number(data.late_minutes || data.lateMinutes || 0),
      fine_amount: parseFloat(data.fine_amount || data.fineAmount || 0).toFixed(2),
      status: data.status || 'PENDING',
      is_demo: data.is_demo !== undefined ? Boolean(data.is_demo) : false,
      created_at: now,
      updated_at: now
    };

    await db().collection('late_records').doc(String(nextId)).set(record);
    return record;
  },

  async findById(id) {
    const doc = await db().collection('late_records').doc(String(id)).get();
    if (!doc.exists) return null;
    const record = docToData(doc);

    // Join student
    const student = await studentRepository.findById(record.student_id);
    // Join staff
    let staff = null;
    if (record.staff_id) {
      staff = await staffRepository.findById(record.staff_id);
    }
    // Join payment if any
    const paySnap = await db().collection('payments').where('late_record_id', '==', Number(record.id)).get();
    let payment = null;
    paySnap.forEach((pDoc) => {
      const p = docToData(pDoc);
      if (p.status === 'SUCCESS') payment = p;
    });

    return {
      ...record,
      student_code: student ? student.student_code : '',
      student_name: student ? student.name : '',
      register_number: student ? student.register_number : '',
      department: student ? student.department : '',
      year: student ? student.year : '',
      student_email: student ? student.email : '',
      student_phone: student ? student.phone : '',
      staff_name: staff ? staff.name : null,
      payment_id: payment ? payment.id : null,
      transaction_id: payment ? payment.transaction_id : null,
      payment_gateway: payment ? payment.payment_gateway : null,
      paid_at: payment ? payment.paid_at : null
    };
  },

  async findAll({ date, status, studentId, search, limit = 50, offset = 0 } = {}) {
    const snapshot = await db().collection('late_records').get();
    let records = [];
    snapshot.forEach((doc) => records.push(docToData(doc)));

    // Pre-fetch students, staff, payments for joins
    const students = await studentRepository.findAll();
    const studentsMap = {};
    students.forEach((s) => (studentsMap[s.id] = s));

    const staffSnap = await db().collection('staff').get();
    const staffMap = {};
    staffSnap.forEach((doc) => {
      const st = docToData(doc);
      staffMap[st.id] = st;
    });

    const paySnap = await db().collection('payments').get();
    const payMap = {};
    paySnap.forEach((doc) => {
      const p = docToData(doc);
      if (p.status === 'SUCCESS') {
        payMap[p.late_record_id] = p;
      }
    });

    // Decorate records
    records = records.map((r) => {
      const stu = studentsMap[r.student_id];
      const stf = staffMap[r.staff_id];
      const pay = payMap[r.id];
      const cleanDate = r.date && r.date.includes('T') ? r.date.split('T')[0] : r.date;
      return {
        ...r,
        date: cleanDate,
        student_code: stu ? stu.student_code : '',
        student_name: stu ? stu.name : '',
        register_number: stu ? stu.register_number : '',
        department: stu ? stu.department : '',
        year: stu ? stu.year : '',
        staff_name: stf ? stf.name : null,
        payment_id: pay ? pay.id : null,
        transaction_id: pay ? pay.transaction_id : null,
        payment_status: pay ? pay.status : null
      };
    });

    // Apply filters
    if (studentId) {
      records = records.filter((r) => Number(r.student_id) === Number(studentId));
    }
    if (date) {
      records = records.filter((r) => r.date === date);
    }
    if (status) {
      records = records.filter((r) => r.status === status);
    }
    if (search) {
      const q = search.trim().toLowerCase();
      records = records.filter(
        (r) =>
          (r.student_name && r.student_name.toLowerCase().includes(q)) ||
          (r.student_code && r.student_code.toLowerCase().includes(q)) ||
          (r.register_number && r.register_number.toLowerCase().includes(q))
      );
    }

    // Sort by date desc, created_at desc
    records.sort((a, b) => {
      if (a.date !== b.date) return (b.date || '').localeCompare(a.date || '');
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    const totalCount = records.length;
    const paginated = records.slice(Number(offset), Number(offset) + Number(limit));

    return { records: paginated, count: totalCount };
  },

  async update(id, updates) {
    const now = new Date().toISOString();
    await db().collection('late_records').doc(String(id)).update({ ...updates, updated_at: now });
    return await this.findById(id);
  },

  async deleteByStudentId(studentId) {
    const snapshot = await db().collection('late_records').get();
    for (const doc of snapshot.docs) {
      const d = docToData(doc);
      if (Number(d.student_id) === Number(studentId)) {
        await db().collection('late_records').doc(doc.id).delete();
      }
    }
  },

  async resetTodayDemoRecords({ studentId = null, dateStr = null } = {}) {
    const targetDate = dateStr || getIndiaTodayStr();
    const snapshot = await db().collection('late_records').get();
    const deletedLateRecordIds = [];

    for (const doc of snapshot.docs) {
      const d = docToData(doc);
      const recDate = d.date ? (d.date.includes('T') ? d.date.split('T')[0] : d.date) : '';
      const matchesDate = recDate === targetDate;
      const matchesStudent = !studentId || Number(d.student_id) === Number(studentId);

      if (matchesDate && matchesStudent) {
        deletedLateRecordIds.push(d.id);
        await db().collection('late_records').doc(doc.id).delete();
      }
    }

    // Safely delete corresponding payments for these late records only
    let deletedPaymentsCount = 0;
    if (deletedLateRecordIds.length > 0) {
      const paySnapshot = await db().collection('payments').get();
      for (const pDoc of paySnapshot.docs) {
        const p = docToData(pDoc);
        if (deletedLateRecordIds.includes(Number(p.late_record_id))) {
          await db().collection('payments').doc(pDoc.id).delete();
          deletedPaymentsCount++;
        }
      }
    }

    return {
      deletedLateRecordsCount: deletedLateRecordIds.length,
      deletedPaymentsCount,
      targetDate
    };
  }
};

// ==========================================
// 7. PAYMENTS REPOSITORY
// ==========================================
const paymentRepository = {
  async findById(id) {
    const doc = await db().collection('payments').doc(String(id)).get();
    if (!doc.exists) return null;
    return docToData(doc);
  },

  async findByOrderId(orderId) {
    const snapshot = await db().collection('payments').where('gateway_order_id', '==', orderId).limit(1).get();
    if (snapshot.empty) return null;
    return docToData(snapshot.docs[0]);
  },

  async findPendingByLateRecordId(lateRecordId) {
    const snapshot = await db().collection('payments').get();
    let found = null;
    snapshot.forEach((doc) => {
      const p = docToData(doc);
      if (
        (Number(p.late_record_id) === Number(lateRecordId) || Number(p.lateRecordId) === Number(lateRecordId)) &&
        p.status === 'PENDING'
      ) {
        found = p;
      }
    });
    return found;
  },

  async findAllByStudentId(studentId) {
    const snapshot = await db().collection('payments').get();
    const list = [];
    snapshot.forEach((doc) => {
      const p = docToData(doc);
      if (Number(p.student_id) === Number(studentId) || Number(p.studentId) === Number(studentId)) {
        list.push(p);
      }
    });
    list.sort((a, b) => (b.submittedAt || b.created_at || '').localeCompare(a.submittedAt || a.created_at || ''));
    return list;
  },

  async create(data) {
    const nextId = await getNextId('payments');
    const now = new Date().toISOString();
    const fineAmt = parseFloat(data.amount || data.fineAmount || 0).toFixed(2);
    const payment = {
      id: nextId,
      paymentId: nextId,
      late_record_id: Number(data.late_record_id || data.lateRecordId),
      lateRecordId: Number(data.late_record_id || data.lateRecordId),
      student_id: Number(data.student_id || data.studentId),
      studentId: Number(data.student_id || data.studentId),
      student_name: data.student_name || data.studentName || '',
      studentName: data.student_name || data.studentName || '',
      student_code: data.student_code || data.studentCode || '',
      studentCode: data.student_code || data.studentCode || '',
      register_number: data.register_number || data.registerNumber || '',
      department: data.department || '',
      amount: fineAmt,
      fineAmount: fineAmt,
      payment_gateway: data.payment_gateway || 'DEMO_QR',
      transaction_id: data.transaction_id || `DEMO_PAY_${Date.now()}`,
      gateway_order_id: data.gateway_order_id || data.orderId || `ord_demo_${Date.now()}`,
      status: data.status || 'PENDING',
      submittedAt: data.submittedAt || now,
      created_at: now,
      updated_at: now,
      verifiedAt: data.verifiedAt || null,
      verifiedBy: data.verifiedBy || null,
      rejectionReason: data.rejectionReason || null
    };

    await db().collection('payments').doc(String(nextId)).set(payment);
    return payment;
  },

  async update(id, updates) {
    const now = new Date().toISOString();
    await db().collection('payments').doc(String(id)).update({ ...updates, updated_at: now });
    return await this.findById(id);
  },

  async getReceiptDetails(identifier) {
    const snapshot = await db().collection('payments').get();
    let payment = null;
    snapshot.forEach((doc) => {
      const p = docToData(doc);
      if (
        String(p.id) === String(identifier) ||
        String(p.paymentId) === String(identifier) ||
        String(p.late_record_id) === String(identifier) ||
        String(p.lateRecordId) === String(identifier) ||
        String(p.transaction_id) === String(identifier)
      ) {
        // Prioritize PAID payments if multiple attempts exist
        if (!payment || p.status === 'PAID') {
          payment = p;
        }
      }
    });

    if (!payment) return null;

    // Receipt must become available ONLY after status === PAID
    if (payment.status !== 'PAID' && payment.status !== 'SUCCESS') {
      return null;
    }

    const lateRecord = await lateRecordRepository.findById(payment.late_record_id || payment.lateRecordId);
    const student = await studentRepository.findById(payment.student_id || payment.studentId);

    return {
      payment_id: payment.id,
      paymentId: payment.id,
      transaction_id: payment.transaction_id,
      gateway_order_id: payment.gateway_order_id,
      amount: payment.amount || payment.fineAmount,
      fineAmount: payment.amount || payment.fineAmount,
      payment_gateway: payment.payment_gateway,
      payment_status: payment.status,
      status: payment.status,
      paid_at: payment.paid_at || payment.verifiedAt,
      submittedAt: payment.submittedAt,
      verifiedAt: payment.verifiedAt,
      verifiedBy: payment.verifiedBy,
      payment_created_at: payment.created_at,
      late_record_id: lateRecord ? lateRecord.id : (payment.late_record_id || payment.lateRecordId),
      late_date: lateRecord ? lateRecord.date : null,
      reporting_time: lateRecord ? lateRecord.reporting_time : null,
      arrival_time: lateRecord ? lateRecord.arrival_time : null,
      late_minutes: lateRecord ? lateRecord.late_minutes : 0,
      fine_amount: lateRecord ? lateRecord.fine_amount : payment.amount,
      fine_status: lateRecord ? lateRecord.status : 'PAID',
      student_id: student ? student.id : (payment.student_id || payment.studentId),
      student_code: student ? student.student_code : (payment.student_code || payment.studentCode),
      student_name: student ? student.name : (payment.student_name || payment.studentName),
      register_number: student ? student.register_number : (payment.register_number || ''),
      department: student ? student.department : (payment.department || ''),
      year: student ? student.year : '',
      student_email: student ? student.email : '',
      student_phone: student ? student.phone : ''
    };
  },

  async findAll({ status, search } = {}) {
    const snapshot = await db().collection('payments').get();
    let payments = [];
    snapshot.forEach((doc) => payments.push(docToData(doc)));

    const students = await studentRepository.findAll();
    const studentsMap = {};
    students.forEach((s) => (studentsMap[s.id] = s));

    const lateSnap = await db().collection('late_records').get();
    const lateMap = {};
    lateSnap.forEach((doc) => {
      const lr = docToData(doc);
      lateMap[lr.id] = lr;
    });

    payments = payments.map((p) => {
      const s = studentsMap[p.student_id || p.studentId];
      const lr = lateMap[p.late_record_id || p.lateRecordId];
      return {
        ...p,
        student_code: s ? s.student_code : (p.student_code || p.studentCode || ''),
        studentCode: s ? s.student_code : (p.student_code || p.studentCode || ''),
        student_name: s ? s.name : (p.student_name || p.studentName || ''),
        studentName: s ? s.name : (p.student_name || p.studentName || ''),
        register_number: s ? s.register_number : (p.register_number || ''),
        registerNumber: s ? s.register_number : (p.register_number || ''),
        department: s ? s.department : (p.department || ''),
        late_date: lr ? (lr.date.includes('T') ? lr.date.split('T')[0] : lr.date) : '',
        late_minutes: lr ? lr.late_minutes : 0
      };
    });

    if (status) {
      payments = payments.filter((p) => p.status === status);
    }
    if (search) {
      const q = search.trim().toLowerCase();
      payments = payments.filter(
        (p) =>
          (p.student_name && p.student_name.toLowerCase().includes(q)) ||
          (p.student_code && p.student_code.toLowerCase().includes(q)) ||
          (p.transaction_id && p.transaction_id.toLowerCase().includes(q))
      );
    }

    payments.sort((a, b) => (b.submittedAt || b.created_at || '').localeCompare(a.submittedAt || a.created_at || ''));
    return payments;
  },

  async findAllRequests({ status } = {}) {
    return await this.findAll({ status });
  },

  async deleteByStudentId(studentId) {
    const snapshot = await db().collection('payments').get();
    for (const doc of snapshot.docs) {
      const d = docToData(doc);
      if (Number(d.student_id) === Number(studentId)) {
        await db().collection('payments').doc(doc.id).delete();
      }
    }
  }
};

// ==========================================
// 8. DASHBOARD STATISTICS REPOSITORY
// ==========================================
const dashboardRepository = {
  async getStats() {
    const today = getIndiaTodayStr();

    // Students
    const allStudents = await studentRepository.findAll();
    const activeStudents = allStudents.filter((s) => s.status === 'ACTIVE');

    // Late records
    const lrSnap = await db().collection('late_records').get();
    const lateRecords = [];
    lrSnap.forEach((doc) => lateRecords.push(docToData(doc)));

    const todayRecords = lateRecords.filter((r) => {
      const d = r.date ? (r.date.includes('T') ? r.date.split('T')[0] : r.date) : '';
      return d === today;
    });

    const todayLate = todayRecords.filter((r) => Number(r.late_minutes) > 0);

    const pendingFines = lateRecords.filter((r) => r.status === 'PENDING' && Number(r.fine_amount) > 0);
    const pendingFinesCount = pendingFines.length;
    const pendingFinesAmount = pendingFines.reduce((sum, r) => sum + parseFloat(r.fine_amount || 0), 0);

    // Payments
    const paySnap = await db().collection('payments').get();
    const payments = [];
    paySnap.forEach((doc) => payments.push(docToData(doc)));

    const successPayments = payments.filter((p) => p.status === 'SUCCESS');
    const todayPayments = successPayments.filter((p) => {
      const paidDate = p.paid_at ? getIndiaTodayStr(new Date(p.paid_at)) : '';
      return paidDate === today;
    });

    const todayCollection = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const allTimeCollection = successPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Recent late students for today
    const studentsMap = {};
    allStudents.forEach((s) => (studentsMap[s.id] = s));

    const recentLateStudents = todayRecords
      .map((lr) => {
        const s = studentsMap[lr.student_id];
        return {
          id: lr.id,
          arrival_time: lr.arrival_time,
          late_minutes: lr.late_minutes,
          fine_amount: lr.fine_amount,
          status: lr.status,
          student_code: s ? s.student_code : '',
          student_name: s ? s.name : '',
          register_number: s ? s.register_number : '',
          department: s ? s.department : ''
        };
      })
      .sort((a, b) => (b.created_at || b.arrival_time || '').localeCompare(a.created_at || a.arrival_time || ''))
      .slice(0, 10);

    // Department breakdown
    const deptCounts = {};
    lateRecords
      .filter((r) => Number(r.late_minutes) > 0)
      .forEach((r) => {
        const s = studentsMap[r.student_id];
        if (s && s.department) {
          deptCounts[s.department] = (deptCounts[s.department] || 0) + 1;
        }
      });

    const deptBreakdown = Object.entries(deptCounts)
      .map(([department, late_count]) => ({ department, late_count }))
      .sort((a, b) => b.late_count - a.late_count)
      .slice(0, 5);

    return {
      stats: {
        totalStudents: activeStudents.length,
        todayScans: todayRecords.length,
        todayLateStudents: todayLate.length,
        pendingFinesCount,
        pendingFinesAmount,
        todayCollection,
        allTimeCollection
      },
      recentLateStudents,
      deptBreakdown
    };
  }
};

module.exports = {
  userRepository,
  studentRepository,
  staffRepository,
  settingsRepository,
  fineRulesRepository,
  lateRecordRepository,
  paymentRepository,
  dashboardRepository
};
