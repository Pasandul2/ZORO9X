/**
 * Clear Portfolio Data
 * Run this to delete all portfolio items and re-run migration
 */

const { pool } = require('../config/database');

async function clearPortfolio() {
  try {
    console.log('🔄 Clearing portfolio data...');
    
    const [result] = await pool.query('DELETE FROM portfolio');
    
    console.log(`✅ Deleted ${result.affectedRows} portfolio items`);
    console.log('💡 Now run: npm run migrate:portfolio');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  const { initializeDatabase } = require('../config/database');
  
  (async () => {
    try {
      await initializeDatabase();
      await clearPortfolio();
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  })();
}

module.exports = { clearPortfolio };
