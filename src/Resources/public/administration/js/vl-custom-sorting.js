(function(){var t={593:function(){Shopware.Component.override("sw-category-detail-products",{data(){return{_sortOrderCache:{}}},mounted(){this.$options.extends&&this.$options.extends.methods&&this.$options.extends.methods.mounted&&this.$options.extends.methods.mounted.call(this),setTimeout(()=>{this.loadSortOrderValues(),this.addSortOrderInputFields()},1e3)},updated(){this.$options.extends&&this.$options.extends.methods&&this.$options.extends.methods.updated&&this.$options.extends.methods.updated.call(this),setTimeout(()=>{this.addSortOrderInputFields()},500)},computed:{productColumns(){let t=this.$super("productColumns");return t.some(t=>"sortOrder"===t.property)||t.push({property:"sortOrder",dataIndex:"sortOrder",label:this.$tc("vl-custom-sorting.columns.sortOrder"),inlineEdit:"string",allowResize:!0,align:"right",width:"125px",visible:!0}),t},gridComponent(){if(this.$children){for(let t of this.$children)if("sw-many-to-many-assignment-card"===t.$options.name)return t}return null},products(){return this.gridComponent&&this.gridComponent.items?this.gridComponent.items:[]}},methods:{loadSortOrderValues(){let t=this.getCurrentCategoryId();if(!t)return;let e=`category_sort_order_${t}`,r=[];if(this.products&&this.products.length&&this.products.forEach(t=>{t.id&&r.push(t.id)}),!r.length)return;let o=Shopware.Service("repositoryFactory").create("product"),s=new Shopware.Data.Criteria(1,500);s.addFilter(Shopware.Data.Criteria.equalsAny("id",r)),o.search(s,Shopware.Context.api).then(t=>{t&&t.length&&(t.forEach(t=>{if(t.customFields&&void 0!==t.customFields[e]){if(this._sortOrderCache[t.id]=t.customFields[e],console.log(`Loaded sort order for product ${t.id}: ${t.customFields[e]}`),this.products&&this.products.length){let r=this.products.find(e=>e.id===t.id);r&&(r.sortOrder=t.customFields[e])}if(this.gridComponent&&this.gridComponent.items&&this.gridComponent.items.length){let r=this.gridComponent.items.find(e=>e.id===t.id);r&&(r.sortOrder=t.customFields[e])}}}),this.updateInputFieldsWithLoadedValues())}).catch(t=>{console.error("Error loading sort order values:",t)})},updateInputFieldsWithLoadedValues(){let t=document.querySelectorAll(".sw-data-grid__cell--sortOrder .sw-data-grid__cell-content");t.length&&t.forEach(t=>{let e=t.querySelector("input");if(!e)return;let r=t.closest(".sw-data-grid__row");if(!r)return;let o=this.getProductIdFromRow(r);o&&void 0!==this._sortOrderCache[o]&&(e.value=this._sortOrderCache[o],console.log(`Updated input field for product ${o} with value ${this._sortOrderCache[o]}`))})},loadProductsWithCustomFields(){let t=this.getCurrentCategoryId();if(!t)return;let e=[];if(this.products&&this.products.length&&this.products.forEach(t=>{t.id&&e.push(t.id)}),!e.length)return;let r=`category_sort_order_${t}`;console.log("Sort order key:",r),Shopware.Service("syncService").httpClient.post("/_action/vl-custom-sorting/get-product-custom-fields",{productIds:e},{headers:{"Content-Type":"application/json",Accept:"application/json"}}).then(t=>{if(console.log("API response:",t),t.data&&t.data.success){let e=t.data.data;console.log("Custom fields data:",e),Object.keys(e).forEach(t=>{let o=e[t];console.log(`Custom fields for product ${t}:`,o);let s=o[r];if(console.log(`Sort order value for product ${t}:`,s),this.products&&this.products.length){let e=this.products.find(e=>e.id===t);e&&(e.customFields=o,void 0!==s&&(e.sortOrder=s,console.log(`Updated sort order for product ${t} to ${s}`)))}if(this.gridComponent&&this.gridComponent.items&&this.gridComponent.items.length){let e=this.gridComponent.items.find(e=>e.id===t);e&&(e.customFields=o,void 0!==s&&(e.sortOrder=s))}}),this.addSortOrderInputFields()}else console.error("Error loading custom fields:",t.data.message||"Unknown error")}).catch(t=>{console.error("Error loading custom fields:",t),this.loadProductsWithRepositoryAPI()})},loadProductsWithRepositoryAPI(){let t=this.getCurrentCategoryId();if(!t)return;let e=Shopware.Service("repositoryFactory").create("product"),r=[];if(this.products&&this.products.length&&this.products.forEach(t=>{t.id&&r.push(t.id)}),!r.length)return;let o=new Shopware.Data.Criteria(1,500);o.addFilter(Shopware.Data.Criteria.equalsAny("id",r)),e.search(o,Shopware.Context.api).then(e=>{console.log("Loaded products with repository API:",e),e&&e.length&&(e.forEach(e=>{if(this.products&&this.products.length){let r=this.products.findIndex(t=>t.id===e.id);if(-1!==r){this.products[r].customFields=e.customFields||{};let o=`category_sort_order_${t}`;e.customFields&&void 0!==e.customFields[o]&&(this.products[r].sortOrder=e.customFields[o])}}if(this.gridComponent&&this.gridComponent.items&&this.gridComponent.items.length){let r=this.gridComponent.items.findIndex(t=>t.id===e.id);if(-1!==r){this.gridComponent.items[r].customFields=e.customFields||{};let o=`category_sort_order_${t}`;e.customFields&&void 0!==e.customFields[o]&&(this.gridComponent.items[r].sortOrder=e.customFields[o])}}}),this.addSortOrderInputFields())}).catch(t=>{console.error("Error loading products with repository API:",t)})},addSortOrderInputFields(){let t=document.querySelectorAll(".sw-data-grid__cell--sortOrder .sw-data-grid__cell-content");t.length&&this.getCurrentCategoryId()&&t.forEach(t=>{if(t.querySelector("input")){let e=t.querySelector("input"),r=t.closest(".sw-data-grid__row");if(r){let t=this.getProductIdFromRow(r);if(t){let r=this.getProductSortOrder(t);null!==r&&e.value!==r.toString()&&(e.value=r)}}return}let e=t.closest(".sw-data-grid__row");if(!e)return;let r=this.getProductIdFromRow(e);if(!r)return;let o=this.getProductSortOrder(r);t.innerHTML="";let s=document.createElement("input");s.type="text",s.className="sw-field__input",s.value=null!==o?o:"",s.style.width="100%",s.style.height="32px",s.style.padding="0 10px",s.style.border="1px solid #d1d9e0",s.style.borderRadius="4px",s.placeholder="0",s.addEventListener("change",t=>{this.saveSortOrder(r,t.target.value)}),t.appendChild(s)})},getProductIdFromRow(t){let e=t.querySelector(".sw-data-grid__cell--name a");if(e&&e.href){let t=e.href.match(/\/sw\/product\/detail\/([a-f0-9]+)/);if(t&&t[1])return t[1]}return null},getProductSortOrder(t){let e=this.getCurrentCategoryId();if(!e)return null;let r=`category_sort_order_${e}`;if(this._sortOrderCache||(this._sortOrderCache={}),void 0!==this._sortOrderCache[t])return this._sortOrderCache[t];if(this.products&&this.products.length){let e=this.products.find(e=>e.id===t);if(e){if(void 0!==e.sortOrder)return this._sortOrderCache[t]=e.sortOrder,e.sortOrder;if(e.customFields&&void 0!==e.customFields[r])return this._sortOrderCache[t]=e.customFields[r],e.customFields[r]}}if(this.gridComponent&&this.gridComponent.items&&this.gridComponent.items.length){let e=this.gridComponent.items.find(e=>e.id===t);if(e){if(void 0!==e.sortOrder)return this._sortOrderCache[t]=e.sortOrder,e.sortOrder;if(e.customFields&&void 0!==e.customFields[r])return this._sortOrderCache[t]=e.customFields[r],e.customFields[r]}}let o=Shopware.Service("repositoryFactory").create("product"),s=new Shopware.Data.Criteria(1,1);return s.addFilter(Shopware.Data.Criteria.equals("id",t)),o.search(s,Shopware.Context.api).then(e=>{if(e&&e.length){let o=e[0];o.customFields&&void 0!==o.customFields[r]&&(this._sortOrderCache[t]=o.customFields[r],document.querySelectorAll(".sw-data-grid__cell--sortOrder .sw-data-grid__cell-content").forEach(e=>{let s=e.closest(".sw-data-grid__row");if(s&&this.getProductIdFromRow(s)===t){let t=e.querySelector("input");t&&(t.value=o.customFields[r])}}))}}).catch(t=>{console.error("Error loading product:",t)}),null},saveSortOrder(t,e){let r=this.getCurrentCategoryId();if(!r){console.error("Cannot save sort order: Category ID not found");return}let o=parseInt(e,10)||0,s=Shopware.Service("repositoryFactory").create("product");console.log(`Updating product ${t} with sort order for category ${r}:`,o),s.get(t,Shopware.Context.api).then(t=>{t.customFields||(t.customFields={});let e=`category_sort_order_${r}`;return t.customFields[e]=o,t.sortOrder=o,console.log("Product before save:",t),s.save(t,Shopware.Context.api)}).then(()=>{console.log("Sort order updated successfully"),Shopware.State.dispatch("notification/createNotification",{title:"Erfolg",message:"Sortierung wurde gespeichert",variant:"success"}),this.updateProductInGrid(t,o),this.gridComponent&&"function"==typeof this.gridComponent.getList&&this.gridComponent.getList()}).catch(t=>{console.error("Error saving sort order:",t),Shopware.State.dispatch("notification/createNotification",{title:"Fehler",message:"Fehler beim Speichern der Sortierung",variant:"error"})})},updateProductInGrid(t,e){let r=this.getCurrentCategoryId();if(!r)return;let o=`category_sort_order_${r}`,s=parseInt(e,10)||0;if(this.products&&this.products.length){let e=this.products.find(e=>e.id===t);e&&(e.sortOrder=s,e.customFields||(e.customFields={}),e.customFields[o]=s)}if(this.gridComponent&&this.gridComponent.items&&this.gridComponent.items.length){let e=this.gridComponent.items.find(e=>e.id===t);e&&(e.sortOrder=s,e.customFields||(e.customFields={}),e.customFields[o]=s)}if(this.$parent&&this.$parent.products&&this.$parent.products.length){let e=this.$parent.products.find(e=>e.id===t);e&&(e.sortOrder=s,e.customFields||(e.customFields={}),e.customFields[o]=s)}},getCurrentCategoryId(){if(this.category&&this.category.id)return this.category.id;if(this.$parent&&this.$parent.category&&this.$parent.category.id)return this.$parent.category.id;if(this.$route&&this.$route.params&&this.$route.params.id)return this.$route.params.id;let t=window.location.hash.match(/\/sw\/category\/detail\/([a-f0-9]+)/);return t&&t[1]?t[1]:null}}})}},e={};function r(o){var s=e[o];if(void 0!==s)return s.exports;var i=e[o]={exports:{}};return t[o](i,i.exports,r),i.exports}r.p="bundles/vlcustomsorting/",window?.__sw__?.assetPath&&(r.p=window.__sw__.assetPath+"/bundles/vlcustomsorting/"),Shopware.Component.override("sw-category-detail-products",{template:'{% block sw_category_detail_products %}\n    {% parent %}\n{% endblock %}\n\n{% block sw_many_to_many_assignment_card_grid_columns %}\n    {% parent %}\n\n    <template slot="column-sortOrder" slot-scope="{ item }">\n        <input \n            type="text" \n            class="sw-field__input" \n            :value="item.sortOrder"\n            @input="item.sortOrder = $event.target.value"\n            @change="onSortOrderChange(item)"\n            style="width: 100%; height: 32px; padding: 0 10px; border: 1px solid #d1d9e0; border-radius: 4px;"\n        />\n    </template>\n{% endblock %}',computed:{productColumns(){let t=this.$super("productColumns");return t.push({property:"sortOrder",dataIndex:"sortOrder",label:this.$tc("vl-custom-sorting.columns.sortOrder"),inlineEdit:"string",allowResize:!0,align:"right",width:"125px",visible:!0}),t}},created(){this.$on("sw-many-to-many-assignment-card-criteria-loaded",this.onCriteriaLoaded)},beforeDestroy(){this.$off("sw-many-to-many-assignment-card-criteria-loaded",this.onCriteriaLoaded)},methods:{onCriteriaLoaded(t){t.hasField("product.sortOrder")||t.addSelect("product.sortOrder")},onSortOrderChange(t){t&&t.id&&this.repositoryFactory.create("product").save(t,Shopware.Context.api).then(()=>{this.createNotificationSuccess({message:this.$tc("vl-custom-sorting.messages.sortOrderSaved",0,{name:t.name})})}).catch(e=>{this.createNotificationError({message:this.$tc("vl-custom-sorting.messages.sortOrderError",0,{name:t.name})})})}}}),r(593),Shopware.Locale.extend("de-DE",{"vl-custom-sorting":{columns:{sortOrder:"Sortierung"},messages:{sortOrderSaved:'Sortierung f\xfcr "{name}" wurde erfolgreich gespeichert',sortOrderError:'Fehler beim Speichern der Sortierung f\xfcr "{name}"'}}}),Shopware.Locale.extend("en-GB",{"vl-custom-sorting":{columns:{sortOrder:"Sort Order"},messages:{sortOrderSaved:'Sort order for "{name}" has been saved successfully',sortOrderError:'Error saving sort order for "{name}"'}}})})();