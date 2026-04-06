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

// Mail Method: 'php' (built-in) or 'smtp' (using SwiftMailer)
define('MAIL_METHOD', 'php');

// For PHP mail() - Configure in php.ini or use these settings
define('SENDMAIL_FROM', 'zoro9x.tm@gmail.com');

// For SMTP Method (optional - if using SwiftMailer)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USER', 'zoro9x.tm@gmail.com');
define('SMTP_PASSWORD', 'jzsf uuqj jrec vmcz');
define('SMTP_ENCRYPTION', 'tls'); // 'tls' or 'ssl'

// Optional: Allowed sender domains (for email spoofing prevention)
$ALLOWED_SENDERS = [
    'noreply@zoro9x.com',
    'support@zoro9x.com',
    'info@zoro9x.com'
];

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

// Security headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*'));
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(json_encode(['status' => 'ok']));
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

$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';

error_log("🔍 API Key Check:");
error_log("  Expected: " . API_KEY);
error_log("  Received: " . ($apiKey ?: 'NOT SENT'));
error_log("  Headers: " . json_encode(getallheaders()));

if ($apiKey !== API_KEY) {
    http_response_code(401);
    error_log("❌ Unauthorized API key attempt: $apiKey");
    exit(json_encode([
        'success' => false,
        'message' => 'Unauthorized - API key mismatch'
    ]));
}

// ============================================
// GET JSON INPUT
// ============================================

$input = json_decode(file_get_contents('php://input'), true);

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
        $result = mail($to, $subject, $html, $headers);
    }

    // ============================================
    // METHOD 2: SMTP via Swift Mailer
    // ============================================
    elseif (MAIL_METHOD === 'smtp') {
        require_once 'vendor/autoload.php';

        // Create SMTP transport
        $transport = (new \Swift_SmtpTransport(SMTP_HOST, SMTP_PORT, SMTP_ENCRYPTION))
            ->setUsername(SMTP_USER)
            ->setPassword(SMTP_PASSWORD);

        // Create mailer
        $mailer = new \Swift_Mailer($transport);

        // Create message
        $message = (new \Swift_Message($subject))
            ->setFrom([$from])
            ->setTo($to)
            ->setBody($html, 'text/html');

        if ($cc) {
            $message->setCc($cc);
        }
        if ($bcc) {
            $message->setBcc($bcc);
        }

        // Send
        $result = $mailer->send($message) > 0;
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
            'message' => 'Failed to send email'
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
