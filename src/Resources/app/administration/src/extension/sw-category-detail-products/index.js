import template from './sw-category-detail-products.html.twig';

// Override the component
Shopware.Component.override('sw-category-detail-products', {
    template,

    computed: {
        productColumns() {
            // Get the original columns
            const columns = this.$super('productColumns');

            // Add our new sorting column
            columns.push({
                property: 'sortOrder',
                dataIndex: 'sortOrder',
                label: this.$tc('vl-custom-sorting.columns.sortOrder'),
                inlineEdit: 'string',
                allowResize: true,
                align: 'right',
                width: '125px',
                visible: true
            });

            return columns;
        }
    },

    created() {
        // Make sure we extend the product criteria to include our sort_order field
        this.$on('sw-many-to-many-assignment-card-criteria-loaded', this.onCriteriaLoaded);
    },

    beforeDestroy() {
        this.$off('sw-many-to-many-assignment-card-criteria-loaded', this.onCriteriaLoaded);
    },

    methods: {
        onCriteriaLoaded(criteria) {
            // Make sure the sortOrder field is included in the criteria
            if (!criteria.hasField('product.sortOrder')) {
                criteria.addSelect('product.sortOrder');
            }
        },

        onSortOrderChange(item) {
            // Save the updated sort order to the database
            if (!item || !item.id) return;

            const productRepository = this.repositoryFactory.create('product');
            productRepository.save(item, Shopware.Context.api).then(() => {
                this.createNotificationSuccess({
                    message: this.$tc('vl-custom-sorting.messages.sortOrderSaved', 0, { name: item.name })
                });
            }).catch((error) => {
                this.createNotificationError({
                    message: this.$tc('vl-custom-sorting.messages.sortOrderError', 0, { name: item.name })
                });
            });
        }
    }
});