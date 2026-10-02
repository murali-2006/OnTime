const path = require('path');
const { getFirestore, isCloud, getConnectionStatus } = require('./firestore');

async function testConnection() {
  console.log('\n====================================================');
  console.log('🔍 Testing Firebase Cloud Firestore Connection...');
  console.log('====================================================\n');

  const status = getConnectionStatus();
  console.log(`- Detected Credentials: ${status.configured ? 'YES' : 'NO'}`);
  console.log(`- Connection Mode: ${status.method}`);
  if (status.keyFilePath) {
    console.log(`- Key File Path: ${status.keyFilePath}`);
  }
  console.log(`- Target Project: ${status.projectId}\n`);

  try {
    // Disable fallback so we test REAL Google Cloud Firestore only
    const db = getFirestore({ allowFallback: false });
    const cloudActive = isCloud();

    if (!cloudActive) {
      throw new Error('Expected Google Cloud Firestore, but local fallback was returned.');
    }

    console.log('🔥 Status: CONNECTED TO GOOGLE CLOUD FIRESTORE');
    console.log(`- Active Project ID: ${status.projectId}`);

    // Live Read/Write verification test against real Cloud Firestore
    const testDocId = `test_ping_${Date.now()}`;
    const testDocRef = db.collection('_connection_verification').doc(testDocId);

    // 1. Write Test
    process.stdout.write('- Performing Cloud Write test... ');
    const writeTime = new Date().toISOString();
    await testDocRef.set({
      service: 'OnTime Node.js Backend',
      message: 'Cloud Firestore connection test',
      testedAt: writeTime
    });
    console.log('✅ PASSED');

    // 2. Read Test
    process.stdout.write('- Performing Cloud Read test... ');
    const snapshot = await testDocRef.get();
    if (!snapshot.exists) {
      throw new Error('Read verification failed: Document was written but not found on read.');
    }
    const docData = snapshot.data();
    console.log(`✅ PASSED (Verified: "${docData.message}")`);

    // 3. Cleanup Test
    process.stdout.write('- Performing Cloud Cleanup test... ');
    await testDocRef.delete();
    console.log('✅ PASSED\n');

    console.log('====================================================');
    console.log('🎉 SUCCESS: REAL GOOGLE CLOUD FIRESTORE IS CONNECTED!');
    console.log('====================================================\n');

    return { success: true, isCloud: true, status };
  } catch (err) {
    console.error('\n====================================================');
    console.error('❌ CLOUD FIRESTORE CONNECTION FAILED:');
    console.error(err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    console.error('====================================================\n');
    return { success: false, error: err.message, status };
  }
}

if (require.main === module) {
  testConnection().then((res) => {
    process.exit(res.success ? 0 : 1);
  });
}

module.exports = { testConnection };
