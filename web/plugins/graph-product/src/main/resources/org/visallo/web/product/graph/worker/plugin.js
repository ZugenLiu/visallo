define(['configuration/plugins/registry', 'updeep'], function(registry, updeep) {

    registry.registerExtension('org.visallo.store', {
        key: 'product',
        reducer: function(state, { type, payload }) {
            switch (type) {
                case 'PRODUCT_GRAPH_SET_POSITIONS':
                    return updatePositions(state, payload);
            }

            return state;
        }
    })

    function updatePositions(state, { productId, updateVertices }) {
        const index = _.findIndex(state.items, { id: productId });
        const product = index >= 0 ? state.items[index] : null;

        if (product && product.extendedData && product.extendedData.vertices) {
            return updeep.updateIn(
                `items.${index}.extendedData.vertices.*`,
                function(vertexPosition) {
                    if (vertexPosition.id in updateVertices) {
                        return {
                            id: vertexPosition.id,
                            pos: updateVertices[vertexPosition.id]
                        }
                    }
                    return vertexPosition;
                },
                state
            );
        }

        return state;
    }

    /*
    function snapPosition(p) {
        return {
            x: snapCoordinate(p.x, GRAPH_SNAP_TO_GRID),
            y: snapCoordinate(p.y, GRAPH_SNAP_TO_GRID_Y) + (GRAPH_SNAP_TO_GRID_Y - GRAPH_NODE_HEIGHT) / 2
        }
    }

    function snapCoordinate(value, snap) {
        var rounded = Math.round(value),
            diff = (rounded % snap),
            which = snap / 2;

        if (rounded < 0 && Math.abs(diff) < which) return rounded - diff;
        if (rounded < 0) return rounded - (snap + diff);
        if (diff < which) return rounded - diff;

        return rounded + (snap - diff)
    }
    */
});
