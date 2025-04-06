import './extension/sw-category-detail-products';

// Add translations
Shopware.Locale.extend('de-DE', {
    'vl-custom-sorting': {
        columns: {
            sortOrder: 'Sortierung'
        },
        messages: {
            sortOrderSaved: 'Sortierung wurde erfolgreich gespeichert',
            sortOrderError: 'Fehler beim Speichern der Sortierung'
        }
    }
});

Shopware.Locale.extend('en-GB', {
    'vl-custom-sorting': {
        columns: {
            sortOrder: 'Sort Order'
        },
        messages: {
            sortOrderSaved: 'Sort order has been saved successfully',
            sortOrderError: 'Error saving sort order'
        }
    }
});
