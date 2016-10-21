define([
    'data/web-worker/store/actions',
    'data/web-worker/util/ajax',
    'data/web-worker/store/user/actions-impl'
], function(actions, ajax, userActions) {
    actions.protectFromMain();

    const GRAPH_SNAP_TO_GRID = 175;
    const GRAPH_SNAP_TO_GRID_Y = 75;
    const GRAPH_NODE_HEIGHT = 100;

    const api = {
        snapToGrid: ({ snap }) => (dispatch, getState) => {
            const state = getState();
            const productId = state.product.selected;
            if (productId) {
                const product = _.findWhere(state.product.items, { id: productId });
                if (product && product.extendedData && snap) {
                    const updateVertices = _.object(product.extendedData.vertices.map(vPos => {
                        return [vPos.id, snapPosition(vPos.pos)]
                    }));
                    dispatch(api.setPositions({ productId, updateVertices }));
                }

                dispatch(userActions.setUserPreference('snapToGrid', String(snap)));
            }
        },

        setPositions: ({ productId, updateVertices }) => (dispatch) => {
            dispatch({
                type: 'PRODUCT_GRAPH_SET_POSITIONS',
                payload: {
                    productId,
                    updateVertices
                }
            })
            ajax('POST', '/product', { productId, params: { updateVertices } });
        },

        updatePositions: ({ productId, updateVertices }) => (dispatch, getState) => {
            if (!_.isEmpty(updateVertices)) {
                const state = getState();
                const product = _.findWhere(state.product.items, { id: productId });
                const snapToGrid = state.user.current.uiPreferences.snapToGrid === 'true';
                const params = snapToGrid ?
                    { updateVertices: _.mapObject(updateVertices, p => snapPosition(p)) } :
                    { updateVertices };
                dispatch(api.setPositions({ productId, updateVertices: params.updateVertices }));
            }
        },

        dropElements: ({ productId, elements, position }) => (dispatch, getState) => {
            const { vertexIds, edgeIds } = elements;
            // TODO: get edges from store first
            var edges = (edgeIds && edgeIds.length) ? (
                ajax('POST', '/edge/multiple', { edgeIds })
                    .then(function({ edges }) {
                        return _.flatten(edges.map(e => [e.inVertexId, e.outVertexId]));
                    })
                ) : Promise.resolve([]);

            edges.then(function(edgeVertexIds) {
                const product = _.findWhere(getState().product.items, { id: productId });
                const combined = _.without(_.uniq(edgeVertexIds.concat(vertexIds)), ..._.pluck(product.extendedData.vertices, 'id'));
                if (!combined.length) return;
                const xInc = 175;
                const yInc = 75;
                const maxX = Math.round(Math.sqrt(combined.length)) * xInc;

                var currentPosition;
                const nextPosition = () => {
                    if (currentPosition) {
                        currentPosition.x += xInc;
                        if ((currentPosition.x - position.x) > maxX) {
                            currentPosition.x = position.x;
                            currentPosition.y += yInc;
                        }
                    } else {
                        currentPosition = {...position} || { x: 0, y: 0 };
                    }
                    return {...currentPosition}
                };

                dispatch(api.updatePositions({
                    productId,
                    updateVertices: _.object(combined.map(id => [id, nextPosition()]))
                }))
            })
        },
    };

    return api;

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
})
