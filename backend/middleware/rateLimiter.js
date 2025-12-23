/**
 * Rate Limiting Middleware
 * 
 * Protects API endpoints from abuse
 */

const { pool } = require('../config/database');
const { logAudit } = require('../services/auditService');

/**
 * Rate limiting middleware
 */
async function rateLimiter(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 60,
    identifier = 'ip', // 'ip', 'apiKey', 'userId'
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = null
  } = options;
  
  return async (req, res, next) => {
    try {
      // Generate key for rate limiting
      let key;
      if (keyGenerator) {
        key = keyGenerator(req);
      } else if (identifier === 'apiKey') {
        key = req.headers['x-api-key'] || req.ip;
      } else if (identifier === 'userId') {
        key = req.user?.id || req.admin?.id || req.ip;
      } else {
        key = req.ip;
      }
      
      const connection = await pool.getConnection();
      
      // Get or create rate limit record
      const now = new Date();
      const windowStart = new Date(now.getTime() - windowMs);
      
      const [existing] = await connection.execute(
        'SELECT * FROM rate_limits WHERE identifier = ? AND identifier_type = ? AND created_at > ?',
        [key, identifier, windowStart]
      );
      
      let currentCount = 0;
      let recordId = null;
      
      if (existing.length > 0) {
        currentCount = existing[0].request_count;
        recordId = existing[0].id;
        
        // Check if limit exceeded
        if (currentCount >= maxRequests) {
          // Update last_request_at
          await connection.execute(
            'UPDATE rate_limits SET last_request_at = NOW(), is_blocked = true WHERE id = ?',
            [recordId]
          );
          
          connection.release();
          
          // Log rate limit exceeded
          await logAudit({
            userId: req.user?.id || req.admin?.id || null,
            userType: req.admin ? 'admin' : 'client',
            action: 'RATE_LIMIT_EXCEEDED',
            resourceType: 'rate_limit',
            resourceId: recordId,
            ipAddress: req.ip,
            status: 'failure',
            errorMessage: `Rate limit exceeded: ${currentCount} requests in window`
          });
          
          return res.status(429).json({
            error: 'Too many requests',
            message: `Rate limit exceeded. Please try again later.`,
            retryAfter: Math.ceil(windowMs / 1000)
          });
        }
        
        // Increment request count
        await connection.execute(
          'UPDATE rate_limits SET request_count = request_count + 1, last_request_at = NOW() WHERE id = ?',
          [recordId]
        );
        
        currentCount++;
      } else {
        // Create new rate limit record
        const [result] = await connection.execute(
          `INSERT INTO rate_limits 
           (identifier, identifier_type, request_count, last_request_at) 
           VALUES (?, ?, 1, NOW())`,
          [key, identifier]
        );
        
        recordId = result.insertId;
        currentCount = 1;
      }
      
      connection.release();
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
      res.setHeader('X-RateLimit-Reset', new Date(now.getTime() + windowMs).toISOString());
      
      next();
      
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Continue even if rate limiting fails
      next();
    }
  };
}

/**
 * Predefined rate limiters
 */

// Strict rate limiter for authentication endpoints
const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  identifier: 'ip'
});

// API rate limiter for general endpoints
const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60,
  identifier: 'ip'
});

// Premium API rate limiter for authenticated users
const premiumApiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 120,
  identifier: 'userId'
});

// API key rate limiter for system API keys
const apiKeyRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 1000,
  identifier: 'apiKey',
  keyGenerator: (req) => req.headers['x-api-key']
});

/**
 * Clean old rate limit records
 */
async function cleanOldRateLimits(hours = 24) {
  try {
    const connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      'DELETE FROM rate_limits WHERE created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)',
      [hours]
    );
    
    connection.release();
    
    return result.affectedRows;
  } catch (error) {
    console.error('Error cleaning old rate limits:', error);
    throw error;
  }
}

/**
 * Get rate limit statistics
 */
async function getRateLimitStats(identifier = null, identifierType = null) {
  try {
    const connection = await pool.getConnection();
    
    let query = `
      SELECT 
        identifier_type,
        COUNT(*) as total_records,
        SUM(request_count) as total_requests,
        AVG(request_count) as avg_requests,
        COUNT(CASE WHEN is_blocked THEN 1 END) as blocked_count
      FROM rate_limits
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `;
    const params = [];
    
    if (identifier && identifierType) {
      query += ' AND identifier = ? AND identifier_type = ?';
      params.push(identifier, identifierType);
    }
    
    query += ' GROUP BY identifier_type';
    
    const [results] = await connection.execute(query, params);
    
    connection.release();
    
    return results;
  } catch (error) {
    console.error('Error getting rate limit stats:', error);
    throw error;
  }
}

/**
 * Block/unblock identifier
 */
async function toggleBlock(identifier, identifierType, block = true) {
  try {
    const connection = await pool.getConnection();
    
    await connection.execute(
      'UPDATE rate_limits SET is_blocked = ? WHERE identifier = ? AND identifier_type = ?',
      [block, identifier, identifierType]
    );
    
    connection.release();
  } catch (error) {
    console.error('Error toggling block:', error);
    throw error;
  }
}

module.exports = {
  rateLimiter,
  authRateLimiter,
  apiRateLimiter,
  premiumApiRateLimiter,
  apiKeyRateLimiter,
  cleanOldRateLimits,
  getRateLimitStats,
  toggleBlock
};
