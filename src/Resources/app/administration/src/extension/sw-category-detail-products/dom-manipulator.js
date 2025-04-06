// Simple DOM manipulator to add input fields to sortOrder cells
Shopware.Component.override('sw-category-detail-products', {
    data() {
        return {
            _sortOrderCache: {}
        };
    },
    
    mounted() {
        // Call original mounted if it exists
        if (this.$options.extends && this.$options.extends.methods && this.$options.extends.methods.mounted) {
            this.$options.extends.methods.mounted.call(this);
        }
        
        // Add the input fields after a short delay to ensure the grid is rendered
        setTimeout(() => {
            this.loadSortOrderValues();
            this.addSortOrderInputFields();
        }, 1000);
    },

    updated() {
        // Call original updated if it exists
        if (this.$options.extends && this.$options.extends.methods && this.$options.extends.methods.updated) {
            this.$options.extends.methods.updated.call(this);
        }
        
        // Add the input fields after a short delay to ensure the grid is updated
        setTimeout(() => {
            this.addSortOrderInputFields();
        }, 500);
    },
    
    // Add computed properties to access the grid and products
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
        },
        
        gridComponent() {
            // Try to find the grid component in the children
            if (this.$children) {
                for (const child of this.$children) {
                    if (child.$options.name === 'sw-many-to-many-assignment-card') {
                        return child;
                    }
                }
            }
            return null;
        },
        
        products() {
            // Get the products from the grid component
            if (this.gridComponent && this.gridComponent.items) {
                return this.gridComponent.items;
            }
            return [];
        }
    },

    methods: {
        loadSortOrderValues() {
            // Get the current category ID
            const categoryId = this.getCurrentCategoryId();
            if (!categoryId) {
                return;
            }
            
            // Create a custom field key for this category's sort order
            const sortOrderKey = `category_sort_order_${categoryId}`;
            
            // Get the product IDs from the grid
            const productIds = [];
            if (this.products && this.products.length) {
                this.products.forEach(product => {
                    if (product.id) {
                        productIds.push(product.id);
                    }
                });
            }
            
            if (!productIds.length) {
                return;
            }
            
            // Create a product repository
            const productRepository = Shopware.Service('repositoryFactory').create('product');
            
            // Create criteria to load products with custom fields
            const criteria = new Shopware.Data.Criteria(1, 500);
            criteria.addFilter(Shopware.Data.Criteria.equalsAny('id', productIds));
            
            // Load products with custom fields
            productRepository.search(criteria, Shopware.Context.api).then((result) => {
                if (result && result.length) {
                    // Process each product
                    result.forEach(loadedProduct => {
                        // Check if the product has custom fields
                        if (loadedProduct.customFields && loadedProduct.customFields[sortOrderKey] !== undefined) {
                            // Store the sort order value in the cache
                            this._sortOrderCache[loadedProduct.id] = loadedProduct.customFields[sortOrderKey];
                            console.log(`Loaded sort order for product ${loadedProduct.id}: ${loadedProduct.customFields[sortOrderKey]}`);
                            
                            // Update the product in the grid
                            if (this.products && this.products.length) {
                                const product = this.products.find(p => p.id === loadedProduct.id);
                                if (product) {
                                    product.sortOrder = loadedProduct.customFields[sortOrderKey];
                                }
                            }
                            
                            // Also update in gridComponent.items
                            if (this.gridComponent && this.gridComponent.items && this.gridComponent.items.length) {
                                const product = this.gridComponent.items.find(p => p.id === loadedProduct.id);
                                if (product) {
                                    product.sortOrder = loadedProduct.customFields[sortOrderKey];
                                }
                            }
                        }
                    });
                    
                    // Update the input fields with the loaded values
                    this.updateInputFieldsWithLoadedValues();
                }
            }).catch(error => {
                console.error('Error loading sort order values:', error);
            });
        },
        
        updateInputFieldsWithLoadedValues() {
            // Find all cells with the sortOrder class
            const sortOrderCells = document.querySelectorAll('.sw-data-grid__cell--sortOrder .sw-data-grid__cell-content');
            
            if (!sortOrderCells.length) {
                return;
            }
            
            // Process each cell
            sortOrderCells.forEach((cell) => {
                const input = cell.querySelector('input');
                if (!input) {
                    return;
                }
                
                const row = cell.closest('.sw-data-grid__row');
                if (!row) {
                    return;
                }
                
                const productId = this.getProductIdFromRow(row);
                if (!productId) {
                    return;
                }
                
                // Check if we have a cached value for this product
                if (this._sortOrderCache[productId] !== undefined) {
                    input.value = this._sortOrderCache[productId];
                    console.log(`Updated input field for product ${productId} with value ${this._sortOrderCache[productId]}`);
                }
            });
        },
        
        loadProductsWithCustomFields() {
            // Get the current category ID
            const categoryId = this.getCurrentCategoryId();
            if (!categoryId) {
                return;
            }
            
            // Get the product IDs from the grid
            const productIds = [];
            if (this.products && this.products.length) {
                this.products.forEach(product => {
                    if (product.id) {
                        productIds.push(product.id);
                    }
                });
            }
            
            if (!productIds.length) {
                return;
            }
            
            // Create a custom field key for this category's sort order
            const sortOrderKey = `category_sort_order_${categoryId}`;
            console.log('Sort order key:', sortOrderKey);
            
            // Make a direct API call to get the product translations with custom fields
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            // Use the Shopware API client to make the request
            Shopware.Service('syncService').httpClient.post(
                '/_action/vl-custom-sorting/get-product-custom-fields', 
                { productIds: productIds },
                { headers: headers }
            ).then(response => {
                console.log('API response:', response);
                
                if (response.data && response.data.success) {
                    const customFieldsData = response.data.data;
                    console.log('Custom fields data:', customFieldsData);
                    
                    // Update the products with the custom fields data
                    Object.keys(customFieldsData).forEach(productId => {
                        const customFields = customFieldsData[productId];
                        console.log(`Custom fields for product ${productId}:`, customFields);
                        
                        // Get the sort order value for this category
                        const sortOrderValue = customFields[sortOrderKey];
                        console.log(`Sort order value for product ${productId}:`, sortOrderValue);
                        
                        // Update in this.products
                        if (this.products && this.products.length) {
                            const product = this.products.find(p => p.id === productId);
                            if (product) {
                                // Update the product with the custom fields
                                product.customFields = customFields;
                                
                                // Also update the sortOrder property for display
                                if (sortOrderValue !== undefined) {
                                    product.sortOrder = sortOrderValue;
                                    console.log(`Updated sort order for product ${productId} to ${sortOrderValue}`);
                                }
                            }
                        }
                        
                        // Also update in gridComponent.items
                        if (this.gridComponent && this.gridComponent.items && this.gridComponent.items.length) {
                            const product = this.gridComponent.items.find(p => p.id === productId);
                            if (product) {
                                // Update the product with the custom fields
                                product.customFields = customFields;
                                
                                // Also update the sortOrder property for display
                                if (sortOrderValue !== undefined) {
                                    product.sortOrder = sortOrderValue;
                                }
                            }
                        }
                    });
                    
                    // Re-add the input fields with the updated data
                    this.addSortOrderInputFields();
                } else {
                    console.error('Error loading custom fields:', response.data.message || 'Unknown error');
                }
            }).catch(error => {
                console.error('Error loading custom fields:', error);
                
                // Fallback to the repository API
                this.loadProductsWithRepositoryAPI();
            });
        },
        
        loadProductsWithRepositoryAPI() {
            // Get the current category ID
            const categoryId = this.getCurrentCategoryId();
            if (!categoryId) {
                return;
            }
            
            // Create a product repository
            const productRepository = Shopware.Service('repositoryFactory').create('product');
            
            // Get the product IDs from the grid
            const productIds = [];
            if (this.products && this.products.length) {
                this.products.forEach(product => {
                    if (product.id) {
                        productIds.push(product.id);
                    }
                });
            }
            
            if (!productIds.length) {
                return;
            }
            
            // Create criteria to load products with custom fields
            const criteria = new Shopware.Data.Criteria(1, 500);
            criteria.addFilter(Shopware.Data.Criteria.equalsAny('id', productIds));
            
            // Load products with custom fields
            productRepository.search(criteria, Shopware.Context.api).then((result) => {
                console.log('Loaded products with repository API:', result);
                
                if (result && result.length) {
                    // Update the products in the grid with the loaded data
                    result.forEach(loadedProduct => {
                        // Update in this.products
                        if (this.products && this.products.length) {
                            const productIndex = this.products.findIndex(p => p.id === loadedProduct.id);
                            if (productIndex !== -1) {
                                // Update the product with the loaded data
                                this.products[productIndex].customFields = loadedProduct.customFields || {};
                                
                                // Also update the sortOrder property for display
                                const sortOrderKey = `category_sort_order_${categoryId}`;
                                if (loadedProduct.customFields && loadedProduct.customFields[sortOrderKey] !== undefined) {
                                    this.products[productIndex].sortOrder = loadedProduct.customFields[sortOrderKey];
                                }
                            }
                        }
                        
                        // Also update in gridComponent.items
                        if (this.gridComponent && this.gridComponent.items && this.gridComponent.items.length) {
                            const productIndex = this.gridComponent.items.findIndex(p => p.id === loadedProduct.id);
                            if (productIndex !== -1) {
                                // Update the product with the loaded data
                                this.gridComponent.items[productIndex].customFields = loadedProduct.customFields || {};
                                
                                // Also update the sortOrder property for display
                                const sortOrderKey = `category_sort_order_${categoryId}`;
                                if (loadedProduct.customFields && loadedProduct.customFields[sortOrderKey] !== undefined) {
                                    this.gridComponent.items[productIndex].sortOrder = loadedProduct.customFields[sortOrderKey];
                                }
                            }
                        }
                    });
                    
                    // Re-add the input fields with the updated data
                    this.addSortOrderInputFields();
                }
            }).catch(error => {
                console.error('Error loading products with repository API:', error);
            });
        },
        
        addSortOrderInputFields() {
            // Find all cells with the sortOrder class
            const sortOrderCells = document.querySelectorAll('.sw-data-grid__cell--sortOrder .sw-data-grid__cell-content');
            
            if (!sortOrderCells.length) {
                return;
            }

            // Get the current category ID
            const categoryId = this.getCurrentCategoryId();
            if (!categoryId) {
                return;
            }
            
            // Create a custom field key for this category's sort order
            const sortOrderKey = `category_sort_order_${categoryId}`;
            
            // Process each cell
            sortOrderCells.forEach((cell) => {
                // Skip if already processed
                if (cell.querySelector('input')) {
                    // Update the value if the input already exists
                    const input = cell.querySelector('input');
                    const row = cell.closest('.sw-data-grid__row');
                    if (row) {
                        const productId = this.getProductIdFromRow(row);
                        if (productId) {
                            const currentValue = this.getProductSortOrder(productId);
                            if (currentValue !== null && input.value !== currentValue.toString()) {
                                input.value = currentValue;
                            }
                        }
                    }
                    return;
                }

                // Get the row element to access the item data
                const row = cell.closest('.sw-data-grid__row');
                if (!row) {
                    return;
                }
                
                // Find the product ID from the row
                const productId = this.getProductIdFromRow(row);
                if (!productId) {
                    return;
                }
                
                // Get the current sort order value
                const currentValue = this.getProductSortOrder(productId);
                
                // Clear the cell content
                cell.innerHTML = '';

                // Create an input field
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'sw-field__input';
                input.value = currentValue !== null ? currentValue : '';
                input.style.width = '100%';
                input.style.height = '32px';
                input.style.padding = '0 10px';
                input.style.border = '1px solid #d1d9e0';
                input.style.borderRadius = '4px';
                input.placeholder = '0';
                
                // Add event listener for changes
                input.addEventListener('change', (event) => {
                    this.saveSortOrder(productId, event.target.value);
                });
                
                // Add the input to the cell
                cell.appendChild(input);
            });
        },
        
        getProductIdFromRow(row) {
            // Try to find the product ID from the link in the name column
            const nameLink = row.querySelector('.sw-data-grid__cell--name a');
            if (nameLink && nameLink.href) {
                // Extract product ID from the URL (format: #/sw/product/detail/{id})
                const match = nameLink.href.match(/\/sw\/product\/detail\/([a-f0-9]+)/);
                if (match && match[1]) {
                    return match[1];
                }
            }
            
            return null;
        },
        
        getProductSortOrder(productId) {
            // Get the current category ID
            const categoryId = this.getCurrentCategoryId();
            if (!categoryId) {
                return null;
            }
            
            // Create a custom field key for this category's sort order
            const sortOrderKey = `category_sort_order_${categoryId}`;
            
            // First check if we have a cached value
            if (!this._sortOrderCache) {
                this._sortOrderCache = {};
            }
            
            if (this._sortOrderCache[productId] !== undefined) {
                return this._sortOrderCache[productId];
            }
            
            // Try to get the product from the grid data
            if (this.products && this.products.length) {
                const product = this.products.find(p => p.id === productId);
                if (product) {
                    // First check if we have a runtime sortOrder property
                    if (product.sortOrder !== undefined) {
                        this._sortOrderCache[productId] = product.sortOrder;
                        return product.sortOrder;
                    }
                    
                    // Then check in the custom fields
                    if (product.customFields && product.customFields[sortOrderKey] !== undefined) {
                        this._sortOrderCache[productId] = product.customFields[sortOrderKey];
                        return product.customFields[sortOrderKey];
                    }
                }
            }
            
            // Try other sources if available
            if (this.gridComponent && this.gridComponent.items && this.gridComponent.items.length) {
                const product = this.gridComponent.items.find(p => p.id === productId);
                if (product) {
                    // First check if we have a runtime sortOrder property
                    if (product.sortOrder !== undefined) {
                        this._sortOrderCache[productId] = product.sortOrder;
                        return product.sortOrder;
                    }
                    
                    // Then check in the custom fields
                    if (product.customFields && product.customFields[sortOrderKey] !== undefined) {
                        this._sortOrderCache[productId] = product.customFields[sortOrderKey];
                        return product.customFields[sortOrderKey];
                    }
                }
            }
            
            // If we still don't have a value, try to get it from the database
            // Create a product repository
            const productRepository = Shopware.Service('repositoryFactory').create('product');
            
            // Create criteria to load the product
            const criteria = new Shopware.Data.Criteria(1, 1);
            criteria.addFilter(Shopware.Data.Criteria.equals('id', productId));
            
            // Load the product
            productRepository.search(criteria, Shopware.Context.api).then((result) => {
                if (result && result.length) {
                    const loadedProduct = result[0];
                    
                    // Check if the product has custom fields
                    if (loadedProduct.customFields && loadedProduct.customFields[sortOrderKey] !== undefined) {
                        // Update the cache
                        this._sortOrderCache[productId] = loadedProduct.customFields[sortOrderKey];
                        
                        // Update the input field
                        const sortOrderCells = document.querySelectorAll('.sw-data-grid__cell--sortOrder .sw-data-grid__cell-content');
                        sortOrderCells.forEach((cell) => {
                            const row = cell.closest('.sw-data-grid__row');
                            if (row) {
                                const rowProductId = this.getProductIdFromRow(row);
                                if (rowProductId === productId) {
                                    const input = cell.querySelector('input');
                                    if (input) {
                                        input.value = loadedProduct.customFields[sortOrderKey];
                                    }
                                }
                            }
                        });
                    }
                }
            }).catch((error) => {
                console.error('Error loading product:', error);
            });
            
            // Return null for now, the value will be updated asynchronously
            return null;
        },
        
        saveSortOrder(productId, value) {
            // Get the current category ID
            const categoryId = this.getCurrentCategoryId();
            if (!categoryId) {
                console.error('Cannot save sort order: Category ID not found');
                return;
            }
            
            // Parse the value to ensure it's a number
            const parsedValue = parseInt(value, 10) || 0;
            
            // Create a product repository
            const productRepository = Shopware.Service('repositoryFactory').create('product');
            
            // Log the update attempt
            console.log(`Updating product ${productId} with sort order for category ${categoryId}:`, parsedValue);
            
            // First, get the product to update
            productRepository.get(productId, Shopware.Context.api).then((product) => {
                // Initialize custom fields if they don't exist
                if (!product.customFields) {
                    product.customFields = {};
                }
                
                // Create a custom field key for this category's sort order
                const sortOrderKey = `category_sort_order_${categoryId}`;
                
                // Set the sort order in the custom fields
                product.customFields[sortOrderKey] = parsedValue;
                
                // Also set the runtime sortOrder property for display
                product.sortOrder = parsedValue;
                
                // Log the product before saving
                console.log('Product before save:', product);
                
                // Save the product
                return productRepository.save(product, Shopware.Context.api);
            })
            .then(() => {
                console.log('Sort order updated successfully');
                
                // Show success notification
                Shopware.State.dispatch('notification/createNotification', {
                    title: 'Erfolg',
                    message: 'Sortierung wurde gespeichert',
                    variant: 'success'
                });
                
                // Update the product in the grid
                this.updateProductInGrid(productId, parsedValue);
                
                // If we have a grid component with a getList method, refresh the grid
                if (this.gridComponent && typeof this.gridComponent.getList === 'function') {
                    this.gridComponent.getList();
                }
            })
            .catch((error) => {
                console.error('Error saving sort order:', error);
                
                // Show error notification
                Shopware.State.dispatch('notification/createNotification', {
                    title: 'Fehler',
                    message: 'Fehler beim Speichern der Sortierung',
                    variant: 'error'
                });
            });
        },
        
        updateProductInGrid(productId, value) {
            // Get the current category ID
            const categoryId = this.getCurrentCategoryId();
            if (!categoryId) {
                return;
            }
            
            // Create a custom field key for this category's sort order
            const sortOrderKey = `category_sort_order_${categoryId}`;
            
            const parsedValue = parseInt(value, 10) || 0;
            
            // Try to update the product in the grid data
            if (this.products && this.products.length) {
                const product = this.products.find(p => p.id === productId);
                if (product) {
                    // Update the runtime sortOrder property for display
                    product.sortOrder = parsedValue;
                    
                    // Also update in custom fields
                    if (!product.customFields) {
                        product.customFields = {};
                    }
                    product.customFields[sortOrderKey] = parsedValue;
                }
            }
            
            // Also try to update it in the assignment card items
            if (this.gridComponent && this.gridComponent.items && this.gridComponent.items.length) {
                const product = this.gridComponent.items.find(p => p.id === productId);
                if (product) {
                    // Update the runtime sortOrder property for display
                    product.sortOrder = parsedValue;
                    
                    // Also update in custom fields
                    if (!product.customFields) {
                        product.customFields = {};
                    }
                    product.customFields[sortOrderKey] = parsedValue;
                }
            }
            
            // If we have a category detail component with products
            if (this.$parent && this.$parent.products && this.$parent.products.length) {
                const product = this.$parent.products.find(p => p.id === productId);
                if (product) {
                    // Update the runtime sortOrder property for display
                    product.sortOrder = parsedValue;
                    
                    // Also update in custom fields
                    if (!product.customFields) {
                        product.customFields = {};
                    }
                    product.customFields[sortOrderKey] = parsedValue;
                }
            }
        },
        
        getCurrentCategoryId() {
            // Try to get the category ID from the component
            if (this.category && this.category.id) {
                return this.category.id;
            }
            
            // Try to get it from the parent component
            if (this.$parent && this.$parent.category && this.$parent.category.id) {
                return this.$parent.category.id;
            }
            
            // Try to get it from the route
            if (this.$route && this.$route.params && this.$route.params.id) {
                return this.$route.params.id;
            }
            
            // As a last resort, try to extract it from the URL
            const match = window.location.hash.match(/\/sw\/category\/detail\/([a-f0-9]+)/);
            if (match && match[1]) {
                return match[1];
            }
            
            return null;
        }
    }
});
