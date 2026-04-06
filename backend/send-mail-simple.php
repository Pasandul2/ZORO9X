<?php
/**
 * Simple Mail Gateway - Backup version
 * Uses direct Gmail SMTP with reliable implementation
 */

define('API_KEY', 'zoro9x-mail-gateway-2024');
define('REQUIRE_API_KEY', false); // Disable for testing

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/php-mail.log');

if (!is_dir(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0755, true);
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

error_log("=== Request received: " . date('Y-m-d H:i:s') . " ===");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    exit(json_encode(['status' => 'ok', 'message' => 'Gateway running']));
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(json_encode(['status' => 'ok']));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['success' => false, 'message' => 'Method not allowed']));
}

// Check API key
if (REQUIRE_API_KEY) {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if ($key !== API_KEY) {
        http_response_code(401);
        exit(json_encode(['success' => false, 'message' => 'Unauthorized']));
    }
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['to']) || !isset($data['subject']) || !isset($data['html'])) {
    http_response_code(400);
    exit(json_encode(['success' => false, 'message' => 'Missing fields']));
}

// Try PHPMailer if available
$result = false;
$error = '';

try {
    // Check if PHPMailer is available
    if (file_exists(__DIR__ . '/vendor/autoload.php')) {
        error_log("📧 Using PHPMailer...");
        require __DIR__ . '/vendor/autoload.php';
        
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = 'zoro9x.tm@gmail.com';
        $mail->Password = 'jzsf uuqj jrec vmcz';
        $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->From = $data['from'] ?? 'zoro9x.tm@gmail.com';
        $mail->addAddress($data['to']);
        $mail->isHTML(true);
        $mail->Subject = $data['subject'];
        $mail->Body = $data['html'];
        
        if ($mail->send()) {
            $result = true;
            error_log("✅ Email sent via PHPMailer to: " . $data['to']);
        } else {
            $error = $mail->ErrorInfo;
            error_log("❌ PHPMailer error: " . $error);
        }
    } else {
        // Fallback to mail()
        error_log("📧 Using PHP mail()...");
        $headers = "From: " . ($data['from'] ?? 'zoro9x.tm@gmail.com') . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        
        $result = mail($data['to'], $data['subject'], $data['html'], $headers);
        
        if ($result) {
            error_log("✅ Email sent via mail() to: " . $data['to']);
        } else {
            error_log("❌ mail() failed");
            $error = 'mail() function failed';
        }
    }
} catch (Exception $e) {
    $error = $e->getMessage();
    error_log("❌ Exception: " . $error);
}

// Response
if ($result) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Email sent',
        'recipient' => $data['to']
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to send email',
        'error' => $error
    ]);
}
?>
