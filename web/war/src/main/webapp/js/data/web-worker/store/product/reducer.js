define(['updeep'], function(updeep) {
    'use strict';

    return function product(state, { type, payload }) {
        if (!state) return { loading: false, selected: null, types: [], items: [], viewports: {}, error: null };

        switch (type) {
            case 'PRODUCT_LIST': return updateList(state, payload)
            case 'PRODUCT_UPDATE_TYPES': return { ...state, types: payload.types }

            case 'PRODUCT_SELECT': return { ...state, selected: payload.productId }
            case 'PRODUCT_UPDATE': return { ...state, items: updateOrAddItem(state.items, payload.product) }
            case 'PRODUCT_PREVIEW_UPDATE': return { ...state, items: updatePreview(state.items, payload) }
            case 'PRODUCT_REMOVE': return { ...state, items: removeItem(state.items, payload.productId) }

            case 'PRODUCT_UPDATE_VIEWPORT': return { ...state, viewports: updateItemViewport(state.viewports, payload) }
        }

        return state;
    }

    function updatePreview(items, { productId, md5 }) {
        const item = _.findWhere(items, { id: productId });
        if (item) {
            return sort([..._.reject(items, (i) => i.id === productId), {...item, previewMD5: md5 }]);
        }
        return items;
    }

    function updateList(state, { loading, items }) {
        const sortedItems = sort(items);
        return updeep({ items: sortedItems, loading }, state)
    }

    function sort(products) {
        return _.sortBy(products, 'title')
    }

    function hydrateExtendedData(item) {
        if (item.extendedData && _.isString(item.extendedData)) {
            return { ...item, extendedData: JSON.parse(item.extendedData) };
        }
        return item;
    }

    function updateOrAddItem(list, item) {
        item = hydrateExtendedData(item);
        var updated = false,
            items = list.map(i => {
                if (i.id === item.id) {
                    updated = true
                    return item;
                }
                return i
            });

        if (!updated) items.push(item)
        return sort(items)
    }

    function removeItem(list, id) {
        return _.reject(list, (item) => item.id === id)
    }

    function updateItemViewport(viewports, { productId, ...viewport }) {
        var existingViewport = viewports[productId];

        if (existingViewport) {
            const eq = (a, b) => Math.abs(b - a) <= 0.001;
            const { pan, zoom } = existingViewport
            var equal = true;
            if (_.isArray(viewport.pan)) {
                equal = eq(pan[0], viewport.pan[0]) && eq(pan[1], viewport.pan[1])
            } else {
                equal = eq(pan.x, viewport.x) && eq(pan.y, viewport.y);
            }
            if (equal && eq(zoom, viewport.zoom)) {
                return viewports
            }
        }

        return { ...viewports, [productId]: viewport };
    }
});
