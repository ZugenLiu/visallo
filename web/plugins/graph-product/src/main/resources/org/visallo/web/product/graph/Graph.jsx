define([
    'react',
    './Cytoscape',
    'util/vertex/formatters',
], function(React, Cytoscape, F) {
    'use strict';

    const PropTypes = React.PropTypes;
    const noop = function() {};
    const Graph = React.createClass({

        propTypes: {
            onUpdatePreview: PropTypes.func.isRequired,
            onVertexMenu: PropTypes.func
        },

        getDefaultProps() {
            return {
                onVertexMenu: noop
            }
        },

        getInitialState() {
            return { viewport: this.props.viewport || {}, generatePreview: true }
        },

        saveViewport(props) {
            var productId = this.props.product.id;
            if (this.currentViewport && productId in this.currentViewport) {
                var viewport = this.currentViewport[productId];
                props.onUpdateViewport(productId, viewport);
            }
        },

        componentDidMount() {
            this.cyNodeIdsWithPositionChanges = {};
        },

        componentWillReceiveProps(nextProps) {
            if (nextProps.product.id === this.props.product.id) {
                this.setState({ viewport: {}, generatePreview: false })
            } else {
                this.saveViewport(nextProps)
                this.setState({ viewport: nextProps.viewport || {}, generatePreview: true })
            }
        },

        componentWillUnmount() {
            this.saveViewport(this.props)
        },

        render() {
            var { viewport, generatePreview } = this.state,
                config = {...CONFIGURATION(this.props), ...viewport},
                events = {
                    onSelect: this.onSelect,
                    onUnselect: this.onUnselect,
                    onFree: this.onFree,
                    onLayoutStop: this.onLayoutStop,
                    onPosition: this.onPosition,
                    onTap: this.onTap,
                    onContextTap: this.onContextTap,
                    onPan: this.onViewport,
                    onZoom: this.onViewport
                };
            return (
                <div style={{ height: '100%' }}>
                    <Cytoscape
                        ref="cytoscape"
                        {...events}
                        generatePreview={generatePreview}
                        config={config}
                        elements={this.mapPropsToElements()}
                        onCreateVertex={this.onCreateVertex}
                        onUpdatePreview={this.onUpdatePreview}></Cytoscape>
                </div>
            )
        },

        onCreateVertex(position) {
            // TODO: privilieges
            //if (Privileges.canEDIT) {
            require(['util/popovers/fileImport/fileImport'], (CreateVertex) => {
                CreateVertex.attachTo(this.refs.cytoscape.state.cy.container(), {
                    anchorTo: { page: position }
                });
            });
            //}
        },

        onUpdatePreview(data) {
            this.props.onUpdatePreview(this.props.product.id, data)
        },

        droppableTransformPosition(rpos) {
            const cy = this.refs.cytoscape.state.cy;
            const pan = cy.pan();
            const zoom = cy.zoom();
            return {
                x: (rpos.x - pan.x) / zoom,
                y: (rpos.y - pan.y) / zoom
            };
        },

        onTap(event) {
            const { cy, cyTarget } = event;
            if (event.originalEvent.ctrlKey) {
                this.onContextTap(event);
            } else if (!event.originalEvent.shiftKey && cy === cyTarget) {
                this.props.onClearSelection();
            }
        },

        onContextTap(event) {
            const { cyTarget, cy, originalEvent } = event;
            // TODO: show all selected objects if not on item
            if (cyTarget !== cy) {
                const { pageX, pageY } = originalEvent;
                this.props.onVertexMenu(originalEvent.target, cyTarget.id(), { x: pageX, y: pageY });
            }
        },

        onSelect({ cy, cyTarget }) {
            this.coalesceSelection('add', cyTarget.isNode() ? 'vertices' : 'edges', cyTarget.id());
        },

        onUnselect({ cy, cyTarget }) {
            this.coalesceSelection('remove', cyTarget.isNode() ? 'vertices' : 'edges', cyTarget.id());
        },

        onLayoutStop() {
            this.sendPositionUpdates();
        },

        onFree() {
            this.sendPositionUpdates();
        },

        sendPositionUpdates() {
            if (!_.isEmpty(this.cyNodeIdsWithPositionChanges)) {
                this.props.onUpdatePositions(
                    this.props.product.id,
                    _.mapObject(this.cyNodeIdsWithPositionChanges, (cyNode, id) => cyNode.position())
                );
                this.cyNodeIdsWithPositionChanges = {};
            }
        },

        onPosition({ cyTarget }) {
            var id = cyTarget.id();
            this.cyNodeIdsWithPositionChanges[id] = cyTarget;
        },

        onViewport({ cy }) {
            var zoom = cy.zoom(), pan = cy.pan();
            if (!this.currentViewport) this.currentViewport = {};
            this.currentViewport[this.props.product.id] = { zoom, pan: {...pan} };
        },

        mapPropsToElements() {
            var { selection, product, elements } = this.props,
                elementVertices = elements.vertices,
                elementEdges = elements.edges,
                verticesSelectedById = selection.vertices,
                edgesSelectedById = selection.edges,
                data = this.props.product.extendedData,
                { vertices, edges } = data,
                cyElements = {
                    nodes: vertices.map(({ id, pos }) => ({
                        data: mapVertexToData(id, elementVertices),
                        classes: mapVertexToClasses(id, elementVertices),
                        position: pos,
                        selected: (id in verticesSelectedById)
                    })),
                    edges: edges.map(({ edgeId, outVertexId, inVertexId }) => ({
                        data: {
                            id: edgeId,
                            source: outVertexId,
                            target: inVertexId
                        },
                        selected: (edgeId in edgesSelectedById)
                    }))
                };

            if (elements.dragging) {
                cyElements.nodes = cyElements.nodes.concat(elements.dragging.ids.vertexIds.map((id) => {
                    return {
                        data: mapVertexToData(id, elementVertices),
                        selected: false,
                        classes: '', //mapVertexToClasses(id, elementVertices),
                        renderedPosition: elements.dragging.position
                    }
                }))
            }

            return cyElements;
        },

        coalesceSelection(action, type, id) {
            if (!this._queuedSelection) {
                this._queuedSelection = { add: {vertices: {}, edges: {}}, remove: {vertices: {}, edges: {}} };
                this._queuedSelectionTrigger = _.debounce(() => {
                    this.props.onSetSelection({
                        vertices: Object.keys(this._queuedSelection.add.vertices),
                        edges: Object.keys(this._queuedSelection.add.edges)
                    })
                }, 100);
            }

            this._queuedSelection[action][type][id] = true;

            if (action === 'add') {
                delete this._queuedSelection.remove[type][id]
            } else {
                delete this._queuedSelection.add[type][id]
            }

            this._queuedSelectionTrigger();
        }
    });

    const mapVertexToClasses = (id, vertices) => {
        if (id in vertices) {
            return 'v'
        }
    };
    const mapVertexToData = (id, vertices) => {
        if (id in vertices) {
            const vertex = vertices[id];
            var truncatedTitle = F.string.truncate(F.vertex.title(vertex), 3);
            return {
                id: vertex.id,
                previousTruncated: truncatedTitle,
                truncatedTitle: truncatedTitle,
                conceptType: F.vertex.prop(vertex, 'conceptType'),
                imageSrc: F.vertex.image(vertex, null, 150),
                selectedImageSrc: F.vertex.selectedImage(vertex, null, 150)
            };
        } else {
            return { id }
        }
    };
    const GENERIC_SIZE = 30;
    const CUSTOM_IMAGE_SIZE = 50;
    const IMAGE_ASPECT_RATIO = 4 / 3;
    const VIDEO_ASPECT_RATIO = 19 / 9;
    const CONFIGURATION = (props) => {
        const { pixelRatio } = props;
        return {
            minZoom: 1 / 16,
            maxZoom: 6,
            hideEdgesOnViewport: false,
            hideLabelsOnViewport: false,
            textureOnViewport: true,
            boxSelectionEnabled: true,
            panningEnabled: true,
            userPanningEnabled: true,
            zoomingEnabled: true,
            userZoomingEnabled: true,
            style: [
                {
                    selector: 'core',
                    css: {
                        'outside-texture-bg-color': '#efefef'
                    }
                },
                {
                    selector: 'node',
                    css: {
                        'background-color': '#ccc',
                        'background-fit': 'contain',
                        'border-color': 'white',
                        'font-family': 'helvetica',
                        'font-size': 18 * pixelRatio,
                        'min-zoomed-font-size': 4,
                        'text-events': 'yes',
                        'text-outline-color': 'white',
                        'text-outline-width': 2,
                        'text-halign': 'center',
                        'text-valign': 'bottom',
                        content: 'Loading…',
                        opacity: 1,
                        color: '#999',
                        height: GENERIC_SIZE * pixelRatio,
                        shape: 'roundrectangle',
                        width: GENERIC_SIZE * pixelRatio
                    }
                },
                {
                    selector: 'node.v',
                    css: {
                        'background-color': '#fff',
                        'background-image': 'data(imageSrc)',
                        content: 'data(truncatedTitle)',
                    }
                },
                {
                    selector: 'node:selected',
                    css: {
                        'background-color': '#0088cc',
                        'border-color': '#0088cc',
                        'border-width': 2 * pixelRatio,
                        color: '#0088cc'
                    }
                },
                {
                    selector: 'node[selectedImageSrc]:selected',
                    css: {
                        'background-image': 'data(selectedImageSrc)'
                    }
                },
                {
                    selector: 'node.decorationParent',
                    css: {
                        'background-image': 'none',
                        'compound-sizing-wrt-labels': 'exclude'
                    }
                },
                {
                    selector: 'node.decorationParent:active',
                    css: {
                        'background-color': 'none',
                        'background-opacity': 0,
                        'overlay-color': 'none',
                        'overlay-padding': 0,
                        'overlay-opacity': 0,
                        'border-width': 0
                    }
                },
                {
                    selector: 'node.decoration',
                    css: {
                        'background-color': '#F89406',
                        'background-image': 'none',
                        'border-width': 2,
                        'border-style': 'solid',
                        'border-color': '#EF8E06',
                        'text-halign': 'center',
                        'text-valign': 'center',
                        'font-size': 20,
                        color: 'white',
                        'text-outline-color': 'none',
                        'text-outline-width': 0,
                        content: 'data(label)',
                        events: 'no',
                        shape: 'roundrectangle',
                        'padding-left': 5,
                        'padding-right': 5,
                        'padding-top': 3,
                        'padding-bottom': 3,
                        width: 'label',
                        height: 'label'
                    }
                },
                {
                    selector: 'node.decoration.hidden',
                    css: {
                        display: 'none'
                    }
                },
                {
                    selector: 'node.video',
                    css: {
                        shape: 'rectangle',
                        width: (CUSTOM_IMAGE_SIZE * pixelRatio) * VIDEO_ASPECT_RATIO,
                        height: (CUSTOM_IMAGE_SIZE * pixelRatio) / VIDEO_ASPECT_RATIO
                    }
                },
                {
                    selector: 'node.image',
                    css: {
                        shape: 'rectangle',
                        width: (CUSTOM_IMAGE_SIZE * pixelRatio) * IMAGE_ASPECT_RATIO,
                        height: (CUSTOM_IMAGE_SIZE * pixelRatio) / IMAGE_ASPECT_RATIO
                    }
                },
                {
                    selector: 'node.hasCustomGlyph',
                    css: {
                        width: CUSTOM_IMAGE_SIZE * pixelRatio,
                        height: CUSTOM_IMAGE_SIZE * pixelRatio
                    }
                },
                {
                    selector: 'node.hover',
                    css: {
                        opacity: 0.6
                    }
                },
                {
                    selector: 'node.focus',
                    css: {
                        color: '#00547e',
                        'font-weight': 'bold',
                        'overlay-color': '#a5e1ff',
                        'overlay-padding': 10 * pixelRatio,
                        'overlay-opacity': 0.5
                    }
                },
                {
                    selector: 'edge.focus',
                    css: {
                        'overlay-color': '#a5e1ff',
                        'overlay-padding': 7 * pixelRatio,
                        'overlay-opacity': 0.5
                    }
                },
                {
                    selector: 'node.temp',
                    css: {
                        'background-color': 'rgba(255,255,255,0.0)',
                        'background-image': 'none',
                        width: '1',
                        height: '1'
                    }
                },
                {
                    selector: 'node.controlDragSelection',
                    css: {
                        'border-width': 5 * pixelRatio,
                        'border-color': '#a5e1ff'
                    }
                },
                {
                    selector: 'edge:selected',
                    css: {
                        'line-color': '#0088cc',
                        color: '#0088cc',
                        'target-arrow-color': '#0088cc',
                        'source-arrow-color': '#0088cc',
                        width: 4 * pixelRatio
                    }
                },
                {
                    selector: 'edge',
                    css: {
                        'font-size': 11 * pixelRatio,
                        'target-arrow-shape': 'triangle',
                        color: '#aaa',
                        content: visalloData.currentUser.uiPreferences.edgeLabels !== 'false' ?
                            'data(label)' : '',
                        //'curve-style': 'haystack',
                        'min-zoomed-font-size': 3,
                        'text-outline-color': 'white',
                        'text-outline-width': 2,
                        width: 2.5 * pixelRatio
                    }
                },
                {
                    selector: 'edge.label',
                    css: {
                        content: 'data(label)',
                        'font-size': 12 * pixelRatio,
                        color: '#0088cc',
                        'text-outline-color': 'white',
                        'text-outline-width': 4
                    }
                },
                {
                    selector: 'edge.path-hidden-verts',
                    css: {
                        'line-style': 'dashed',
                        content: 'data(label)',
                        'font-size': 16 * pixelRatio,
                        color: 'data(pathColor)',
                        'text-outline-color': 'white',
                        'text-outline-width': 4
                    }
                },
                {
                    selector: 'edge.path-edge',
                    css: {
                        'line-color': 'data(pathColor)',
                        'target-arrow-color': 'data(pathColor)',
                        'source-arrow-color': 'data(pathColor)',
                        width: 4 * pixelRatio
                    }
                },
                {
                    selector: 'edge.temp',
                    css: {
                        width: 4,
                        'line-color': '#0088cc',
                        'line-style': 'dotted',
                        'target-arrow-color': '#0088cc'
                    }
                }
            ]
        }
    };

    return Graph;
});
