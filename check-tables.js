import pool from './src/db/db.js';

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables in database:');
    if (result.rows.length === 0) {
      console.log('⚠️  No tables found! Run: npm run db:setup');
    } else {
      result.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
