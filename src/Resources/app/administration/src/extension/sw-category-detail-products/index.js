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
                label: this.$tc('vl-custom-sorting.columns.sortOrder'),
                inlineEdit: 'number',
                align: 'right',
                width: '125px'
            });

            return columns;
        }
    },

    methods: {
        onSortOrderChange(item) {
            // Save the updated sort order to the database
            if (!item || !item.id) return;

            const productRepository = this.repositoryFactory.create('product');
            productRepository.save(item, Shopware.Context.api).then(() => {
                this.createNotificationSuccess({
                    message: this.$tc('vl-custom-sorting.messages.sortOrderSaved')
                });
            }).catch((error) => {
                console.error('Error saving sort order:', error);
                this.createNotificationError({
                    message: this.$tc('vl-custom-sorting.messages.sortOrderError')
                });
            });
        }
    }
});
