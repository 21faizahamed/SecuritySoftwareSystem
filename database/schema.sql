-- ==============================================================================
-- Security Certificate & Compliance Inspection System
-- Complete Database Schema (MySQL / MariaDB)
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `security_certificate_system`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `security_certificate_system`;

-- ------------------------------------------------------------------------------
-- 1. Table: roles
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Table: permissions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `permissions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `description` VARCHAR(255) DEFAULT NULL,
    INDEX `idx_permissions_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Table: role_permissions (Association Table)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `role_id` INT NOT NULL,
    `permission_id` INT NOT NULL,
    PRIMARY KEY (`role_id`, `permission_id`),
    CONSTRAINT `fk_role_permissions_role`
        FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_role_permissions_permission`
        FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Table: users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(255) NOT NULL,
    `role_id` INT NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `last_login_at` DATETIME DEFAULT NULL,
    INDEX `idx_users_username` (`username`),
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_role` (`role_id`),
    CONSTRAINT `fk_users_role`
        FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Table: establishments
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `establishments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `establishment_type` VARCHAR(100) NOT NULL,
    `address` TEXT NOT NULL,
    `owner_name` VARCHAR(255) DEFAULT NULL,
    `contact_information` VARCHAR(255) DEFAULT NULL,
    `location_coordinates` VARCHAR(100) DEFAULT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_establishment_name` (`name`),
    INDEX `idx_establishment_type` (`establishment_type`),
    INDEX `idx_establishment_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Table: inspections
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inspections` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `inspection_number` VARCHAR(64) NOT NULL UNIQUE,
    `establishment_id` INT NOT NULL,
    `inspector_id` INT DEFAULT NULL,
    `reviewer_id` INT DEFAULT NULL,
    `inspection_type` VARCHAR(50) NOT NULL DEFAULT 'INITIAL',
    `inspection_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `status` VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    `compliance_score` FLOAT DEFAULT NULL,
    `compliance_summary` TEXT DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_inspection_establishment` (`establishment_id`),
    INDEX `idx_inspection_inspector` (`inspector_id`),
    INDEX `idx_inspection_reviewer` (`reviewer_id`),
    INDEX `idx_inspection_status` (`status`),
    INDEX `idx_inspection_date` (`inspection_date`),
    CONSTRAINT `fk_inspections_establishment`
        FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_inspections_inspector`
        FOREIGN KEY (`inspector_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_inspections_reviewer`
        FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Table: documents
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `documents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `inspection_id` INT NOT NULL,
    `uploaded_by_id` INT DEFAULT NULL,
    `original_filename` VARCHAR(255) NOT NULL,
    `stored_filename` VARCHAR(255) NOT NULL UNIQUE,
    `file_path` VARCHAR(500) NOT NULL,
    `file_type` VARCHAR(100) NOT NULL,
    `file_size` BIGINT NOT NULL,
    `sha256_hash` VARCHAR(64) DEFAULT NULL,
    `upload_status` VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
    `extracted_text` LONGTEXT DEFAULT NULL,
    `page_count` INT NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_documents_inspection` (`inspection_id`),
    INDEX `idx_documents_uploaded_by` (`uploaded_by_id`),
    INDEX `idx_documents_status` (`upload_status`),
    CONSTRAINT `fk_documents_inspection`
        FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_documents_uploaded_by`
        FOREIGN KEY (`uploaded_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Table: detections
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `detections` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `inspection_id` INT NOT NULL,
    `document_id` INT NOT NULL,
    `page_number` INT NOT NULL DEFAULT 1,
    `object_type` VARCHAR(50) NOT NULL,
    `confidence` FLOAT NOT NULL DEFAULT 1.0,
    `bbox_x_min` FLOAT NOT NULL DEFAULT 0.0,
    `bbox_y_min` FLOAT NOT NULL DEFAULT 0.0,
    `bbox_x_max` FLOAT NOT NULL DEFAULT 0.0,
    `bbox_y_max` FLOAT NOT NULL DEFAULT 0.0,
    `detection_source` VARCHAR(50) NOT NULL DEFAULT 'YOLOv8_SECURITY_DETECTOR',
    `model_version` VARCHAR(50) NOT NULL DEFAULT 'yolov8n-sec-v1.0',
    `verification_status` VARCHAR(30) NOT NULL DEFAULT 'DETECTED',
    `verified_by_id` INT DEFAULT NULL,
    `verified_at` DATETIME DEFAULT NULL,
    `inspector_notes` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_detections_inspection` (`inspection_id`),
    INDEX `idx_detections_document` (`document_id`),
    INDEX `idx_detections_object_type` (`object_type`),
    INDEX `idx_detections_status` (`verification_status`),
    CONSTRAINT `fk_detections_inspection`
        FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_detections_document`
        FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_detections_verified_by`
        FOREIGN KEY (`verified_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Table: requirements
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `requirements` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `requirement_code` VARCHAR(50) NOT NULL UNIQUE,
    `category` VARCHAR(100) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `requirement_type` VARCHAR(50) NOT NULL DEFAULT 'MIN_QUANTITY',
    `target_object_type` VARCHAR(50) DEFAULT NULL,
    `min_quantity` INT DEFAULT NULL,
    `max_quantity` INT DEFAULT NULL,
    `unit` VARCHAR(30) NOT NULL DEFAULT 'units',
    `establishment_type` VARCHAR(100) NOT NULL DEFAULT 'ALL',
    `severity` VARCHAR(30) NOT NULL DEFAULT 'MANDATORY',
    `is_mandatory` BOOLEAN NOT NULL DEFAULT TRUE,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `source_document` VARCHAR(255) NOT NULL DEFAULT 'دليل نظم وقائية (2).pdf',
    `source_version` VARCHAR(50) NOT NULL DEFAULT 'v2024.1',
    `source_section` VARCHAR(150) DEFAULT NULL,
    `source_page` INT DEFAULT NULL,
    `original_text` TEXT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_requirements_code` (`requirement_code`),
    INDEX `idx_requirements_category` (`category`),
    INDEX `idx_requirements_target` (`target_object_type`),
    INDEX `idx_requirements_est_type` (`establishment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Table: inspection_compliance_items
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `inspection_compliance_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `inspection_id` INT NOT NULL,
    `requirement_id` INT NOT NULL,
    `detected_quantity` INT NOT NULL DEFAULT 0,
    `verified_quantity` INT NOT NULL DEFAULT 0,
    `required_quantity` INT DEFAULT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'REQUIRES_MANUAL_REVIEW',
    `evidence_notes` TEXT DEFAULT NULL,
    `evaluated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `is_overridden` BOOLEAN NOT NULL DEFAULT FALSE,
    `override_reason` TEXT DEFAULT NULL,
    `overridden_by_id` INT DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_compliance_inspection` (`inspection_id`),
    INDEX `idx_compliance_requirement` (`requirement_id`),
    INDEX `idx_compliance_status` (`status`),
    CONSTRAINT `fk_compliance_inspection`
        FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_compliance_requirement`
        FOREIGN KEY (`requirement_id`) REFERENCES `requirements` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_compliance_overridden_by`
        FOREIGN KEY (`overridden_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Table: certificates
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `certificates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `certificate_number` VARCHAR(64) NOT NULL UNIQUE,
    `inspection_id` INT NOT NULL UNIQUE,
    `establishment_id` INT NOT NULL,
    `issued_by_id` INT NOT NULL,
    `issue_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expiry_date` DATETIME DEFAULT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    `compliance_score` FLOAT NOT NULL DEFAULT 100.0,
    `qr_code_data` TEXT NOT NULL,
    `qr_code_image_path` VARCHAR(500) DEFAULT NULL,
    `pdf_path` VARCHAR(500) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_certificates_number` (`certificate_number`),
    INDEX `idx_certificates_inspection` (`inspection_id`),
    INDEX `idx_certificates_establishment` (`establishment_id`),
    INDEX `idx_certificates_status` (`status`),
    CONSTRAINT `fk_certificates_inspection`
        FOREIGN KEY (`inspection_id`) REFERENCES `inspections` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_certificates_establishment`
        FOREIGN KEY (`establishment_id`) REFERENCES `establishments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_certificates_issued_by`
        FOREIGN KEY (`issued_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 12. Table: audit_logs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT DEFAULT NULL,
    `username` VARCHAR(50) DEFAULT NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(64) DEFAULT NULL,
    `details` TEXT DEFAULT NULL,
    `ip_address` VARCHAR(64) DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_action` (`action`),
    INDEX `idx_audit_entity` (`entity_type`, `entity_id`),
    INDEX `idx_audit_created` (`created_at`),
    CONSTRAINT `fk_audit_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 13. Table: notifications
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `notification_type` VARCHAR(30) NOT NULL DEFAULT 'INFO',
    `link` VARCHAR(255) DEFAULT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_notifications_user` (`user_id`),
    INDEX `idx_notifications_read` (`is_read`),
    INDEX `idx_notifications_created` (`created_at`),
    CONSTRAINT `fk_notifications_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 14. Table: system_settings
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL UNIQUE,
    `setting_value` TEXT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
