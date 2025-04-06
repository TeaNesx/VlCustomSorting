<?php declare(strict_types=1);

namespace VlCustomSorting\Migration;

use Doctrine\DBAL\Connection;
use Shopware\Core\Framework\Migration\MigrationStep;

class Migration1712436000AddSortOrderField extends MigrationStep
{
    public function getCreationTimestamp(): int
    {
        return 1712436000;
    }

    public function update(Connection $connection): void
    {
        // Check if the column already exists
        $columnExists = $connection->executeQuery(
            'SHOW COLUMNS FROM `product` LIKE "sort_order"'
        )->rowCount() > 0;

        if (!$columnExists) {
            $connection->executeStatement('
                ALTER TABLE `product`
                ADD COLUMN `sort_order` INT DEFAULT 0 AFTER `available`;
            ');
        }
    }

    public function updateDestructive(Connection $connection): void
    {
        // No destructive changes
    }
}
