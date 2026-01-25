/*
Kivii CRM - MySQL/MariaDB schema + basis data (voor import in phpMyAdmin/Plesk)

Gebruik:
1) Open phpMyAdmin → selecteer database `necmarde_klanten` → tab "Import" → kies dit bestand.
2) Zet op de server in `.env`:
   DB_CONNECTION=mysql
   DB_HOST=localhost (of wat Plesk aangeeft)
   DB_DATABASE=necmarde_klanten
   DB_USERNAME=...
   DB_PASSWORD=...

Let op: dit script dropt geen tabellen. Voor een lege database is dat ideaal.
*/

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,

  `role` enum('admin','medewerker') NOT NULL DEFAULT 'medewerker',
  `phone` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_login_at` timestamp NULL DEFAULT NULL,

  `two_factor_secret` text DEFAULT NULL,
  `two_factor_recovery_codes` text DEFAULT NULL,
  `two_factor_confirmed_at` timestamp NULL DEFAULT NULL,

  `remember_token` varchar(100) DEFAULT NULL,
  `current_team_id` bigint unsigned DEFAULT NULL,
  `profile_photo_path` varchar(2048) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  KEY `users_role_index` (`role`),
  KEY `users_active_index` (`active`),
  KEY `users_last_login_at_index` (`last_login_at`),
  KEY `users_deleted_at_index` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `modules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `naam` varchar(255) NOT NULL,
  `omschrijving` text DEFAULT NULL,
  `default_visible` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `modules_naam_unique` (`naam`),
  KEY `modules_default_visible_index` (`default_visible`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `garage_companies` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `bedrijfsnaam` varchar(255) NOT NULL,
  `kvk_nummer` varchar(255) DEFAULT NULL,
  `btw_nummer` varchar(255) DEFAULT NULL,
  `adres_straat_nummer` varchar(255) DEFAULT NULL,
  `postcode` varchar(255) DEFAULT NULL,
  `plaats` varchar(255) NOT NULL,
  `land` varchar(255) NOT NULL DEFAULT 'Nederland',
  `website` varchar(255) DEFAULT NULL,
  `hoofd_email` varchar(255) NOT NULL,
  `hoofd_telefoon` varchar(255) NOT NULL,
  `status` enum('lead','demo_aangevraagd','demo_gepland','proefperiode','actief','opgezegd','verloren') NOT NULL DEFAULT 'lead',
  `bron` enum('website_formulier','telefoon','email','referral','anders') NOT NULL DEFAULT 'website_formulier',
  `tags` text DEFAULT NULL,
  `demo_aangevraagd_op` datetime DEFAULT NULL,
  `demo_gepland_op` datetime DEFAULT NULL,
  `proefperiode_start` datetime DEFAULT NULL,
  `actief_vanaf` datetime DEFAULT NULL,
  `opgezegd_op` datetime DEFAULT NULL,
  `opzegreden` text DEFAULT NULL,
  `verloren_op` datetime DEFAULT NULL,
  `verloren_reden` text DEFAULT NULL,
  `eigenaar_user_id` bigint unsigned DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `garage_companies_status_index` (`status`),
  KEY `garage_companies_bron_index` (`bron`),
  KEY `garage_companies_demo_aangevraagd_op_index` (`demo_aangevraagd_op`),
  KEY `garage_companies_demo_gepland_op_index` (`demo_gepland_op`),
  KEY `garage_companies_proefperiode_start_index` (`proefperiode_start`),
  KEY `garage_companies_actief_vanaf_index` (`actief_vanaf`),
  KEY `garage_companies_opgezegd_op_index` (`opgezegd_op`),
  KEY `garage_companies_verloren_op_index` (`verloren_op`),
  KEY `garage_companies_eigenaar_user_id_foreign` (`eigenaar_user_id`),
  KEY `garage_companies_created_by_foreign` (`created_by`),
  KEY `garage_companies_bedrijfsnaam_hoofd_email_index` (`bedrijfsnaam`,`hoofd_email`),
  CONSTRAINT `garage_companies_eigenaar_user_id_foreign` FOREIGN KEY (`eigenaar_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `garage_companies_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `customer_persons` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `garage_company_id` bigint unsigned NOT NULL,
  `voornaam` varchar(255) NOT NULL,
  `achternaam` varchar(255) NOT NULL,
  `rol` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `telefoon` varchar(255) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `customer_persons_garage_company_id_email_unique` (`garage_company_id`,`email`),
  KEY `customer_persons_is_primary_index` (`is_primary`),
  KEY `customer_persons_active_index` (`active`),
  CONSTRAINT `customer_persons_garage_company_id_foreign` FOREIGN KEY (`garage_company_id`) REFERENCES `garage_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sepa_mandates` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `garage_company_id` bigint unsigned NOT NULL,
  `bedrijfsnaam` varchar(255) NOT NULL,
  `voor_en_achternaam` varchar(255) NOT NULL,
  `straatnaam_en_nummer` varchar(255) NOT NULL,
  `postcode` varchar(255) NOT NULL,
  `plaats` varchar(255) NOT NULL,
  `land` varchar(255) NOT NULL DEFAULT 'Nederland',
  `iban` varchar(255) NOT NULL,
  `bic` varchar(255) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `telefoonnummer` varchar(255) NOT NULL,
  `plaats_van_tekenen` varchar(255) NOT NULL,
  `datum_van_tekenen` date NOT NULL,
  `ondertekenaar_naam` varchar(255) DEFAULT NULL,
  `akkoord_checkbox` tinyint(1) NOT NULL DEFAULT 0,
  `akkoord_op` datetime DEFAULT NULL,
  `mandaat_id` varchar(255) NOT NULL,
  `status` enum('pending','actief','ingetrokken') NOT NULL DEFAULT 'pending',
  `ontvangen_op` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sepa_mandates_mandaat_id_unique` (`mandaat_id`),
  KEY `sepa_mandates_status_index` (`status`),
  KEY `sepa_mandates_ontvangen_op_index` (`ontvangen_op`),
  KEY `sepa_mandates_garage_company_id_status_index` (`garage_company_id`,`status`),
  CONSTRAINT `sepa_mandates_garage_company_id_foreign` FOREIGN KEY (`garage_company_id`) REFERENCES `garage_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `garage_company_modules` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `garage_company_id` bigint unsigned NOT NULL,
  `module_id` bigint unsigned NOT NULL,
  `aantal` int unsigned NOT NULL DEFAULT 1,
  `actief` tinyint(1) NOT NULL DEFAULT 0,
  `prijs_maand_excl` decimal(10,2) NOT NULL,
  `startdatum` date DEFAULT NULL,
  `einddatum` date DEFAULT NULL,
  `btw_percentage` decimal(5,2) NOT NULL DEFAULT 21.00,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `garage_company_modules_garage_company_id_module_id_unique` (`garage_company_id`,`module_id`),
  KEY `garage_company_modules_actief_index` (`actief`),
  KEY `garage_company_modules_startdatum_index` (`startdatum`),
  KEY `garage_company_modules_einddatum_index` (`einddatum`),
  CONSTRAINT `garage_company_modules_garage_company_id_foreign` FOREIGN KEY (`garage_company_id`) REFERENCES `garage_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `garage_company_modules_module_id_foreign` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kivii_seats` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `garage_company_id` bigint unsigned NOT NULL,
  `naam` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `rol_in_kivii` varchar(255) DEFAULT NULL,
  `actief` tinyint(1) NOT NULL DEFAULT 1,
  `aangemaakt_op` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `kivii_seats_actief_index` (`actief`),
  KEY `kivii_seats_garage_company_id_actief_index` (`garage_company_id`,`actief`),
  CONSTRAINT `kivii_seats_garage_company_id_foreign` FOREIGN KEY (`garage_company_id`) REFERENCES `garage_companies` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activities` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `garage_company_id` bigint unsigned NOT NULL,
  `type` enum('status_wijziging','notitie','taak','afspraak','demo','mandate','module','systeem') NOT NULL,
  `titel` varchar(255) NOT NULL,
  `inhoud` text DEFAULT NULL,
  `due_at` datetime DEFAULT NULL,
  `done_at` datetime DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `activities_type_index` (`type`),
  KEY `activities_due_at_index` (`due_at`),
  KEY `activities_done_at_index` (`done_at`),
  KEY `activities_garage_company_id_type_index` (`garage_company_id`,`type`),
  KEY `activities_created_by_foreign` (`created_by`),
  CONSTRAINT `activities_garage_company_id_foreign` FOREIGN KEY (`garage_company_id`) REFERENCES `garage_companies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `activities_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reminders` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `garage_company_id` bigint unsigned DEFAULT NULL,
  `activity_id` bigint unsigned DEFAULT NULL,
  `titel` varchar(255) NOT NULL,
  `message` text DEFAULT NULL,
  `remind_at` datetime NOT NULL,
  `channel` enum('popup','email','beide') NOT NULL DEFAULT 'popup',
  `status` enum('gepland','verzonden','geannuleerd') NOT NULL DEFAULT 'gepland',
  `email_sent_at` datetime DEFAULT NULL,
  `popup_dismissed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reminders_remind_at_index` (`remind_at`),
  KEY `reminders_channel_index` (`channel`),
  KEY `reminders_status_index` (`status`),
  KEY `reminders_user_id_status_remind_at_index` (`user_id`,`status`,`remind_at`),
  KEY `reminders_garage_company_id_foreign` (`garage_company_id`),
  KEY `reminders_activity_id_foreign` (`activity_id`),
  CONSTRAINT `reminders_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reminders_garage_company_id_foreign` FOREIGN KEY (`garage_company_id`) REFERENCES `garage_companies` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reminders_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/* Basis data (admin + modules) */

INSERT INTO `users` (`name`, `email`, `password`, `role`, `active`, `created_at`, `updated_at`)
VALUES ('Kivii Admin', 'admin@kivii.local', '$2y$12$jOPP6LZanOyT4/FK8W5aOuxq6MRRo/xVM8Jh0eRR.h.2BPyH1eEmi', 'admin', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `password` = VALUES(`password`),
  `role` = VALUES(`role`),
  `active` = VALUES(`active`),
  `updated_at` = VALUES(`updated_at`);

INSERT IGNORE INTO `modules` (`naam`, `omschrijving`, `default_visible`, `created_at`, `updated_at`) VALUES
('Basis', 'Basis abonnement', 1, NOW(), NOW()),
('Planning', 'Afspraken en planning', 1, NOW(), NOW()),
('Rapportages', 'Rapportages en inzichten', 1, NOW(), NOW()),
('SEPA Incasso', 'SEPA incasso ondersteuning', 1, NOW(), NOW()),
('Koppelingen', 'Externe koppelingen / API', 0, NOW(), NOW());
