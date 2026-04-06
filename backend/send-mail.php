<?php
/**
 * Mail Gateway Service - PHP Endpoint
 * 
 * This endpoint receives mail requests from Node.js and sends them via PHP mail()
 * Bypasses SMTP port restrictions on restricted servers
 * 
 * Usage: POST http://your-server.com/send-mail.php
 */

// ============================================
// HARDCODED MAIL CONFIGURATION
// ============================================

// API Security Key (change this to something secure)
define('API_KEY', 'zoro9x-mail-gateway-2024');
define('REQUIRE_API_KEY', true); // Re-enable for security

// Mail Method: 'php' (built-in) or 'smtp' (direct Gmail SMTP)
define('MAIL_METHOD', 'smtp');  // CHANGED: Use SMTP instead of php mail()

// For PHP mail() - Configure in php.ini or use these settings
define('SENDMAIL_FROM', 'zoro9x.tm@gmail.com');

// For SMTP Method (optional - if using SwiftMailer)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'zoro9x.tm@gmail.com');
define('SMTP_PASSWORD', 'jzsf uuqj jrec vmcz');
define('SMTP_ENCRYPTION', 'tls'); // 'tls' or 'ssl'

// ============================================
// ERROR HANDLING
// ============================================

error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't show errors to client
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php-mail.log');

// Create logs directory if it doesn't exist
if (!is_dir(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0755, true);
}

// Log that script is called
error_log("\n========================================");
error_log("✅ send-mail.php called at " . date('Y-m-d H:i:s'));
error_log("Method: " . $_SERVER['REQUEST_METHOD']);
error_log("URL: " . $_SERVER['REQUEST_URI']);
error_log("========================================");

// Security headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS, GET');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(json_encode(['status' => 'ok']));
}

// Test endpoint
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(200);
    exit(json_encode([
        'status' => 'ok',
        'message' => 'PHP Mail Gateway is running!',
        'timestamp' => date('Y-m-d H:i:s'),
        'method' => MAIL_METHOD
    ]));
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]));
}

// ============================================
// API KEY VERIFICATION
// ============================================

if (REQUIRE_API_KEY) {
    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
    
    error_log("🔍 API Key Check:");
    error_log("  Expected: " . API_KEY);
    error_log("  Received: " . ($apiKey ?: 'NOT SENT'));
    
    if ($apiKey !== API_KEY) {
        http_response_code(401);
        error_log("❌ Unauthorized API key attempt: $apiKey");
        exit(json_encode([
            'success' => false,
            'message' => 'Unauthorized - API key mismatch'
        ]));
    }
} else {
    error_log("⚠️  API key verification DISABLED (test mode)");
}

// ============================================
// GET JSON INPUT
// ============================================

$input = json_decode(file_get_contents('php://input'), true);

error_log("📨 Request data received:");
error_log("  To: " . ($input['to'] ?? 'N/A'));
error_log("  Subject: " . ($input['subject'] ?? 'N/A'));

// Validate required fields
if (!isset($input['to']) || !isset($input['subject']) || !isset($input['html'])) {
    http_response_code(400);
    exit(json_encode([
        'success' => false,
        'message' => 'Missing required fields: to, subject, html'
    ]));
}

// Validate email format
if (!filter_var($input['to'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit(json_encode([
        'success' => false,
        'message' => 'Invalid email address'
    ]));
}

// Validate sender email (optional but recommended)
$from = $input['from'] ?? SENDMAIL_FROM;
if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit(json_encode([
        'success' => false,
        'message' => 'Invalid sender email address'
    ]));
}

// ============================================
// PREPARE EMAIL DATA
// ============================================

$to = $input['to'];
$subject = $input['subject'];
$html = $input['html'];
$cc = $input['cc'] ?? null;
$bcc = $input['bcc'] ?? null;

try {
    $result = false;

    // ============================================
    // METHOD 1: PHP Built-in mail()
    // ============================================
    if (MAIL_METHOD === 'php') {
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: " . $from . "\r\n";
        $headers .= "Reply-To: " . $from . "\r\n";
        
        if ($cc) {
            $headers .= "Cc: " . $cc . "\r\n";
        }
        if ($bcc) {
            $headers .= "Bcc: " . $bcc . "\r\n";
        }
        
        $headers .= "X-Mailer: Zoro9x Mail Gateway\r\n";
        $headers .= "X-Priority: 3\r\n";

        // Send email
        error_log("📧 Attempting to send email via PHP mail()...");
        $result = mail($to, $subject, $html, $headers);
    }

    // ============================================
    // METHOD 2: SMTP via Gmail (Direct)
    // ============================================
    elseif (MAIL_METHOD === 'smtp') {
        error_log("📧 Attempting to send email via Gmail SMTP...");
        
        // Create socket connection to Gmail SMTP
        $smtp_server = SMTP_HOST;
        $smtp_port = SMTP_PORT;
        
        // Try to connect
        $socket = @fsockopen($smtp_server, $smtp_port, $errno, $errstr, 30);
        
        if (!$socket) {
            error_log("❌ SMTP Connection failed: $errstr ($errno)");
            $result = false;
        } else {
            error_log("✅ SMTP Connected to $smtp_server:$smtp_port");
            
            // Read server response
            $response = fgets($socket);
            error_log("SMTP Response: " . trim($response));
            
            // Send EHLO
            fputs($socket, "EHLO localhost\r\n");
            $response = fgets($socket);
            error_log("EHLO Response: " . trim($response));
            
            // Send STARTTLS
            fputs($socket, "STARTTLS\r\n");
            $response = fgets($socket);
            error_log("STARTTLS Response: " . trim($response));
            
            // Enable SSL/TLS
            stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
            
            // Send AUTH LOGIN
            fputs($socket, "AUTH LOGIN\r\n");
            $response = fgets($socket);
            error_log("AUTH Response: " . trim($response));
            
            // Send username (base64 encoded)
            $username = base64_encode(SMTP_USER);
            fputs($socket, $username . "\r\n");
            $response = fgets($socket);
            error_log("Username Response: " . trim($response));
            
            // Send password (base64 encoded)
            $password = base64_encode(SMTP_PASSWORD);
            fputs($socket, $password . "\r\n");
            $response = fgets($socket);
            error_log("Password Response: " . trim($response));
            
            // Send MAIL FROM
            fputs($socket, "MAIL FROM: <" . $from . ">\r\n");
            $response = fgets($socket);
            error_log("MAIL FROM Response: " . trim($response));
            
            // Send RCPT TO
            fputs($socket, "RCPT TO: <" . $to . ">\r\n");
            $response = fgets($socket);
            error_log("RCPT TO Response: " . trim($response));
            
            // Send DATA
            fputs($socket, "DATA\r\n");
            $response = fgets($socket);
            error_log("DATA Response: " . trim($response));
            
            // Build email headers and body
            $email_content = "From: " . $from . "\r\n";
            $email_content .= "To: " . $to . "\r\n";
            if ($cc) {
                $email_content .= "Cc: " . $cc . "\r\n";
            }
            $email_content .= "Subject: " . $subject . "\r\n";
            $email_content .= "MIME-Version: 1.0\r\n";
            $email_content .= "Content-Type: text/html; charset=UTF-8\r\n";
            $email_content .= "\r\n";
            $email_content .= $html . "\r\n";
            
            // Send email content
            fputs($socket, $email_content . "\r\n.\r\n");
            $response = fgets($socket);
            error_log("Send Response: " . trim($response));
            
            // Send QUIT
            fputs($socket, "QUIT\r\n");
            $response = fgets($socket);
            
            fclose($socket);
            $result = true;
        }
    }

    // ============================================
    // RESPONSE
    // ============================================

    if ($result) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Email sent successfully',
            'recipient' => $to,
            'method' => MAIL_METHOD
        ]);
        
        error_log("✅ Email sent to: $to, Subject: $subject, From: $from");
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to send email via mail()'
        ]);
        
        error_log("❌ Failed to send email to: $to");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
    
    error_log("❌ Exception in mail gateway: " . $e->getMessage());
}
?>
