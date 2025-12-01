import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Testing database connection...');
console.log('Host:', process.env.DB_HOST);
console.log('Port:', process.env.DB_PORT);
console.log('Database:', process.env.DB_NAME);
console.log('User:', process.env.DB_USER);
console.log('Password:', process.env.DB_PASSWORD ? '***' : 'NOT SET');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'flowdeck',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  try {
    console.log('\n📡 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    const result = await client.query('SELECT NOW()');
    console.log('⏰ Server time:', result.rows[0].now);
    
    client.release();
    await pool.end();
    console.log('🔌 Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Is PostgreSQL running? Check with: Get-Service postgresql*');
    console.error('2. Does database "flowdeck" exist? Create with: createdb flowdeck');
    console.error('3. Are credentials correct in .env file?');
    console.error('4. Can you connect manually? Try: psql -U postgres -d flowdeck');
    process.exit(1);
  }
}

testConnection();
