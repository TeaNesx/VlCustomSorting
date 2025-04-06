<?php declare(strict_types=1);

namespace VlCustomSorting\Core\Content\Product\SalesChannel\Listing;

use Shopware\Core\Content\Product\SalesChannel\Listing\ProductListingRoute;
use Shopware\Core\Content\Product\SalesChannel\Listing\ProductListingRouteResponse;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\System\SalesChannel\SalesChannelContext;
use Symfony\Component\HttpFoundation\Request;

class ProductListingRouteDecorator extends ProductListingRoute
{
    private ProductListingRoute $decorated;

    public function __construct(ProductListingRoute $decorated)
    {
        $this->decorated = $decorated;
    }

    public function getDecorated(): ProductListingRoute
    {
        return $this->decorated;
    }

    public function load(
        string $categoryId,
        Request $request,
        SalesChannelContext $context,
        Criteria $criteria
    ): ProductListingRouteResponse {
        // Create a custom field key for this category's sort order
        $sortOrderKey = 'category_sort_order_' . $categoryId;
        
        // Debug logging
        error_log('VlCustomSorting Decorator: Sorting products for category ' . $categoryId);
        
        // Get the original response
        $response = $this->decorated->load($categoryId, $request, $context, $criteria);
        
        // Get the products from the response
        $listing = $response->getResult();
        $products = $listing->getEntities();
        
        if (!$products || $products->count() === 0) {
            return $response;
        }
        
        // Create a new sorted array of products
        $sortedProducts = [];
        $unsortedProducts = [];
        
        // Separate products with and without sort order
        foreach ($products as $product) {
            $customFields = $product->getCustomFields() ?? [];
            $sortOrder = isset($customFields[$sortOrderKey]) ? (int)$customFields[$sortOrderKey] : 0;
            
            if ($sortOrder > 0) {
                $sortedProducts[$product->getId()] = [
                    'product' => $product,
                    'sortOrder' => $sortOrder
                ];
            } else {
                $unsortedProducts[] = $product;
            }
        }
        
        // Sort the products by sort order
        uasort($sortedProducts, function ($a, $b) {
            return $a['sortOrder'] <=> $b['sortOrder'];
        });
        
        // Create a new collection with the sorted products first, then the unsorted ones
        $newProducts = new \Shopware\Core\Framework\DataAbstractionLayer\EntityCollection();
        
        // Add sorted products first
        foreach ($sortedProducts as $data) {
            $newProducts->add($data['product']);
        }
        
        // Then add unsorted products
        foreach ($unsortedProducts as $product) {
            $newProducts->add($product);
        }
        
        // Replace the products in the listing
        $listing->assign(['entities' => $newProducts]);
        
        return $response;
    }
}
