-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 06, 2026 at 03:02 PM
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
(1, 'zoro9x.tm@gmail.com', '$2a$10$bUQDpH3aVX0AM2tryNULwOTh4jUO/Ju33nWenloHvraEMfysVP6Qm', 'ZORO9X Admin', 'super_admin', '2025-12-23 18:34:13', '2025-12-23 18:34:13', NULL, 'active'),
(2, 'pamithpasandul@gmail.com', '$2a$10$UbZteub07hkdJZbP0qqKQ.122JtR2su/0XLVk9hrgvrGDjHysH6NO', 'pamith', 'admin', '2026-04-06 07:50:40', '2026-04-06 07:50:40', NULL, 'active');

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

--
-- Dumping data for table `api_usage_logs`
--

INSERT INTO `api_usage_logs` (`id`, `subscription_id`, `api_key`, `endpoint`, `method`, `ip_address`, `user_agent`, `request_timestamp`, `response_status`, `device_fingerprint`, `location`) VALUES
(55, 25, 'b8db6d1e6ae7209dffe0b46751cc734b816ffa997bca694da8d8fe879cec7fa6', '/download', 'GET', '::1', NULL, '2026-03-16 09:28:50', NULL, NULL, NULL),
(56, 25, 'b8db6d1e6ae7209dffe0b46751cc734b816ffa997bca694da8d8fe879cec7fa6', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-03-16 09:29:26', NULL, NULL, NULL),
(57, 25, 'b8db6d1e6ae7209dffe0b46751cc734b816ffa997bca694da8d8fe879cec7fa6', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-03-16 09:29:36', NULL, NULL, NULL),
(58, 25, 'b8db6d1e6ae7209dffe0b46751cc734b816ffa997bca694da8d8fe879cec7fa6', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-03-16 09:52:38', NULL, NULL, NULL),
(59, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/download', 'GET', '::1', NULL, '2026-03-21 19:31:24', NULL, NULL, NULL),
(60, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-03-21 19:43:29', NULL, NULL, NULL),
(61, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-03-21 19:43:35', NULL, NULL, NULL),
(62, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/download', 'GET', '::1', NULL, '2026-04-06 06:43:14', NULL, NULL, NULL),
(63, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 06:43:38', NULL, NULL, NULL),
(64, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 06:43:44', NULL, NULL, NULL),
(65, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 10:06:30', NULL, NULL, NULL),
(66, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 10:06:34', NULL, NULL, NULL),
(67, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/download', 'GET', '::1', NULL, '2026-04-06 10:09:35', NULL, NULL, NULL),
(68, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 10:10:02', NULL, NULL, NULL),
(69, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 10:10:17', NULL, NULL, NULL),
(70, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/download', 'GET', '::1', NULL, '2026-04-06 10:28:24', NULL, NULL, NULL),
(71, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 10:28:57', NULL, NULL, NULL),
(72, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 10:29:01', NULL, NULL, NULL),
(73, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::ffff:127.0.0.1', 'python-requests/2.32.5', '2026-04-06 10:29:24', NULL, '512b297b4ed5192c18c19de88b9242a9', NULL),
(74, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/download', 'GET', '::1', NULL, '2026-04-06 10:40:48', NULL, NULL, NULL),
(75, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 10:41:10', NULL, NULL, NULL),
(76, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 10:41:13', NULL, NULL, NULL),
(77, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::ffff:127.0.0.1', 'python-requests/2.32.5', '2026-04-06 10:41:40', NULL, '512b297b4ed5192c18c19de88b9242a9', NULL),
(78, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/download', 'GET', '::1', NULL, '2026-04-06 10:54:36', NULL, NULL, NULL),
(79, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 10:55:05', NULL, NULL, NULL),
(80, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::1', 'Python-urllib/3.13', '2026-04-06 10:55:07', NULL, NULL, NULL),
(81, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::ffff:127.0.0.1', 'python-requests/2.32.5', '2026-04-06 10:55:23', NULL, '512b297b4ed5192c18c19de88b9242a9', NULL),
(82, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::ffff:127.0.0.1', 'python-requests/2.32.5', '2026-04-06 10:57:37', NULL, '512b297b4ed5192c18c19de88b9242a9', NULL),
(83, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::ffff:127.0.0.1', 'python-requests/2.32.5', '2026-04-06 11:08:22', NULL, '512b297b4ed5192c18c19de88b9242a9', NULL),
(84, 26, 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', '/validate-key', 'POST', '::ffff:127.0.0.1', 'python-requests/2.32.5', '2026-04-06 11:09:05', NULL, '512b297b4ed5192c18c19de88b9242a9', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `subscription_id` int(11) DEFAULT NULL,
  `device_fingerprint` varchar(255) DEFAULT NULL,
  `event_type` enum('download','activation_approved','activation_pending','activation_rejected','revocation','token_refresh','validation_blocked','policy_violation','approval','rejection') NOT NULL,
  `actor` varchar(64) DEFAULT 'system',
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `subscription_id`, `device_fingerprint`, `event_type`, `actor`, `details`, `ip_address`, `created_at`) VALUES
(1, 9, NULL, 'download', '8', '{\"filename\":\"uuuu_basic_installer.exe\",\"system_name\":\"uuuu\",\"plan\":\"Basic\"}', '::1', '2026-03-14 17:24:38'),
(2, 9, NULL, 'download', '8', '{\"filename\":\"uuuu_basic_installer.exe\",\"system_name\":\"uuuu\",\"plan\":\"Basic\",\"customized\":true,\"business_name\":\"uv\"}', '::1', '2026-03-14 17:25:13'),
(3, 9, '512b297b4ed5192c18c19de88b9242a9', 'activation_approved', 'system', '{\"message\":\"First device auto-approved\",\"device_info\":{\"device_name\":\"DESKTOP-DJGCR2D\",\"os\":\"Windows 10\",\"machine\":\"AMD64\",\"mac_address\":\"f8:a2:d6:59:6d:aa\"},\"company\":\"Pamith Gold\"}', '::1', '2026-03-14 17:26:27'),
(4, 13, NULL, 'download', '8', '{\"filename\":\"ft_basic_installer_package.zip\",\"system_name\":\"ft\",\"plan\":\"Basic\",\"includes_business_info\":true}', '::1', '2026-03-14 21:26:45'),
(5, 13, NULL, '', '8', '{\"message\":\"Client requested business information update approval.\"}', '::1', '2026-03-14 21:32:10'),
(6, 13, NULL, 'download', '8', '{\"filename\":\"ft_basic_installer_package.zip\",\"system_name\":\"ft\",\"plan\":\"Basic\",\"includes_business_info\":true}', '::1', '2026-03-14 21:39:49'),
(7, 13, NULL, 'download', '8', '{\"filename\":\"ft_basic_installer.exe\",\"system_name\":\"ft\",\"plan\":\"Basic\",\"includes_business_info\":true,\"delivery\":\"exe\"}', '::1', '2026-03-14 21:47:50'),
(8, 14, NULL, '', '8', '{\"message\":\"Client requested business information update approval.\"}', '::1', '2026-03-15 16:52:06'),
(9, 14, NULL, 'download', '8', '{\"filename\":\"Gold_Pawning_System_basic_installer.exe\",\"system_name\":\"Gold Pawning System\",\"plan\":\"Basic\",\"includes_business_info\":true,\"delivery\":\"exe\"}', '::1', '2026-03-15 17:04:02'),
(10, 14, NULL, 'download', '8', '{\"filename\":\"Gold_Pawning_System_basic_installer.exe\",\"system_name\":\"Gold Pawning System\",\"plan\":\"Basic\",\"includes_business_info\":true,\"delivery\":\"exe\"}', '::1', '2026-03-15 17:17:21'),
(11, 14, '512b297b4ed5192c18c19de88b9242a9', 'activation_approved', 'system', '{\"message\":\"First device auto-approved\",\"device_info\":{\"device_name\":\"DESKTOP-DJGCR2D\",\"os\":\"Windows 10\",\"machine\":\"AMD64\",\"mac_address\":\"f8:a2:d6:59:6d:aa\"},\"company\":\"Pamith Gold Loan\"}', '::1', '2026-03-15 17:19:00'),
(12, 14, '512b297b4ed5192c18c19de88b9242a9', 'token_refresh', 'system', '{\"endpoint\":\"/validate-key\"}', '::1', '2026-03-15 17:21:31'),
(13, 14, '512b297b4ed5192c18c19de88b9242a9', 'token_refresh', 'system', '{\"endpoint\":\"/validate-key\"}', '::1', '2026-03-15 17:22:16'),
(14, 15, NULL, 'download', '8', '{\"filename\":\"test_basic_installer.exe\",\"system_name\":\"test\",\"plan\":\"Basic\",\"includes_business_info\":true,\"delivery\":\"exe\"}', '::1', '2026-03-15 17:59:55'),
(15, 15, NULL, 'download', '8', '{\"filename\":\"test_basic_installer.exe\",\"system_name\":\"test\",\"plan\":\"Basic\",\"includes_business_info\":true,\"delivery\":\"exe\"}', '::1', '2026-03-15 18:01:47'),
(16, 16, NULL, 'download', '8', '{\"filename\":\"abc_basic_installer.exe\",\"system_name\":\"abc\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-15 18:10:06'),
(17, 17, NULL, 'download', '8', '{\"filename\":\"aaa_basic_installer.exe\",\"system_name\":\"aaa\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-15 18:23:36'),
(18, 18, NULL, 'download', '8', '{\"filename\":\"zzz_basic_installer.exe\",\"system_name\":\"zzz\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-15 18:39:27'),
(19, 18, NULL, 'download', '8', '{\"filename\":\"zzz_basic_installer.exe\",\"system_name\":\"zzz\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-15 18:53:23'),
(20, 19, NULL, 'download', '8', '{\"filename\":\"sss_basic_installer.exe\",\"system_name\":\"sss\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-15 18:59:09'),
(21, 20, NULL, 'download', '8', '{\"filename\":\"fff_basic_installer.exe\",\"system_name\":\"fff\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-15 19:21:31'),
(22, 20, '512b297b4ed5192c18c19de88b9242a9', 'activation_approved', 'system', '{\"message\":\"First device auto-approved\",\"device_info\":{\"device_name\":\"DESKTOP-DJGCR2D\",\"os\":\"Windows 10\",\"machine\":\"AMD64\",\"mac_address\":\"f8:a2:d6:59:6d:aa\"},\"company\":\"fff\"}', '::1', '2026-03-15 19:22:47'),
(23, 20, NULL, 'download', '8', '{\"filename\":\"fff_basic_installer.exe\",\"system_name\":\"fff\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-15 19:41:19'),
(24, 20, '512b297b4ed5192c18c19de88b9242a9', 'token_refresh', 'system', '{\"endpoint\":\"/validate-key\"}', '::1', '2026-03-15 19:42:30'),
(25, 21, NULL, 'download', '8', '{\"filename\":\"Gold_Loan_System_basic_installer.exe\",\"system_name\":\"Gold Loan System\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-16 06:47:44'),
(26, 21, NULL, 'download', '8', '{\"filename\":\"Gold_Loan_System_basic_installer.exe\",\"system_name\":\"Gold Loan System\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-16 07:30:35'),
(27, 22, NULL, 'download', '8', '{\"filename\":\"kk_basic_installer.exe\",\"system_name\":\"kk\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-16 07:36:05'),
(28, 23, NULL, 'download', '8', '{\"filename\":\"zz_basic_installer.exe\",\"system_name\":\"zz\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-16 07:57:43'),
(29, 24, NULL, 'download', '8', '{\"filename\":\"tttt_basic_installer.exe\",\"system_name\":\"tttt\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-16 09:18:52'),
(30, 24, '512b297b4ed5192c18c19de88b9242a9', 'activation_approved', 'system', '{\"message\":\"First device auto-approved\",\"device_info\":{\"device_name\":\"DESKTOP-DJGCR2D\",\"os\":\"Windows 10\",\"machine\":\"AMD64\",\"mac_address\":\"f8:a2:d6:59:6d:aa\"},\"company\":\"ttt\"}', '::1', '2026-03-16 09:21:00'),
(31, 25, NULL, 'download', '8', '{\"filename\":\"Gold_Loan_System_basic_installer.exe\",\"system_name\":\"Gold Loan System\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-16 09:28:50'),
(32, 25, '512b297b4ed5192c18c19de88b9242a9', 'activation_approved', 'system', '{\"message\":\"First device auto-approved\",\"device_info\":{\"device_name\":\"DESKTOP-DJGCR2D\",\"os\":\"Windows 10\",\"machine\":\"AMD64\",\"mac_address\":\"f8:a2:d6:59:6d:aa\"},\"company\":\"Pamith Gold\"}', '::1', '2026-03-16 09:29:41'),
(33, 26, NULL, 'download', '8', '{\"filename\":\"Gold_Loan_System_basic_installer.exe\",\"system_name\":\"Gold Loan System\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-03-21 19:31:24'),
(34, 26, '512b297b4ed5192c18c19de88b9242a9', 'activation_approved', 'system', '{\"message\":\"First device auto-approved\",\"device_info\":{\"device_name\":\"DESKTOP-DJGCR2D\",\"os\":\"Windows 10\",\"machine\":\"AMD64\",\"mac_address\":\"f8:a2:d6:59:6d:aa\"},\"company\":\"www\"}', '::1', '2026-03-21 19:43:43'),
(35, 26, NULL, 'download', '8', '{\"filename\":\"Gold_Loan_System_basic_installer.exe\",\"system_name\":\"Gold Loan System\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-04-06 06:43:14'),
(36, 26, NULL, 'download', '8', '{\"filename\":\"Gold_Loan_System_basic_installer.exe\",\"system_name\":\"Gold Loan System\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-04-06 10:09:35'),
(37, 26, NULL, 'download', '8', '{\"filename\":\"Gold_Loan_System_basic_installer.exe\",\"system_name\":\"Gold Loan System\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-04-06 10:28:24'),
(38, 26, '512b297b4ed5192c18c19de88b9242a9', 'token_refresh', 'system', '{\"endpoint\":\"/validate-key\"}', '::ffff:127.0.0.1', '2026-04-06 10:29:24'),
(39, 26, NULL, 'download', '8', '{\"filename\":\"Gold_Loan_System_basic_installer.exe\",\"system_name\":\"Gold Loan System\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-04-06 10:40:48'),
(40, 26, '512b297b4ed5192c18c19de88b9242a9', 'token_refresh', 'system', '{\"endpoint\":\"/validate-key\"}', '::ffff:127.0.0.1', '2026-04-06 10:41:40'),
(41, 26, NULL, 'download', '8', '{\"filename\":\"Gold_Loan_System_basic_installer.exe\",\"system_name\":\"Gold Loan System\",\"plan\":\"Basic\",\"includes_business_info\":false,\"delivery\":\"exe\",\"config_mode\":\"api_key_online_fetch\"}', '::1', '2026-04-06 10:54:36'),
(42, 26, '512b297b4ed5192c18c19de88b9242a9', 'token_refresh', 'system', '{\"endpoint\":\"/validate-key\"}', '::ffff:127.0.0.1', '2026-04-06 10:55:23'),
(43, 26, '512b297b4ed5192c18c19de88b9242a9', 'token_refresh', 'system', '{\"endpoint\":\"/validate-key\"}', '::ffff:127.0.0.1', '2026-04-06 10:57:37'),
(44, 26, '512b297b4ed5192c18c19de88b9242a9', 'token_refresh', 'system', '{\"endpoint\":\"/validate-key\"}', '::ffff:127.0.0.1', '2026-04-06 11:08:22'),
(45, 26, '512b297b4ed5192c18c19de88b9242a9', 'token_refresh', 'system', '{\"endpoint\":\"/validate-key\"}', '::ffff:127.0.0.1', '2026-04-06 11:09:05');

-- --------------------------------------------------------

--
-- Table structure for table `business_info_change_requests`
--

CREATE TABLE `business_info_change_requests` (
  `id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `subscription_id` int(11) NOT NULL,
  `requested_data` longtext NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `admin_note` text DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `client_name` varchar(255) NOT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
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
  `created_by` int(11) DEFAULT NULL,
  `logo_url` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `user_id`, `client_name`, `company_name`, `email`, `contact_email`, `phone`, `address`, `country`, `tax_id`, `website`, `contact_person`, `payment_terms`, `notes`, `status`, `created_at`, `updated_at`, `created_by`, `logo_url`) VALUES
(1, NULL, 'Pamith Pasandul', NULL, 'pamithpasandul@gmail.com', 'pamithpasandul@gmail.com', '0713677499', 'No. 1/133, Kalaotuwawa Rd', 'Sri Lanka', NULL, NULL, 'Pamith Pasandul', 'Net 30', NULL, 'active', '2026-01-09 12:44:12', '2026-03-12 04:44:56', 1, NULL),
(2, 8, 'www', 'www', 'pamithpasandul@gmail.com', 'pamithpasandul@gmail.com', '41', 'No. 1/133, Kalaotuwawa Rd', NULL, NULL, NULL, NULL, 'Net 30', NULL, 'active', '2026-03-12 04:50:54', '2026-03-21 19:29:30', NULL, '/uploads/icons/icon-1773653221288-839438316.png');

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

--
-- Dumping data for table `client_subscriptions`
--

INSERT INTO `client_subscriptions` (`id`, `client_id`, `system_id`, `plan_id`, `database_name`, `subdomain`, `api_key`, `remote_database_name`, `status`, `start_date`, `end_date`, `auto_renew`, `last_payment_date`, `next_billing_date`, `total_amount`, `device_count`, `max_devices`, `activation_count`, `max_activations`, `is_activated`, `created_at`, `updated_at`) VALUES
(25, 2, 35, 71, 'saas_pamith_gold_1773653280522', 'pamith-gold-1773653280522', 'b8db6d1e6ae7209dffe0b46751cc734b816ffa997bca694da8d8fe879cec7fa6', NULL, 'cancelled', '2026-03-16', '2026-04-16', 0, NULL, NULL, 29.99, 0, 3, 1, 3, 0, '2026-03-16 09:28:00', '2026-04-06 10:05:36'),
(26, 2, 35, 71, 'saas_www_1774121370287', 'www-1774121370287', 'd773806c2b176637570f65efe460840ea6bcbce8b4cf649e4337c7e03c9e3808', NULL, 'active', '2026-03-22', '2026-05-06', 1, '2026-04-06 07:51:36', '2026-05-06', 29.99, 0, 3, 1, 3, 0, '2026-03-21 19:29:30', '2026-04-06 07:51:36');

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
  `rejection_reason` text DEFAULT NULL,
  `app_state` enum('running','offline') DEFAULT 'offline'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `device_activations`
--

INSERT INTO `device_activations` (`id`, `subscription_id`, `device_fingerprint`, `device_name`, `device_info`, `status`, `first_activated`, `last_seen`, `ip_address`, `location`, `approved_by`, `approved_at`, `rejection_reason`, `app_state`) VALUES
(7, 25, '512b297b4ed5192c18c19de88b9242a9', 'DESKTOP-DJGCR2D', '{\"device_name\":\"DESKTOP-DJGCR2D\",\"os\":\"Windows 10\",\"machine\":\"AMD64\",\"mac_address\":\"f8:a2:d6:59:6d:aa\"}', 'active', '2026-03-16 09:29:41', '2026-03-16 09:29:41', '::1', NULL, NULL, NULL, NULL, 'offline'),
(8, 26, '512b297b4ed5192c18c19de88b9242a9', 'DESKTOP-DJGCR2D', '{\"device_name\":\"DESKTOP-DJGCR2D\",\"os\":\"Windows 10\",\"machine\":\"AMD64\",\"mac_address\":\"f8:a2:d6:59:6d:aa\"}', 'active', '2026-03-21 19:43:43', '2026-04-06 11:09:43', '::ffff:127.0.0.1', NULL, NULL, NULL, NULL, 'offline');

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

--
-- Dumping data for table `license_tokens`
--

INSERT INTO `license_tokens` (`id`, `subscription_id`, `device_fingerprint`, `token`, `issued_at`, `expires_at`, `last_used`, `is_revoked`) VALUES
(11, 25, '512b297b4ed5192c18c19de88b9242a9', 'eyJzdWJfaWQiOjI1LCJkZXZpY2UiOiI1MTJiMjk3YjRlZDUxOTJjMThjMTlkZTg4YjkyNDJhOSIsImlzc3VlZCI6MTc3MzY1MzM4MTYyOCwiZXhwaXJlcyI6MTc3NDI1ODE4MTYyOH0=.d70976f4e66eac77a2f9e0a8a09941791c30baa8d71c6723f61b0a918b340e3a', '2026-03-16 09:29:41', '2026-03-23 14:59:41', NULL, 0),
(12, 26, '512b297b4ed5192c18c19de88b9242a9', 'eyJzdWJfaWQiOjI2LCJkZXZpY2UiOiI1MTJiMjk3YjRlZDUxOTJjMThjMTlkZTg4YjkyNDJhOSIsImlzc3VlZCI6MTc3NDEyMjIyMzIzNCwiZXhwaXJlcyI6MTc3NDcyNzAyMzIzNH0=.7383f0ed9898f3ab9e194a58a65f8b0939f09c6a807f2e7dbae19fe4299b8835', '2026-03-21 19:43:43', '2026-03-29 01:13:43', NULL, 0),
(13, 26, '512b297b4ed5192c18c19de88b9242a9', 'eyJzdWJfaWQiOjI2LCJkZXZpY2UiOiI1MTJiMjk3YjRlZDUxOTJjMThjMTlkZTg4YjkyNDJhOSIsImlzc3VlZCI6MTc3NTQ3MTM2NDg0OSwiZXhwaXJlcyI6MTc3NTQ3MTY2NDg0OX0=.9a91b791dad6b30e46120d60d6a593a1b2e66f71205921f62c22e1c7862cfc36', '2026-04-06 10:29:24', '2026-04-06 16:04:24', NULL, 0),
(14, 26, '512b297b4ed5192c18c19de88b9242a9', 'eyJzdWJfaWQiOjI2LCJkZXZpY2UiOiI1MTJiMjk3YjRlZDUxOTJjMThjMTlkZTg4YjkyNDJhOSIsImlzc3VlZCI6MTc3NTQ3MjEwMDkxMCwiZXhwaXJlcyI6MTc3NTQ3MjQwMDkxMH0=.68cc04ea6b121dd43e6c4bad4287195eb0701c3e91c30dbb48ca7df5447c7f3b', '2026-04-06 10:41:40', '2026-04-06 16:16:40', NULL, 0),
(15, 26, '512b297b4ed5192c18c19de88b9242a9', 'eyJzdWJfaWQiOjI2LCJkZXZpY2UiOiI1MTJiMjk3YjRlZDUxOTJjMThjMTlkZTg4YjkyNDJhOSIsImlzc3VlZCI6MTc3NTQ3MjkyMzIwMywiZXhwaXJlcyI6MTc3NTQ3MzIyMzIwM30=.e7f2c090a6ccd9e5994e7bc6beb5bbde335e573b95d2f5ddc1eea5852122c75e', '2026-04-06 10:55:23', '2026-04-06 16:30:23', NULL, 0),
(16, 26, '512b297b4ed5192c18c19de88b9242a9', 'eyJzdWJfaWQiOjI2LCJkZXZpY2UiOiI1MTJiMjk3YjRlZDUxOTJjMThjMTlkZTg4YjkyNDJhOSIsImlzc3VlZCI6MTc3NTQ3MzA1NzEyMCwiZXhwaXJlcyI6MTc3NTQ3MzM1NzEyMH0=.3bf165edd06b3714b5cfed650ffaa3dfc24e37753082606dcc4422ed80371e4a', '2026-04-06 10:57:37', '2026-04-06 16:32:37', NULL, 0),
(17, 26, '512b297b4ed5192c18c19de88b9242a9', 'eyJzdWJfaWQiOjI2LCJkZXZpY2UiOiI1MTJiMjk3YjRlZDUxOTJjMThjMTlkZTg4YjkyNDJhOSIsImlzc3VlZCI6MTc3NTQ3MzcwMjE3NSwiZXhwaXJlcyI6MTc3NTQ3NDAwMjE3NX0=.2b47d727611426b47309fecd9a7580cc1d3cd218bbe482f5c3d31d2f76163e34', '2026-04-06 11:08:22', '2026-04-06 16:43:22', NULL, 0),
(18, 26, '512b297b4ed5192c18c19de88b9242a9', 'eyJzdWJfaWQiOjI2LCJkZXZpY2UiOiI1MTJiMjk3YjRlZDUxOTJjMThjMTlkZTg4YjkyNDJhOSIsImlzc3VlZCI6MTc3NTQ3Mzc0NTE2NSwiZXhwaXJlcyI6MTc3NTQ3NDA0NTE2NX0=.e22f2d43940053057afa0796474931edbc925d3cfa86e4877edaff19458bf281', '2026-04-06 11:09:05', '2026-04-06 16:44:05', NULL, 0);

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

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `client_id`, `subscription_id`, `amount`, `currency`, `payment_method`, `transaction_id`, `status`, `payment_date`, `notes`) VALUES
(25, 2, 25, 29.99, 'USD', NULL, 'TXN-1773653280523', 'completed', '2026-03-16 09:28:00', NULL),
(26, 2, 26, 29.99, 'USD', NULL, 'TXN-1774121370291', 'completed', '2026-03-21 19:29:30', NULL),
(27, 2, 26, 29.99, 'USD', 'bank_transfer', 'renew-26-1775458168168', 'completed', '2026-04-06 06:49:28', 'Renewal request #1 | reviewed:approve');

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
(71, 35, 'Basic', 'Gold Loan System Basic Edition with essential features', 29.99, 'monthly', '[\"Dashboard\"]', 5, 5, '', 1, '2026-03-16 09:27:01', '2026-03-16 09:27:01'),
(72, 35, 'Premium', 'Gold Loan System Premium Edition with all features', 79.99, 'monthly', '[\"Dashboard\",\"Advanced Analytics\",\"Custom Reports\"]', 50, 50, '', 1, '2026-03-16 09:27:01', '2026-03-16 09:27:01');

-- --------------------------------------------------------

--
-- Table structure for table `subscription_renewal_requests`
--

CREATE TABLE `subscription_renewal_requests` (
  `id` int(11) NOT NULL,
  `subscription_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `receipt_url` varchar(500) DEFAULT NULL,
  `transaction_reference` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `payment_id` int(11) DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `subscription_renewal_requests`
--

INSERT INTO `subscription_renewal_requests` (`id`, `subscription_id`, `client_id`, `user_id`, `amount`, `receipt_url`, `transaction_reference`, `notes`, `status`, `payment_id`, `admin_note`, `reviewed_by`, `reviewed_at`, `created_at`, `updated_at`) VALUES
(1, 26, 2, 8, 29.99, '/uploads/receipts/receipt-1775458168155-136832519.jpeg', NULL, NULL, 'approved', 27, NULL, NULL, '2026-04-06 07:51:36', '2026-04-06 06:49:28', '2026-04-06 07:51:36');

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
(35, 'Gold Loan System', 'This is a Gold Loan Management system', 'gold_loan', '1.0.0', 'gold_loan_management/', '/uploads/icons/icon-1773653221288-839438316.png', '[\"Dashboard\"]', 'active', '2026-03-16 09:27:01', '2026-03-16 09:27:01');

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

--
-- Dumping data for table `system_notifications`
--

INSERT INTO `system_notifications` (`id`, `client_id`, `subscription_id`, `title`, `message`, `type`, `is_read`, `created_at`) VALUES
(25, 2, 25, 'Welcome to Your New System!', 'Your Basic subscription has been activated successfully. Your API key and access details are ready.', 'success', 0, '2026-03-16 09:28:00'),
(26, 2, 26, 'Welcome to Your New System!', 'Your Basic subscription has been activated successfully. Your API key and access details are ready.', 'success', 0, '2026-03-21 19:29:30'),
(27, 2, 26, 'Renewal Request Submitted', 'Your bank transfer renewal request was submitted and is pending admin review.', 'info', 0, '2026-04-06 06:49:28'),
(28, 2, 26, 'Renewal Approved', 'Your renewal was approved. Coverage: 2026-04-22 to 2026-05-21. Subscription is active until 2026-05-06.', 'success', 0, '2026-04-06 07:51:36'),
(29, 2, 25, 'Subscription cancelled', 'Your subscription status was updated to cancelled by administrator.', 'warning', 0, '2026-04-06 10:04:55'),
(30, 2, 25, 'Subscription active', 'Your subscription status was updated to active by administrator.', 'success', 0, '2026-04-06 10:05:12'),
(31, 2, 25, 'Subscription Cancelled', 'Your subscription has been cancelled. You can continue using the system until the end of your billing period.', 'warning', 0, '2026-04-06 10:05:36');

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
(8, 'zoro9x.tm@gmail.com', '$2a$10$WqLuCnNqyYkD4cNyIeWUCegv.MSlzuB0XyrX84xAuVd3SbXaHVKm2', 'Pamith Pasandul', '0713677499', '2025-12-23 21:56:17', '2025-12-23 21:56:48', 1, NULL, NULL, NULL, NULL),
(9, 'pamithpasandul@gmail.com', '$2a$10$UbZteub07hkdJZbP0qqKQ.122JtR2su/0XLVk9hrgvrGDjHysH6NO', 'Pamith', NULL, '2026-04-06 07:48:26', '2026-04-06 07:48:57', 1, NULL, NULL, NULL, NULL);

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
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subscription_id` (`subscription_id`),
  ADD KEY `idx_event_type` (`event_type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_device_fingerprint` (`device_fingerprint`);

--
-- Indexes for table `business_info_change_requests`
--
ALTER TABLE `business_info_change_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `idx_business_req_client` (`client_id`),
  ADD KEY `idx_business_req_subscription` (`subscription_id`),
  ADD KEY `idx_business_req_status` (`status`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `idx_user_id` (`user_id`);

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
-- Indexes for table `subscription_renewal_requests`
--
ALTER TABLE `subscription_renewal_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `client_id` (`client_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `payment_id` (`payment_id`),
  ADD KEY `reviewed_by` (`reviewed_by`),
  ADD KEY `idx_renew_subscription` (`subscription_id`),
  ADD KEY `idx_renew_status` (`status`),
  ADD KEY `idx_renew_created_at` (`created_at`);

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `api_usage_logs`
--
ALTER TABLE `api_usage_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=85;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `business_info_change_requests`
--
ALTER TABLE `business_info_change_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `client_subscriptions`
--
ALTER TABLE `client_subscriptions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `device_activations`
--
ALTER TABLE `device_activations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `license_tokens`
--
ALTER TABLE `license_tokens`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=73;

--
-- AUTO_INCREMENT for table `subscription_renewal_requests`
--
ALTER TABLE `subscription_renewal_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `systems`
--
ALTER TABLE `systems`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `system_notifications`
--
ALTER TABLE `system_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `api_usage_logs`
--
ALTER TABLE `api_usage_logs`
  ADD CONSTRAINT `api_usage_logs_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `client_subscriptions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `business_info_change_requests`
--
ALTER TABLE `business_info_change_requests`
  ADD CONSTRAINT `business_info_change_requests_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `business_info_change_requests_ibfk_2` FOREIGN KEY (`subscription_id`) REFERENCES `client_subscriptions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `business_info_change_requests_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `clients`
--
ALTER TABLE `clients`
  ADD CONSTRAINT `clients_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_clients_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

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
-- Constraints for table `subscription_renewal_requests`
--
ALTER TABLE `subscription_renewal_requests`
  ADD CONSTRAINT `subscription_renewal_requests_ibfk_1` FOREIGN KEY (`subscription_id`) REFERENCES `client_subscriptions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subscription_renewal_requests_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subscription_renewal_requests_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `subscription_renewal_requests_ibfk_4` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `subscription_renewal_requests_ibfk_5` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

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
