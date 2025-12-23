/**
 * Portfolio Data Migration Script
 * Populates the portfolio table with initial data
 * Run this once after creating the portfolio table
 */

const { pool } = require('../config/database');

const initialPortfolioData = [
  {
    title: "Hotel Booking Website",
    description: "Responsive design for a Hotel",
    image: "/uploads/portfolio/projects3.png",
    link: "https://bolagalanatureresort.com/",
    technologies: ["React", "Node.js", "MongoDB"]
  },
  {
    title: "Salon Booking Website",
    description: "Responsive Web Page for a Salon",
    image: "/uploads/portfolio/projects5.png",
    link: "https://salonkaveesha.com/",
    technologies: ["React", "TypeScript", "Tailwind CSS"]
  },
  {
    title: "Business Website",
    description: "Responsive design for a Business Company",
    image: "/uploads/portfolio/projects1.png",
    link: "https://smarttradingasia.com/",
    technologies: ["Next.js", "React", "CSS"]
  },
  {
    title: "Business Website",
    description: "Clean design for a Business Company",
    image: "/uploads/portfolio/projects2.png",
    link: "https://silvaaccessorieslanka.com/",
    technologies: ["HTML", "CSS", "JavaScript"]
  },
  {
    title: "Wedding Planning Platform",
    description: "A Website for wedding planning and management",
    image: "/uploads/portfolio/projects4.png",
    link: "https://royalweddings.lk/",
    technologies: ["React", "Express", "MySQL"]
  }
];

async function migratePortfolioData() {
  try {
    console.log('🔄 Starting portfolio data migration...');

    // Check if data already exists
    const [existing] = await pool.query('SELECT COUNT(*) as count FROM portfolio');
    
    if (existing[0].count > 0) {
      console.log(`ℹ️  Portfolio table already has ${existing[0].count} items. Skipping migration.`);
      console.log('💡 To re-run migration, delete existing portfolio data first.');
      return;
    }

    // Insert initial portfolio data
    for (const item of initialPortfolioData) {
      const techJson = JSON.stringify(item.technologies);
      
      await pool.query(
        'INSERT INTO portfolio (title, description, image, link, technologies) VALUES (?, ?, ?, ?, ?)',
        [item.title, item.description, item.image, item.link, techJson]
      );
      
      console.log(`✅ Added: ${item.title}`);
    }

    console.log('\n✨ Portfolio data migration completed successfully!');
    console.log(`📊 Total items added: ${initialPortfolioData.length}`);
    
  } catch (error) {
    console.error('❌ Error during portfolio migration:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const { initializeDatabase } = require('../config/database');
  
  (async () => {
    try {
      await initializeDatabase();
      await migratePortfolioData();
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { migratePortfolioData };
