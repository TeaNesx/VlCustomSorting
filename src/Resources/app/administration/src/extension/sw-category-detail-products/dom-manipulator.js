// Simple DOM manipulator to add input fields to sortOrder cells
Shopware.Component.override('sw-category-detail-products', {
    data() {
        return {
            _sortOrderCache: {},
            _observer: null,
            _intervalId: null,
            _pendingChanges: {},
            _inputFocused: false,
            _activeInputProductId: null
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
            this.setupContinuousMonitoring();
            this.setupSaveButton();
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
    
    beforeDestroy() {
        // Clean up observers and intervals when component is destroyed
        this.cleanupMonitoring();
        
        // Call original beforeDestroy if it exists
        if (this.$options.extends && this.$options.extends.methods && this.$options.extends.methods.beforeDestroy) {
            this.$options.extends.methods.beforeDestroy.call(this);
        }
    },
    
    // Add computed properties to access the grid and products
    computed: {
        productColumns() {
            // Get the original columns
            const columns = this.$super('productColumns');

            // Check if the sortOrder column already exists
            const sortOrderColumnExists = columns.some(column => column.property === 'sortOrder');
            
            // Add our new sorting column only if it doesn't already exist
            if (!sortOrderColumnExists) {
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
            }

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
        setupSaveButton() {
            // Warte kurz, um sicherzustellen, dass die UI vollständig geladen ist
            setTimeout(() => {
                // Finde den Speichern-Button im Footer der Kategorie-Detailansicht
                const saveButton = document.querySelector('.sw-category-detail__save-action');
                if (!saveButton) {
                    // Wenn der Button nicht gefunden wurde, versuche es später erneut
                    setTimeout(() => this.setupSaveButton(), 500);
                    return;
                }
                
                // Entferne vorhandene Event-Listener, um Duplikate zu vermeiden
                saveButton.removeEventListener('click', this.handleSaveButtonClick);
                
                // Füge einen neuen Event-Listener hinzu
                saveButton.addEventListener('click', this.handleSaveButtonClick);
                console.log('Save button event listener added');
            }, 500);
        },
        
        handleSaveButtonClick() {
            // Speichere alle ausstehenden Änderungen
            if (Object.keys(this._pendingChanges).length > 0) {
                console.log('Saving pending changes:', this._pendingChanges);
                
                // Speichere jede Änderung einzeln
                const savePromises = [];
                Object.entries(this._pendingChanges).forEach(([productId, value]) => {
                    savePromises.push(this.saveSortOrder(productId, value));
                });
                
                // Warte auf alle Speichervorgänge
                Promise.all(savePromises)
                    .then(() => {
                        // Zeige Erfolgsmeldung
                        Shopware.State.dispatch('notification/createNotification', {
                            title: 'Erfolg',
                            message: 'Sortierung wurde gespeichert',
                            variant: 'success'
                        });
                        
                        // Leere die ausstehenden Änderungen
                        this._pendingChanges = {};
                    })
                    .catch((error) => {
                        console.error('Error saving sort orders:', error);
                        
                        // Zeige Fehlermeldung
                        Shopware.State.dispatch('notification/createNotification', {
                            title: 'Fehler',
                            message: 'Fehler beim Speichern der Sortierung',
                            variant: 'error'
                        });
                    });
            }
        },
        setupContinuousMonitoring() {
            // Bereinige vorhandene Observer und Intervalle
            this.cleanupMonitoring();
            
            // 1. Setze einen Intervall, der regelmäßig prüft, ob die Input-Felder vorhanden sind
            this._intervalId = setInterval(() => {
                // Nur aktualisieren, wenn kein Eingabefeld fokussiert ist
                if (!this._inputFocused) {
                    this.addSortOrderInputFields();
                }
            }, 1000); // Prüfe jede Sekunde
            
            // 2. Verwende MutationObserver, um auf DOM-Änderungen zu reagieren
            const setupObserver = () => {
                // Finde das Hauptelement, das die Tabelle enthält
                const container = document.querySelector('.sw-category-detail__products');
                if (!container) {
                    // Wenn das Container-Element nicht gefunden wurde, versuche es später erneut
                    setTimeout(setupObserver, 500);
                    return;
                }
                
                // Erstelle einen neuen MutationObserver
                this._observer = new MutationObserver((mutations) => {
                    // Prüfe, ob relevante Änderungen vorliegen
                    const relevantMutation = mutations.some(mutation => {
                        // Änderungen an Kindelementen
                        if (mutation.type === 'childList') {
                            return true;
                        }
                        
                        // Änderungen an Attributen
                        if (mutation.type === 'attributes' && 
                            (mutation.target.classList.contains('sw-data-grid') ||
                             mutation.target.classList.contains('sw-data-grid__body') ||
                             mutation.target.classList.contains('sw-data-grid__row'))) {
                            return true;
                        }
                        
                        return false;
                    });
                    
                    if (relevantMutation) {
                        // Warte kurz, bis die Änderungen abgeschlossen sind
                        setTimeout(() => {
                            // Nur aktualisieren, wenn kein Eingabefeld fokussiert ist
                            if (!this._inputFocused) {
                                this.loadSortOrderValues();
                                this.addSortOrderInputFields();
                            }
                        }, 200);
                    }
                });
                
                // Starte die Beobachtung mit allen relevanten Optionen
                this._observer.observe(container, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    characterData: false
                });
                
                // Füge Event-Listener für AJAX-Aufrufe hinzu
                this.setupAjaxInterceptor();
                
                // Füge Event-Listener für Pagination hinzu
                this.setupPaginationEvents();
            };
            
            // Starte den Observer-Setup
            setupObserver();
            
            // Initial die Input-Felder hinzufügen
            this.addSortOrderInputFields();
        },
        
        setupPaginationEvents() {
            // Finde die Grid-Komponente
            const gridComponent = this.gridComponent;
            if (!gridComponent || !gridComponent.$on) {
                return;
            }
            
            // Entferne vorhandene Listener, um Duplikate zu vermeiden
            gridComponent.$off('page-change');
            gridComponent.$off('paginate');
            gridComponent.$off('sort-change');
            gridComponent.$off('selection-change');
            
            // Füge neue Listener hinzu
            const events = ['page-change', 'paginate', 'sort-change', 'selection-change'];
            events.forEach(event => {
                gridComponent.$on(event, () => {
                    setTimeout(() => {
                        // Nur aktualisieren, wenn kein Eingabefeld fokussiert ist
                        if (!this._inputFocused) {
                            this.loadSortOrderValues();
                            this.addSortOrderInputFields();
                        }
                    }, 300);
                });
            });
        },
        
        setupAjaxInterceptor() {
            // Globaler AJAX-Interceptor für XMLHttpRequest
            const originalXHROpen = XMLHttpRequest.prototype.open;
            const originalXHRSend = XMLHttpRequest.prototype.send;
            const self = this;
            
            XMLHttpRequest.prototype.open = function() {
                this.addEventListener('load', function() {
                    // Prüfe, ob die Anfrage abgeschlossen ist und erfolgreich war
                    if (this.readyState === 4 && this.status >= 200 && this.status < 300) {
                        // Warte kurz, bis die UI aktualisiert wurde
                        setTimeout(() => {
                            // Nur aktualisieren, wenn kein Eingabefeld fokussiert ist
                            if (!self._inputFocused) {
                                self.loadSortOrderValues();
                                self.addSortOrderInputFields();
                            }
                        }, 300);
                    }
                });
                return originalXHROpen.apply(this, arguments);
            };
            
            XMLHttpRequest.prototype.send = function() {
                return originalXHRSend.apply(this, arguments);
            };
        },
        
        cleanupMonitoring() {
            // Bereinige den Intervall
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
            
            // Bereinige den Observer
            if (this._observer) {
                this._observer.disconnect();
                this._observer = null;
            }
            
            // Bereinige AJAX-Interceptor (nicht möglich, da global)
        },
        
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
            // Warte kurz, um sicherzustellen, dass die Tabelle vollständig gerendert ist
            setTimeout(() => {
                // Find all cells with the sortOrder class
                const sortOrderCells = document.querySelectorAll('.sw-data-grid__cell--sortOrder .sw-data-grid__cell-content');
                
                if (!sortOrderCells.length) {
                    // Versuche es erneut, wenn keine Zellen gefunden wurden
                    setTimeout(() => this.addSortOrderInputFields(), 500);
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
                                // Prüfe, ob es eine ausstehende Änderung gibt oder ob das Eingabefeld gerade fokussiert ist
                                if (this._pendingChanges[productId] !== undefined) {
                                    // Wenn es eine ausstehende Änderung gibt, verwende diesen Wert
                                    if (input.value !== this._pendingChanges[productId].toString()) {
                                        input.value = this._pendingChanges[productId];
                                    }
                                } else if (this._activeInputProductId !== productId) {
                                    // Nur aktualisieren, wenn dieses Eingabefeld nicht gerade fokussiert ist
                                    const currentValue = this.getProductSortOrder(productId);
                                    if (currentValue !== null && input.value !== currentValue.toString()) {
                                        input.value = currentValue;
                                    }
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
                    
                    // Event-Listener für Focus und Blur, um zu verfolgen, welches Eingabefeld aktiv ist
                    input.addEventListener('focus', () => {
                        this._inputFocused = true;
                        this._activeInputProductId = productId;
                        console.log(`Input focused for product ${productId}`);
                    });
                    
                    input.addEventListener('blur', () => {
                        this._inputFocused = false;
                        setTimeout(() => {
                            this._activeInputProductId = null;
                        }, 300);
                        console.log(`Input blurred for product ${productId}`);
                    });
                    
                    // Event-Listener für Änderungen - nur den Wert speichern, noch nicht speichern
                    input.addEventListener('change', (event) => {
                        this._pendingChanges[productId] = event.target.value;
                        console.log(`Stored pending change for product ${productId}: ${event.target.value}`);
                    });
                    
                    // Event-Listener für Eingaben - aktualisiere den Wert bei jeder Eingabe
                    input.addEventListener('input', (event) => {
                        this._pendingChanges[productId] = event.target.value;
                    });
                    
                    // Füge das Eingabefeld zur Zelle hinzu
                    cell.appendChild(input);
                });
            }, 100);
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
                return Promise.reject(new Error('Category ID not found'));
            }
            
            // Parse the value to ensure it's a number
            const parsedValue = parseInt(value, 10) || 0;
            
            // Create a product repository
            const productRepository = Shopware.Service('repositoryFactory').create('product');
            
            // Log the update attempt
            console.log(`Updating product ${productId} with sort order for category ${categoryId}:`, parsedValue);
            
            // Aktualisiere die lokale Anzeige sofort, damit der Benutzer Feedback erhält
            this.updateProductInGrid(productId, parsedValue);
            
            // Rückgabe eines Promise für die Speicheroperation
            return productRepository.get(productId, Shopware.Context.api).then((product) => {
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
                
                // Update the cache
                this._sortOrderCache[productId] = parsedValue;
                
                // Return success
                return true;
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
