const mysql = require('mysql2/promise');

async function fix() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'zoro9x'
  });
  
  await conn.execute("UPDATE systems SET python_file_path = 'gym_management' WHERE id = 1");
  console.log('✅ Updated Gym Management System path');
  
  await conn.execute("UPDATE systems SET python_file_path = 'restaurant_management' WHERE id = 2");
  console.log('✅ Updated Restaurant Management System path');
  
  // Verify
  const [systems] = await conn.execute('SELECT id, name, python_file_path FROM systems');
  console.log('\nUpdated systems:');
  console.log(JSON.stringify(systems, null, 2));
  
  await conn.end();
}

fix().catch(console.error);
