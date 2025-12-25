const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'zoro9x'
  });
  
  console.log('=== Systems ===');
  const [systems] = await conn.execute('SELECT id, name, python_file_path FROM systems');
  console.log(JSON.stringify(systems, null, 2));
  
  console.log('\n=== Subscription Plans ===');
  const [plans] = await conn.execute('SELECT id, system_id, name FROM subscription_plans');
  console.log(JSON.stringify(plans, null, 2));
  
  console.log('\n=== Client Subscriptions ===');
  const [subscriptions] = await conn.execute(`
    SELECT cs.id, s.name as system_name, s.python_file_path, 
           sp.name as plan_name, cs.status
    FROM client_subscriptions cs
    JOIN systems s ON cs.system_id = s.id
    JOIN subscription_plans sp ON cs.plan_id = sp.id
  `);
  console.log(JSON.stringify(subscriptions, null, 2));
  
  await conn.end();
}

test().catch(console.error);
