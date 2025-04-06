// Override the sw-many-to-many-assignment-card component
Shopware.Component.override('sw-many-to-many-assignment-card', {
    methods: {
        getColumns() {
            // Get the original columns
            const columns = this.$super('getColumns');

            // Only add our column if we're in the category product assignment
            if (this.$parent && this.$parent.$options.name === 'sw-category-detail-products') {
                // Add our new sorting column
                columns.push({
                    property: 'sortOrder',
                    dataIndex: 'sortOrder',
                    label: this.$tc('vl-custom-sorting.columns.sortOrder'),
                    inlineEdit: 'string',
                    allowResize: true,
                    align: 'right',
                    width: '125px'
                });
            }

            return columns;
        },

        onInlineEditSave(item) {
            this.$super('onInlineEditSave', item);

            // If we're in the category product assignment and the item has a sortOrder
            if (this.$parent && 
                this.$parent.$options.name === 'sw-category-detail-products' && 
                item.hasOwnProperty('sortOrder')) {
                
                // Save the updated sort order to the database
                const productRepository = Shopware.Service('repositoryFactory').create('product');
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
    }
});
