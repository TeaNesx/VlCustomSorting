<?php declare(strict_types=1);

namespace VlCustomSorting\Storefront\Subscriber;

use Shopware\Core\Content\Product\Events\ProductListingCriteriaEvent;
use Shopware\Core\Content\Product\Events\ProductSearchCriteriaEvent;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Sorting\FieldSorting;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsFilter;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsAnyFilter;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Request;

class ProductListingSubscriber implements EventSubscriberInterface
{
    /**
     * @return array<string, string>
     */
    public static function getSubscribedEvents(): array
    {
        return [
            ProductListingCriteriaEvent::class => 'handleRequest',
            ProductSearchCriteriaEvent::class => 'handleRequest',
        ];
    }

    public function handleRequest(ProductListingCriteriaEvent $event): void
    {
        $request = $event->getRequest();
        $categoryId = $this->getCategoryId($request, $event);
        
        if (!$categoryId) {
            return;
        }
        
        // Create a custom field key for this category's sort order
        $sortOrderKey = 'category_sort_order_' . $categoryId;
        
        // Add a sorting by the custom field
        $criteria = $event->getCriteria();
        
        // Add debug output
        error_log('VlCustomSorting: Applying custom sorting for category ' . $categoryId);
        error_log('VlCustomSorting: Custom field key: ' . $sortOrderKey);
        
        // Make sure we load the customFields
        $criteria->addAssociation('customFields');
        
        // Only apply our custom sorting if no other sorting is selected by the user
        if (count($criteria->getSorting()) === 0 || $this->isDefaultSorting($criteria->getSorting())) {
            // First sort by the custom field (ascending), then by the default sorting
            // Wir sortieren nach dem Feld, wobei Produkte mit Werten > 0 zuerst kommen (aufsteigend)
            // und Produkte ohne Wert oder mit Wert 0 in ihrer ursprünglichen Reihenfolge bleiben
            $criteria->addSorting(new FieldSorting('customFields.' . $sortOrderKey, FieldSorting::ASCENDING, true));
            
            // Add debug output
            error_log('VlCustomSorting: Custom sorting added');
        }
    }
    
    /**
     * Check if the current sorting is the default sorting
     */
    private function isDefaultSorting(array $sorting): bool
    {
        if (count($sorting) !== 1) {
            return false;
        }
        
        $firstSorting = reset($sorting);
        
        // Check if the first sorting is the default sorting (usually by name)
        return $firstSorting->getField() === 'product.name';
    }
    
    /**
     * Get the category ID from the request or event
     */
    private function getCategoryId(Request $request, ProductListingCriteriaEvent $event): ?string
    {
        // Try to get the category ID from the request
        $categoryId = $request->get('navigationId');
        
        // If not found in request, try to get it from the criteria
        if (!$categoryId) {
            $criteria = $event->getCriteria();
            $filters = $criteria->getFilters();
            
            foreach ($filters as $filter) {
                // Check if it's an EqualsFilter
                if ($filter instanceof EqualsFilter && $filter->getField() === 'product.categoryTree') {
                    $reflection = new \ReflectionClass(EqualsFilter::class);
                    $property = $reflection->getProperty('value');
                    $property->setAccessible(true);
                    $categoryId = $property->getValue($filter);
                    break;
                }
                
                // Check if it's an EqualsAnyFilter
                if ($filter instanceof EqualsAnyFilter && $filter->getField() === 'product.categoryTree') {
                    $reflection = new \ReflectionClass(EqualsAnyFilter::class);
                    $property = $reflection->getProperty('value');
                    $property->setAccessible(true);
                    $values = $property->getValue($filter);
                    if (is_array($values) && count($values) > 0) {
                        $categoryId = $values[0];
                        break;
                    }
                }
            }
        }
        
        return $categoryId;
    }
}
