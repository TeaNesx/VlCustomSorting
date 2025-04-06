<?php declare(strict_types=1);

namespace VlCustomSorting\Controller;

use Shopware\Core\Framework\Context;
use Shopware\Core\Framework\DataAbstractionLayer\EntityRepository;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Criteria;
use Shopware\Core\Framework\DataAbstractionLayer\Search\Filter\EqualsAnyFilter;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route(defaults={"_routeScope"={"api"}})
 */
class ProductCustomFieldsController extends AbstractController
{
    /**
     * @var EntityRepository
     */
    private $productRepository;

    public function __construct(EntityRepository $productRepository)
    {
        $this->productRepository = $productRepository;
    }

    /**
     * @Route("/api/_action/vl-custom-sorting/get-product-custom-fields", name="api.action.vl-custom-sorting.get-product-custom-fields", methods={"POST"})
     */
    public function getProductCustomFields(Request $request, Context $context): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $productIds = $data['productIds'] ?? [];
        
        if (empty($productIds)) {
            return new JsonResponse([
                'success' => false,
                'message' => 'No product IDs provided'
            ]);
        }
        
        $criteria = new Criteria($productIds);
        
        $products = $this->productRepository->search($criteria, $context);
        
        $result = [];
        
        foreach ($products as $product) {
            $result[$product->get('id')] = $product->get('customFields') ?: [];
        }
        
        return new JsonResponse([
            'success' => true,
            'data' => $result
        ]);
    }
}
