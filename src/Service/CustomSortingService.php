<?php declare(strict_types=1);

namespace VlCustomSorting\Service;

use Shopware\Core\Content\Product\SalesChannel\Listing\ProductListingResult;
use Shopware\Core\Framework\DataAbstractionLayer\EntityCollection;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Shopware\Core\Content\Product\Events\ProductListingResultEvent;
use Shopware\Core\Content\Product\Events\ProductSearchResultEvent;
use Shopware\Core\Content\Product\ProductCollection;
use Shopware\Core\Content\Product\ProductEntity;

class CustomSortingService implements EventSubscriberInterface
{
    /**
     * @return array<string, string>
     */
    public static function getSubscribedEvents(): array
    {
        return [
            ProductListingResultEvent::class => 'onProductListingResult',
            ProductSearchResultEvent::class => 'onProductSearchResult',
        ];
    }

    public function onProductListingResult(ProductListingResultEvent $event): void
    {
        $this->sortProducts($event->getResult(), $event->getSalesChannelContext(), $event->getRequest()->get('navigationId'));
    }

    public function onProductSearchResult(ProductSearchResultEvent $event): void
    {
        $this->sortProducts($event->getResult(), $event->getSalesChannelContext(), $event->getRequest()->get('navigationId'));
    }

    private function sortProducts(ProductListingResult $result, SalesChannelContext $context, ?string $categoryId): void
    {
        if (!$categoryId) {
            return;
        }

        // Debug logging
        $this->log('Sorting products for category ' . $categoryId);

        // Create a custom field key for this category's sort order
        $sortOrderKey = 'category_sort_order_' . $categoryId;
        $this->log('Using custom field key: ' . $sortOrderKey);

        // Direkter Zugriff auf die Elemente der Produktliste
        $elements = $result->getElements();
        if (empty($elements)) {
            $this->log('No products found');
            return;
        }
        
        $this->log('Original elements count: ' . count($elements));
        
        // Vereinfachter Ansatz: Wir erstellen zwei Arrays für sortierte und unsortierte Produkte
        $sortedProducts = [];
        $unsortedProducts = [];
        
        // Gehe durch alle Produkte und prüfe die Sortierreihenfolge
        foreach ($elements as $id => $product) {
            $sortOrder = $this->getSortOrder($product, $sortOrderKey);
            
            if ($sortOrder > 0) {
                $sortedProducts[$id] = [
                    'product' => $product,
                    'sortOrder' => $sortOrder
                ];
                $this->log("Product {$id} has sort order: {$sortOrder}");
            } else {
                $unsortedProducts[$id] = $product;
                $this->log("Product {$id} has no sort order");
            }
        }
        
        $this->log('Sorted products count: ' . count($sortedProducts));
        $this->log('Unsorted products count: ' . count($unsortedProducts));
        
        // Wenn keine Produkte eine Sortierreihenfolge haben, behalte die ursprüngliche Reihenfolge bei
        if (empty($sortedProducts)) {
            $this->log('No products have a sort order, keeping original order');
            return;
        }
        
        // Sortiere die Produkte nach ihrer Sortierreihenfolge (aufsteigend: 1, 2, 3, ...)
        uasort($sortedProducts, function ($a, $b) {
            return $a['sortOrder'] <=> $b['sortOrder'];
        });
        
        // Debug: Zeige die sortierte Reihenfolge
        $this->log('Products after sorting:');
        foreach ($sortedProducts as $id => $data) {
            $this->log("Product {$id} with sort order: {$data['sortOrder']}");
        }
        
        // Erstelle ein neues Array mit den sortierten Produkten zuerst, dann den unsortierten
        $newElements = [];
        
        // Füge sortierte Produkte zuerst hinzu
        foreach ($sortedProducts as $id => $data) {
            $newElements[$id] = $data['product'];
        }
        
        // Dann füge unsortierte Produkte hinzu
        foreach ($unsortedProducts as $id => $product) {
            $newElements[$id] = $product;
        }
        
        // Debug: Überprüfe die neue Reihenfolge
        $this->log('New elements order:');
        foreach ($newElements as $id => $product) {
            $sortOrder = $this->getSortOrder($product, $sortOrderKey);
            $this->log("Product {$id} with sort order: {$sortOrder}");
        }
        
        // Ersetze die Elemente im Ergebnis
        $result->assign([
            'elements' => $newElements
        ]);
        
        // Erstelle eine neue ProductCollection mit den sortierten Produkten
        $newCollection = new ProductCollection($newElements);
        $result->assign([
            'entities' => $newCollection
        ]);
        
        // Debug: Überprüfe das Ergebnis
        $this->log('Result updated with ' . count($newElements) . ' elements');
    }

    /**
     * Hilfsmethode zum Auslesen der Sortierreihenfolge aus einem Produkt
     */
    private function getSortOrder($product, string $sortOrderKey): int
    {
        // Prüfe verschiedene Möglichkeiten, wie auf die Custom Fields zugegriffen werden kann
        if ($product instanceof ProductEntity) {
            $customFields = $product->getCustomFields() ?? [];
            return isset($customFields[$sortOrderKey]) ? (int)$customFields[$sortOrderKey] : 0;
        }
        
        // Wenn es sich um ein Array handelt
        if (is_array($product) && isset($product['customFields'][$sortOrderKey])) {
            return (int)$product['customFields'][$sortOrderKey];
        }
        
        // Wenn es sich um ein Objekt handelt
        if (is_object($product)) {
            // Prüfe, ob die Eigenschaft direkt zugänglich ist
            if (property_exists($product, 'customFields')) {
                $customFields = $product->customFields ?? [];
                return isset($customFields[$sortOrderKey]) ? (int)$customFields[$sortOrderKey] : 0;
            }
            
            // Prüfe, ob es eine get-Methode gibt
            if (method_exists($product, 'get')) {
                $customFields = $product->get('customFields') ?? [];
                return isset($customFields[$sortOrderKey]) ? (int)$customFields[$sortOrderKey] : 0;
            }
            
            // Prüfe, ob es als Array-Zugriff funktioniert
            if (isset($product['customFields'][$sortOrderKey])) {
                return (int)$product['customFields'][$sortOrderKey];
            }
        }
        
        return 0;
    }
    
    private function log(string $message): void
    {
        error_log('VlCustomSorting: ' . $message);
    }
}
