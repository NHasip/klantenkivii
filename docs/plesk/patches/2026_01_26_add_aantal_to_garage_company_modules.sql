-- Adds quantity ("aantal") per module subscription.
-- Run this in phpMyAdmin on the production database before deploying code that uses `aantal`.

ALTER TABLE `garage_company_modules`
  ADD COLUMN `aantal` int unsigned NOT NULL DEFAULT 1 AFTER `module_id`;

UPDATE `garage_company_modules`
  SET `aantal` = 1
  WHERE `aantal` IS NULL OR `aantal` < 1;

