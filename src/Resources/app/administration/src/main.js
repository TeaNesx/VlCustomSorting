import './extension/sw-category-detail-products';
import './extension/sw-category-detail-products/dom-manipulator';

// Add translations
Shopware.Locale.extend('de-DE', {
    'vl-custom-sorting': {
        columns: {
            sortOrder: 'Sortierung'
        },
        messages: {
            sortOrderSaved: 'Sortierung für "{name}" wurde erfolgreich gespeichert',
            sortOrderError: 'Fehler beim Speichern der Sortierung für "{name}"'
        }
    }
});

Shopware.Locale.extend('en-GB', {
    'vl-custom-sorting': {
        columns: {
            sortOrder: 'Sort Order'
        },
        messages: {
            sortOrderSaved: 'Sort order for "{name}" has been saved successfully',
            sortOrderError: 'Error saving sort order for "{name}"'
        }
    }
});
