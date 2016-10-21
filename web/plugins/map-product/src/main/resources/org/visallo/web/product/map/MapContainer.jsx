define([
    'react',
    'react-redux',
    'react-dom',
    'data/web-worker/store/selection/actions',
    'data/web-worker/store/product/actions',
    'components/DroppableHOC',
    './Map'
], function(React, redux, ReactDom, selectionActions, productActions, DroppableHOC, Map) {
    'use strict';

    const mimeTypes = [VISALLO_MIMETYPES.ELEMENTS];

    return redux.connect(

        (state, props) => {
            var viewport = state.product.viewports[props.product.id],
                selection = state.selection.idsByType,
                workspaceId = state.workspace.currentId,
                ontologyProperties = state.ontology.properties,
                configProperties = state.configuration.properties,
                pixelRatio = state.screen.pixelRatio,
                elements = state.element[workspaceId] || {};


            // FIXME: don't re-render if elements not in product change

            return {
                ...props,
                selection,
                configProperties,
                ontologyProperties,
                viewport,
                pixelRatio,
                elements,
                mimeTypes,
                style: { height: '100%' }
            }
        },

        (dispatch, props) => {
            return {
                onSelectElements: (selection) => dispatch(selectionActions.set(selection)),

                onUpdatePreview: (id, dataUrl) => dispatch(productActions.updatePreview(id, dataUrl)),

                // TODO: these should be mapActions
                onUpdateViewport: (id, { pan, zoom }) => dispatch(productActions.updateViewport(id, { pan, zoom })),

                // For DroppableHOC
                onDrop: (event) => {
                    const dataStr = event.dataTransfer.getData(VISALLO_MIMETYPES.ELEMENTS);
                    if (dataStr) {
                        event.preventDefault();
                        event.stopPropagation();

                        const data = JSON.parse(dataStr);
                        // TODO: mapActions
                        dispatch(productActions.dropElements(props.product.id, data.elements))
                    }
                },

                onVertexMenu: (element, vertexId, position) => {
                    $(element).trigger('showVertexContextMenu', { vertexId, position });
                }
            }
        }

    )(DroppableHOC(Map));
});
