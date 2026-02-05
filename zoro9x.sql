-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 05, 2026 at 12:17 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `zoro9x`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullName` varchar(255) NOT NULL,
  `role` enum('super_admin','admin') DEFAULT 'admin',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`permissions`)),
  `status` enum('active','inactive','suspended') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `email`, `password`, `fullName`, `role`, `created_at`, `updated_at`, `permissions`, `status`) VALUES
(1, 'zoro9x.tm@gmail.com', '$2a$10$bUQDpH3aVX0AM2tryNULwOTh4jUO/Ju33nWenloHvraEMfysVP6Qm', 'ZORO9X Admin', 'super_admin', '2025-12-23 18:34:13', '2025-12-23 18:34:13', NULL, 'active');

-- --------------------------------------------------------

--
-- Table structure for table `api_usage_logs`
--

CREATE TABLE `api_usage_logs` (
  `id` int(11) NOT NULL,
  `subscription_id` int(11) NOT NULL,
  `api_key` varchar(255) NOT NULL,
  `endpoint` varchar(255) DEFAULT NULL,
  `method` varchar(10) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `request_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `response_status` int(11) DEFAULT NULL,
  `device_fingerprint` varchar(255) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `client_name` varchar(255) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `tax_id` varchar(100) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `contact_person` varchar(255) DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT 'Net 30',
  `notes` text DEFAULT NULL,
  `status` enum('active','inactive','archived') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `client_name`, `company_name`, `email`, `phone`, `address`, `country`, `tax_id`, `website`, `contact_person`, `payment_terms`, `notes`, `status`, `created_at`, `updated_at`, `created_by`) VALUES
(1, 'Pamith Pasandul', NULL, 'pamithpasandul@gmail.com', '0713677499', 'No. 1/133, Kalaotuwawa Rd', 'Sri Lanka', NULL, NULL, 'Pamith Pasandul', 'Net 30', NULL, 'active', '2026-01-09 12:44:12', '2026-01-09 12:44:26', 1);

-- --------------------------------------------------------

--
-- Table structure for table `client_subscriptions`
--

CREATE TABLE `client_subscriptions` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `system_id` int(11) NOT NULL,
  `plan_id` int(11) NOT NULL,
  `database_name` varchar(100) NOT NULL,
  `subdomain` varchar(100) DEFAULT NULL,
  `api_key` varchar(255) NOT NULL,
  `remote_database_name` varchar(100) DEFAULT NULL,
  `status` enum('active','trial','expired','cancelled') DEFAULT 'trial',
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `auto_renew` tinyint(1) DEFAULT 1,
  `last_payment_date` timestamp NULL DEFAULT NULL,
  `next_billing_date` date DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `device_count` int(11) DEFAULT 0,
  `max_devices` int(11) DEFAULT 3,
  `activation_count` int(11) DEFAULT 0,
  `max_activations` int(11) DEFAULT 3,
  `is_activated` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `device_activations`
--

CREATE TABLE `device_activations` (
  `id` int(11) NOT NULL,
  `subscription_id` int(11) NOT NULL,
  `device_fingerprint` varchar(255) NOT NULL,
  `device_name` varchar(255) DEFAULT NULL,
  `device_info` text DEFAULT NULL,
  `status` enum('pending','active','rejected','revoked') DEFAULT 'pending',
  `first_activated` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_seen` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `ip_address` varchar(45) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

CREATE TABLE `invoices` (
  `id` int(11) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `client_id` int(11) NOT NULL,
  `invoice_date` date NOT NULL,
  `due_date` date DEFAULT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items`)),
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `tax` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `paid_amount` decimal(10,2) DEFAULT 0.00,
  `payment_method` text DEFAULT NULL,
  `terms_conditions` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('draft','sent','paid','partial','overdue','cancelled') DEFAULT 'draft',
  `quotation_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `invoices`
--

INSERT INTO `invoices` (`id`, `invoice_number`, `client_id`, `invoice_date`, `due_date`, `items`, `subtotal`, `discount`, `tax`, `total_amount`, `paid_amount`, `payment_method`, `terms_conditions`, `notes`, `status`, `quotation_id`, `created_at`, `updated_at`, `created_by`) VALUES
(1, 'INV-20260001', 1, '2026-01-09', NULL, '[{\"description\":\"cdsmcksd\",\"payment_method\":\"One-Time\",\"price\":0},{\"description\":\"\",\"payment_method\":\"One-Time\",\"price\":0}]', 0.00, 0.00, 0.00, 0.00, 0.00, 'Bank Transfer:\nAccount Name: ZORO9X\nBank Name: Commercial Bank\nAccount Number: 12345678901\nBranch Name: Battaramulla', '• Payment is due within 30 days from invoice date.\n• Late payments may incur additional charges.\n• All prices are in LKR.\n• Please reference invoice number when making payment.', NULL, 'sent', NULL, '2026-01-09 12:51:01', '2026-01-09 12:51:01', 1);

-- --------------------------------------------------------

--
-- Table structure for table `license_tokens`
--

CREATE TABLE `license_tokens` (
  `id` int(11) NOT NULL,
  `subscription_id` int(11) NOT NULL,
  `device_fingerprint` varchar(255) NOT NULL,
  `token` varchar(500) NOT NULL,
  `issued_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime NOT NULL,
  `last_used` timestamp NULL DEFAULT NULL,
  `is_revoked` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `subscription_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) DEFAULT 'USD',
  `payment_method` varchar(50) DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
  `payment_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `portfolio`
--

CREATE TABLE `portfolio` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `image` varchar(500) NOT NULL,
  `link` varchar(500) DEFAULT NULL,
  `github` varchar(500) DEFAULT NULL,
  `technologies` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`technologies`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `portfolio`
--

INSERT INTO `portfolio` (`id`, `title`, `description`, `image`, `link`, `github`, `technologies`, `created_at`, `updated_at`) VALUES
(6, 'Hotel Booking Website', 'Responsive design for a Hotel', '/uploads/portfolio/projects3.png', 'https://bolagalanatureresort.com/', NULL, '[\"React\",\"Node.js\",\"MongoDB\"]', '2025-12-23 21:38:13', '2025-12-23 21:38:13'),
(7, 'Salon Booking Website', 'Responsive Web Page for a Salon', '/uploads/portfolio/projects5.png', 'https://salonkaveesha.com/', NULL, '[\"React\",\"TypeScript\",\"Tailwind CSS\"]', '2025-12-23 21:38:13', '2025-12-23 21:38:13'),
(8, 'Business Website', 'Responsive design for a Business Company', '/uploads/portfolio/projects1.png', 'https://smarttradingasia.com/', NULL, '[\"Next.js\",\"React\",\"CSS\"]', '2025-12-23 21:38:13', '2025-12-23 21:38:13'),
(9, 'Business Website', 'Clean design for a Business Company', '/uploads/portfolio/projects2.png', 'https://silvaaccessorieslanka.com/', NULL, '[\"HTML\",\"CSS\",\"JavaScript\"]', '2025-12-23 21:38:13', '2025-12-23 21:38:13'),
(10, 'Wedding Planning Platform', 'A Website for wedding planning and management', '/uploads/portfolio/projects4.png', 'https://royalweddings.lk/', NULL, '[\"React\",\"Express\",\"MySQL\"]', '2025-12-23 21:38:13', '2025-12-23 21:38:13'),
(11, 'testtt', 'vsh h sh ', '/uploads/portfolio/577d9eb324dabe020378c9135166f61d-1766525999361-120448949.jpg', 'https://www.youtube.com/', NULL, '[\"3\",\"3\"]', '2025-12-23 21:39:59', '2025-12-23 21:39:59');

-- --------------------------------------------------------

--
-- Table structure for table `quotations`
--

CREATE TABLE `quotations` (
  `id` int(11) NOT NULL,
  `quotation_number` varchar(50) NOT NULL,
  `client_id` int(11) NOT NULL,
  `quotation_date` date NOT NULL,
  `valid_until` date DEFAULT NULL,
  `items` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`items`)),
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` text DEFAULT NULL,
  `terms_conditions` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('draft','sent','accepted','rejected','expired') DEFAULT 'draft',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `quotations`
--

INSERT INTO `quotations` (`id`, `quotation_number`, `client_id`, `quotation_date`, `valid_until`, `items`, `subtotal`, `discount`, `total_amount`, `payment_method`, `terms_conditions`, `notes`, `status`, `created_at`, `updated_at`, `created_by`) VALUES
(1, 'QT-20260001', 1, '2026-01-09', '2026-02-09', '[{\"description\":\"web dev\",\"payment_method\":\"One-Time\",\"price\":5000}]', 5000.00, 100.00, 4900.00, 'Bank Transfer:\nAccount Name: ZORO9X\nBank Name: Commercial Bank\nAccount Number: 12345678901\nBranch Name: Battaramulla', '• From this date, domains and hosting charges will be paid every year. A 95% advance required to start the project. Remaining balance upon completion.\n• Issues related to domains and hosting beyond the initial scope may be charged.\n• Negligence features or revisions beyond the initial scope may incur charges.\n• If the project is sold to any third party members.', NULL, 'sent', '2026-01-09 12:46:36', '2026-01-09 16:35:32', 1),
(2, 'QT-20260002', 1, '2026-01-09', NULL, '[{\"description\":\"mmkm\",\"payment_method\":\"One-Time\",\"price\":11}]', 11.00, 0.00, 11.00, 'Bank Transfer:\nAccount Name: ZORO9X\nBank Name: Commercial Bank\nAccount Number: 12345678901\nBranch Name: Battaramulla', '• From this date, domains and hosting charges will be paid every year. A 95% advance required to start the project. Remaining balance upon completion.\n• Issues related to domains and hosting beyond the initial scope may be charged.\n• Negligence features or revisions beyond the initial scope may incur charges.\n• If the project is sold to any third party members.', NULL, 'sent', '2026-01-09 16:32:05', '2026-01-09 16:35:32', 1),
(3, 'QT-20260003', 1, '2026-01-09', NULL, '[{\"description\":\"jko\",\"payment_method\":\"One-Time\",\"price\":0}]', 0.00, 0.00, 0.00, 'Bank Transfer:\nAccount Name: ZORO9X\nBank Name: Commercial Bank\nAccount Number: 12345678901\nBranch Name: Battaramulla', '• From this date, domains and hosting charges will be paid every year. A 95% advance required to start the project. Remaining balance upon completion.\n• Issues related to domains and hosting beyond the initial scope may be charged.\n• Negligence features or revisions beyond the initial scope may incur charges.\n• If the project is sold to any third party members.', NULL, 'sent', '2026-01-09 16:36:13', '2026-01-09 17:12:08', 1),
(4, '20260001', 1, '2026-01-09', NULL, '[{\"description\":\"km\",\"payment_method\":\"One-Time\",\"price\":0}]', 0.00, 0.00, 0.00, 'Bank Transfer:\nAccount Name: ZORO9X\nBank Name: Commercial Bank\nAccount Number: 12345678901\nBranch Name: Battaramulla', '• From this date, domains and hosting charges will be paid every year. A 95% advance required to start the project. Remaining balance upon completion.\n• Issues related to domains and hosting beyond the initial scope may be charged.\n• Negligence features or revisions beyond the initial scope may incur charges.\n• If the project is sold to any third party members.', NULL, 'sent', '2026-01-09 17:13:14', '2026-01-09 17:13:14', 1),
(5, 'QT-20260004', 1, '2026-01-10', NULL, '[{\"description\":\"nknk\",\"payment_method\":\"One-Time\",\"price\":0}]', 0.00, 0.00, 0.00, 'Bank Transfer:\nAccount Name: ZORO9X\nBank Name: Commercial Bank\nAccount Number: 12345678901\nBranch Name: Battaramulla', '• From this date, domains and hosting charges will be paid every year. A 95% advance required to start the project. Remaining balance upon completion.\n• Issues related to domains and hosting beyond the initial scope may be charged.\n• Negligence features or revisions beyond the initial scope may incur charges.\n• If the project is sold to any third party members.', NULL, 'sent', '2026-01-10 11:04:44', '2026-01-10 11:04:44', 1);

-- --------------------------------------------------------

--
-- Table structure for table `security_alerts`
--

CREATE TABLE `security_alerts` (
  `id` int(11) NOT NULL,
  `subscription_id` int(11) NOT NULL,
  `alert_type` enum('concurrent_use','device_limit_exceeded','suspicious_location','rapid_activations') NOT NULL,
  `severity` enum('low','medium','high','critical') DEFAULT 'medium',
  `status` enum('pending','reviewed','resolved','ignored') DEFAULT 'pending',
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `device_fingerprint` varchar(255) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  `action_taken` enum('none','blocked','warning_sent','subscription_suspended') DEFAULT 'none'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subscription_plans`
--

CREATE TABLE `subscription_plans` (
  `id` int(11) NOT NULL,
  `system_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `billing_cycle` enum('monthly','quarterly','yearly') NOT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `max_users` int(11) DEFAULT 10,
  `max_storage_gb` int(11) DEFAULT 5,
  `support_level` enum('basic','standard','premium') DEFAULT 'basic',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subscription_plans`
--

INSERT INTO `subscription_plans` (`id`, `system_id`, `name`, `description`, `price`, `billing_cycle`, `features`, `max_users`, `max_storage_gb`, `support_level`, `is_active`, `created_at`, `updated_at`) VALUES
(8, 1, 'basic', 'test', 100.00, 'monthly', '\"[]\"', 2, NULL, '', 1, '2025-12-25 13:39:03', '2025-12-25 13:39:03'),
(19, 9, 'Basic', 'Restaurant Management System Basic Edition with essential features', 29.99, 'monthly', '[\"Dashboard\",\"test feature 1\",\"f2\"]', 5, 5, '', 1, '2025-12-26 12:13:57', '2025-12-26 12:13:57'),
(20, 9, 'Premium', 'Restaurant Management System Premium Edition with all features', 79.99, 'monthly', '[\"Dashboard\",\"Advanced Analytics\",\"Custom Reports\",\"f3\"]', 50, 50, '', 1, '2025-12-26 12:13:57', '2025-12-26 12:13:57');

-- --------------------------------------------------------

--
-- Table structure for table `systems`
--

CREATE TABLE `systems` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `version` varchar(50) DEFAULT '1.0.0',
  `python_file_path` varchar(500) DEFAULT NULL,
  `icon_url` varchar(500) DEFAULT NULL,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`features`)),
  `status` enum('active','inactive','maintenance') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `systems`
--

INSERT INTO `systems` (`id`, `name`, `description`, `category`, `version`, `python_file_path`, `icon_url`, `features`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Gym Management System', 'Complete gym management solution with member tracking, payment processing, workout plans, and attendance monitoring.', 'Fitness', '1.0.0', 'gym_management/', '/images/systems/gym-icon.png', '\"[\\\"Member Management\\\",\\\"Payment & Billing\\\",\\\"Attendance Trackings\\\",\\\"Workout Plans\\\",\\\"Staff Management\\\",\\\"Equipment Tracking\\\",\\\"Reports & Analytics\\\"]\"', 'active', '2025-12-23 21:42:40', '2025-12-25 22:18:23'),
(9, 'Restaurant Management System', 'Description Restaurant Management', 'restaurant_management', '1.0.0', 'restaurant_management_management/', '/images/default-icon.png', '[\"Dashboard\",\"test feature 1\",\"f2\"]', 'active', '2025-12-26 12:13:57', '2025-12-26 12:13:57');

-- --------------------------------------------------------

--
-- Table structure for table `system_notifications`
--

CREATE TABLE `system_notifications` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `subscription_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','error','success') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullName` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `is_verified` tinyint(1) DEFAULT 0,
  `verification_code` varchar(6) DEFAULT NULL,
  `verification_code_expires` timestamp NULL DEFAULT NULL,
  `reset_password_code` varchar(6) DEFAULT NULL,
  `reset_password_expires` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password`, `fullName`, `phone`, `created_at`, `updated_at`, `is_verified`, `verification_code`, `verification_code_expires`, `reset_password_code`, `reset_password_expires`) VALUES
(2, 'sithumweerasinghe3043@gmail.com', '$2a$10$TEs2h4A2UAdSJT5g3jnOLORXHE6/IgSF.fW70k8w/2mSXeC86MoEW', 'sithum weerasinghe', '0711098188', '2025-12-23 18:16:20', '2025-12-23 20:17:48', 1, NULL, NULL, '334906', '2025-12-23 20:32:48'),
(3, 'sithumweerasinghe01@gmail.com', '$2a$10$xCbSqk8.ALX.pVWJM4CSB.yGv/Fy3V67hwiPitY3h8BK1LEd0PLqK', 'sithm weerasinghe', NULL, '2025-12-23 19:44:48', '2025-12-23 19:45:21', 1, NULL, NULL, NULL, NULL),
(5, 'wsithum23@gmail.com', '$2a$10$Gz/SS3YWl0TWmZwzpFeTI.Bo.3UHy5KQ419Rk8q.adcCGmFaamEC.', 'sithum weerasinghe', '0711234567', '2025-12-23 19:51:34', '2025-12-23 19:52:39', 1, NULL, NULL, '377402', '2025-12-23 20:07:39'),
(7, 'sithumandcrew@gmail.com', '$2a$10$DE.IqWGSzL8DLV6Ue7/tquTuHqeeqVdUrsp2tLl0tCgSkiBuV1cc6', 'Sithum Weerasinghe', NULL, '2025-12-23 20:58:03', '2025-12-23 20:58:03', 1, NULL, NULL, NULL, NULL),
(8, 'zoro9x.tm@gmail.com', '$2a$10$WqLuCnNqyYkD4cNyIeWUCegv.MSlzuB0XyrX84xAuVd3SbXaHVKm2', 'Pamith Pasandul', '0713677499', '2025-12-23 21:56:17', '2025-12-23 21:56:48', 1, NULL, NULL, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `api_usage_logs`
--
ALTER TABLE `api_usage_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subscription_id` (`subscription_id`),
  ADD KEY `idx_api_key` (`api_key`),
  ADD KEY `idx_request_timestamp` (`request_timestamp`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `client_subscriptions`
--
ALTER TABLE `client_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `database_name` (`database_name`),
  ADD UNIQUE KEY `api_key` (`api_key`),
  ADD UNIQUE KEY `subdomain` (`subdomain`),
  ADD KEY `plan_id` (`plan_id`),
  ADD KEY `idx_client_id` (`client_id`),
  ADD KEY `idx_system_id` (`system_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_api_key` (`api_key`);

--
-- Indexes for table `device_activations`
--
ALTER TABLE `device_activations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_device_sub` (`subscription_id`,`device_fingerprint`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `idx_subscription_id` (`subscription_id`),
  ADD KEY `idx_device_fingerprint` (`device_fingerprint`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `invoice_number` (`invoice_number`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `quotation_id` (`quotation_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `license_tokens`
--
ALTER TABLE `license_tokens`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subscription_id` (`subscription_id`),
  ADD KEY `idx_device_fingerprint` (`device_fingerprint`),
  ADD KEY `idx_token` (`token`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `transaction_id` (`transaction_id`),
  ADD KEY `idx_client_id` (`client_id`),
  ADD KEY `idx_subscription_id` (`subscription_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_payment_date` (`payment_date`);

--
-- Indexes for table `portfolio`
--
ALTER TABLE `portfolio`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `quotations`
--
ALTER TABLE `quotations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `quotation_number` (`quotation_number`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `created_by` (`created_by`);

--
-- Indexes for table `security_alerts`
--
ALTER TABLE `security_alerts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `idx_subscription_id` (`subscription_id`),
  ADD KEY `idx_alert_type` (`alert_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_severity` (`severity`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_system_id` (`system_id`),
  ADD KEY `idx_is_active` (`is_active`);

--
-- Indexes for table `systems`
--
ALTER TABLE `systems`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `system_notifications`
--
ALTER TABLE `system_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subscription_id` (`subscription_id`),
  ADD KEY `idx_client_id` (`client_id`),
  ADD KEY `idx_is_read` (`is_read`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `api_usage_logs`
--
ALTER TABLE `api_usage_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `client_subscriptions`
--
ALTER TABLE `client_subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `device_activations`
--
ALTER TABLE `device_activations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `license_tokens`
--
ALTER TABLE `license_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `portfolio`
--
ALTER TABLE `portfolio`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `quotations`
--
ALTER TABLE `quotations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `security_alerts`
--
ALTER TABLE `security_alerts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `systems`
--
ALTER TABLE `systems`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `system_notifications`
--
ALTER TABLE `system_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `api_usage_logs`
--
ALTER TABLE `api_usage_logs`
  ADD CONSTRAINT `api_usage_logs_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `client_subscriptions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `clients`
--
ALTER TABLE `clients`
  ADD CONSTRAINT `clients_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `client_subscriptions`
--
ALTER TABLE `client_subscriptions`
  ADD CONSTRAINT `client_subscriptions_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `client_subscriptions_ibfk_2` FOREIGN KEY (`system_id`) REFERENCES `systems` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `client_subscriptions_ibfk_3` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `device_activations`
--
ALTER TABLE `device_activations`
  ADD CONSTRAINT `device_activations_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `client_subscriptions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `device_activations_ibfk_2` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `invoices_ibfk_2` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `invoices_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `license_tokens`
--
ALTER TABLE `license_tokens`
  ADD CONSTRAINT `license_tokens_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `client_subscriptions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`subscription_id`) REFERENCES `client_subscriptions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quotations`
--
ALTER TABLE `quotations`
  ADD CONSTRAINT `quotations_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `quotations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `security_alerts`
--
ALTER TABLE `security_alerts`
  ADD CONSTRAINT `security_alerts_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `client_subscriptions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `security_alerts_ibfk_2` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `subscription_plans`
--
ALTER TABLE `subscription_plans`
  ADD CONSTRAINT `subscription_plans_ibfk_1` FOREIGN KEY (`system_id`) REFERENCES `systems` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `system_notifications`
--
ALTER TABLE `system_notifications`
  ADD CONSTRAINT `system_notifications_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `system_notifications_ibfk_2` FOREIGN KEY (`subscription_id`) REFERENCES `client_subscriptions` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
