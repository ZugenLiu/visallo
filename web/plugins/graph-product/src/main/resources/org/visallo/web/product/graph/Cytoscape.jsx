define([
    'react',
    'cytoscape',
    'fast-json-patch',
    'components/NavigationControls',
    './betterGrid',
    './Menu'
], function(
    React,
    cytoscape,
    jsonpatch,
    NavigationControls,
    betterGrid,
    Menu) {
    const { PropTypes } = React;
    const ANIMATION = { duration: 400, easing: 'spring(250, 20)' };
    const DEFAULT_PNG = Object.freeze({
        bg: 'white',
        full: true,
        maxWidth: 300,
        maxHeight: 300
    });
    const LAYOUT_OPTIONS = {
        // Customize layout options
        random: { padding: 10 },
        arbor: { friction: 0.6, repulsion: 5000, targetFps: 60, stiffness: 300 },
        breadthfirst: {
            roots: function(nodes, options) {
                if (options && options.onlySelected) {
                    return [];
                }
                return nodes.roots().map(function(n) { return n.id(); })
            },
            directed: false,
            circle: false,
            maximalAdjustments: 10
        }
    };
    const PREVIEW_DEBOUNCE_SECONDS = 3;
    const EVENTS = {
        drag: 'onDrag',
        free: 'onFree',
        grab: 'onGrab',
        position: 'onPosition',
        layoutstop: 'onLayoutStop',
        tap: 'onTap',
        cxttap: 'onContextTap',
        pan: 'onPan',
        zoom: 'onZoom',
        fit: 'onFit',
        change: 'onChange',
        select: 'onSelect',
        unselect: 'onUnselect'
    };
    const eventPropTypes = {};
    _.each(EVENTS, propKey => { eventPropTypes[propKey] = PropTypes.func })
    const zoomAcceleration = 5.0;
    const zoomDamping = 0.8;

    const isEdge = data => (data.source !== undefined)
    const isNode = _.negate(isEdge)

    const Cytoscape = React.createClass({

        propTypes: {
            generatePreview: PropTypes.bool,
            ...eventPropTypes
        },

        getDefaultProps() {
            const eventProps = _.mapObject(_.invert(EVENTS), () => () => {})
            return {
                ...eventProps,
                onReady() {},
                generatePreview: false,
                fit: false,
                animate: true,
                config: {},
                elements: { nodes: [], edges: [] },
            }
        },

        getInitialState() {
            return { showGraphMenu: false, moving: {} };
        },

        componentDidMount() {
            this.updatePreview = _.debounce(this._updatePreview, PREVIEW_DEBOUNCE_SECONDS * 1000)
            this.previousConfig = this.prepareConfig();
            const cy = cytoscape(this.previousConfig);

            cytoscape('layout', 'bettergrid', betterGrid);

            this.setState({ cy })

            cy.on('add remove select unselect position data', () => this.updatePreview());
        },

        componentWillUnmount() {
            if (this.state.cy) {
                this.state.cy.destroy();
                this.unmounted = true;
            }
        },

        componentDidUpdate() {
            const { cy } = this.state;
            const newData = {elements: this.props.elements}
            const oldData = cy.json()

            // Create copies of objects because cytoscape mutates :(
            const getAllData = nodes => nodes.map(({data, selected, position, renderedPosition, classes}) => ({
                data: {...data},
                selected,
                classes,
                position: position && {...position},
                renderedPosition: renderedPosition && {...renderedPosition}
            }))
            const getTypeData = elementType => [oldData, newData].map(n => getAllData(n.elements[elementType] || []) )
            const [oldNodes, newNodes] = getTypeData('nodes')
            const [oldEdges, newEdges] = getTypeData('edges')

            this.updateConfiguration(this.previousConfig, this.props.config);
            cy.batch(() => {
                this.makeChanges(oldNodes, newNodes)
                this.makeChanges(oldEdges, newEdges)
            })
        },

        _updatePreview() {
            if (this.unmounted) return;
            const { cy } = this.state;
            this.props.onUpdatePreview(cy.png(DEFAULT_PNG));
        },

        prepareConfig() {
            const defaults = {
                container: this.refs.cytoscape,
                boxSelectionEnabled: true,
                ready: (event) => {
                    var { cy } = event,
                        eventMap = _.mapObject(EVENTS, (name, key) => (e) => {
                            if (this[key + 'Disabled'] !== true) {
                                this.props[name](e)
                            }
                        });
                    cy.on(eventMap)
                    cy.on('cxttap', (event) => {
                        const {cyTarget, cy} = event;
                        if (cy === cyTarget) {
                            this.setState({ showGraphMenu: event })
                        }
                    })
                    this.props.onReady(event)
                }
            }
            var { config } = this.props;
            if (config) {
                return { ...defaults, ...config }
            }
            return defaults;
        },

        render() {
            const { showGraphMenu } = this.state;
            const menu = showGraphMenu ? (
                <Menu event={showGraphMenu}
                    onEvent={this.onMenu}
                    cy={this.state.cy}/>
            ) : null;

            return (
                <div onMouseDown={this.onMouseDown} style={{height: '100%'}}>
                    <div style={{height: '100%'}} ref="cytoscape"></div>
                    <NavigationControls
                        onFit={this.onControlsFit}
                        onZoom={this.onControlsZoom}
                        onPan={this.onControlsPan} />
                    {menu}
                </div>
            )

        },

        onMouseDown(event) {
            if (this.state.showGraphMenu) {
                this.setState({ showGraphMenu: false })
            }
        },

        _zoom(factor, dt) {
            const { cy } = this.state;

            var zoom = cy._private.zoom,
                { width, height } = cy.renderer().containerBB,
                pos = cy.renderer().projectIntoViewport(width / 2, height / 2);

            cy.zoom({
                level: zoom + factor * dt,
                position: { x: pos[0], y: pos[1] }
            })
        },

        onMenu(event) {
            this.setState({ showGraphMenu: false })

            const dataset = event.target.dataset;
            const zoom2 = parseFloat(dataset.arg, 10);
            const args = (dataset.args ? JSON.parse(dataset.args) : []).concat([event])
            this[`onMenu${dataset.func}`](...args);
        },

        onMenuZoom(level) {
            const { cy } = this.state;
            const zoom1 = cy._private.zoom;
            const zoom2 = level;
            const pan1 = cy._private.pan;
            const bb = cy.renderer().containerBB;
            const pos = { x: bb.width / 2, y: bb.height / 2 }
            const pan2 = {
                x: -zoom2 / zoom1 * (pos.x - pan1.x) + pos.x,
                y: -zoom2 / zoom1 * (pos.y - pan1.y) + pos.y
            };

            cy.animate({ zoom: zoom2, pan: pan2 }, { ...ANIMATION, queue: false });
        },

        onMenuCreateVertex(event) {
            const { pageX, pageY } = event.target;
            this.props.onCreateVertex({ x: pageX, y: pageY })
        },

        onMenuSelect(select) {
            const { cy } = this.state;

            var nodes = cy.nodes();
            var edges = cy.edges();
            var selectedVertices = nodes.filter(':selected');
            var unselectedVertices = nodes.filter(':unselected');
            var selectedEdges = edges.filter(':selected');
            var unselectedEdges = edges.filter(':unselected');

            switch (select) {
                case 'all':
                    unselectedEdges.select();
                    unselectedVertices.select();
                    break;
                case 'none':
                    selectedVertices.unselect();
                    selectedEdges.unselect();
                    break;
                case 'invert':
                    selectedVertices.unselect();
                    selectedEdges.unselect();
                    unselectedVertices.select();
                    unselectedEdges.select();
                    break;
                case 'vertices':
                    selectedEdges.unselect();
                    unselectedVertices.select();
                    break;
                case 'edges':
                    selectedVertices.unselect();
                    unselectedEdges.select();
                    break;
                default:
                    //var selector = _.findWhere(
                        //registry.extensionsForPoint('org.visallo.graph.selection'),
                        //{ identifier: select }
                    //);
                    //if (selector) {
                        //selector(cy);
                    //}
            }
        },

        onMenuLayout(layout, options) {
            const { cy } = this.state;
            const onlySelected = options && options.onlySelected;
            const elements = onlySelected ? cy.collection(cy.nodes().filter(':selected')) : cy.nodes();

            var opts = {
                name: layout,
                fit: false,
                stop: function() {
                    const updates = _.map(elements.toArray(), node => ({
                        vertexId: node.id(),
                        //graphPosition: retina.pixelsToPoints(vertex.position())
                        graphPosition: node.position()
                    }));
                    console.log(updates);
                    //var updates = elements.$.map(elements || cy.nodes(), function(vertex) {
                        //return {
                            //vertexId: fromCyId(vertex.id()),
                            //graphPosition: retina.pixelsToPoints(vertex.position())
                        //};
                    //});
                    //console.log(updates)
                    //self.trigger('updateWorkspace', {
                        //entityUpdates: updates
                    //});
                    //if (!elements) {
                        //self.fit(cy, null, { animate: true });
                    //}
                },
                ..._.each(LAYOUT_OPTIONS[layout] || {}, function(optionValue, optionName) {
                    if (_.isFunction(optionValue)) {
                        LAYOUT_OPTIONS[layout][optionName] = optionValue(elements, options);
                    }
                }),
                ...options
            };

            if (onlySelected) {
                elements.layout(opts);
            } else {
                cy.layout(opts);
            }

            const ids = _.map(elements, node => node.id())
            this.setState({ moving: _.indexBy([Object.keys(this.state.moving), ...ids]) })
        },

        onControlsZoom(dir) {
            const timeStamp = new Date().getTime();
            var dt = timeStamp - (this.lastTimeStamp || 0);
            var zoomFactor = this.zoomFactor || 0;

            if (dt < 30) {
                dt /= 1000;
                zoomFactor += zoomAcceleration * dt * zoomDamping;
            } else {
                dt = 1;
                zoomFactor = 0.01;
            }
            this.zoomFactor = zoomFactor;
            this.lastTimeStamp = timeStamp;
            this._zoom(zoomFactor * (dir === 'out' ? -1 : 1), dt);
        },

        onControlsPan(pan, options) {
            this.state.cy.panBy(pan);
        },

        onControlsFit() {
            this.fit();
        },

        fit(nodes, options = {}) {
            const { animate = true } = options;
            const { cy } = this.state;
            const cyNodes = nodes || cy.nodes();

            if (cyNodes.size() === 0) {
                cy.reset();
            } else {
                var $$ = cytoscape,
                    bb = cyNodes.boundingBox({ includeLabels: true, includeNodes: true, includeEdges: false }),
                    style = cy.style(),
                    padding = { t: 0, b: 0, l: 0, r: 0 }, // TODO: graphpadding
                    pixelScale = cy.renderer().options.pixelRatio,
                    w = parseFloat(style.containerCss('width')),
                    h = parseFloat(style.containerCss('height')),
                    zoom;

                if (!_.isObject(padding)) {
                    if (!_.isNumber(padding)) padding = 0;
                    padding = { t: padding, r: padding, b: padding, l: padding};
                }
                padding.t = (padding.t || 0);
                padding.r = (padding.r || 0);
                padding.b = (padding.b || 0);
                padding.l = (padding.l || 0);

                if (!isNaN(w) && !isNaN(h)) {
                    zoom = Math.min(1, Math.min(
                        (w - (padding.l + padding.r)) / bb.w,
                        (h - (padding.t + padding.b)) / bb.h
                    ));

                    // Set min and max zoom to fit all items
                    /* TODO: still needed?
                    if (zoom < cy._private.minZoom) {
                        cy._private.minZoom = zoom;
                        cy._private.maxZoom = 1 / zoom;
                    } else {
                        cy._private.minZoom = cy._private.originalMinZoom;
                        cy._private.maxZoom = cy._private.originalMaxZoom;
                    }
                    */

                    if (zoom < cy._private.minZoom) zoom = cy._private.minZoom;
                    if (zoom > cy._private.maxZoom) zoom = cy._private.maxZoom;

                    var position = {
                            x: (w + padding.l - padding.r - zoom * (bb.x1 + bb.x2)) / 2,
                            y: (h + padding.t - padding.b - zoom * (bb.y1 + bb.y2)) / 2
                        },
                        _p = cy._private;

                    if (animate) {
                        return new Promise(function(f) {
                            cy.animate({
                                zoom: zoom,
                                pan: position
                            }, {
                                ...ANIMATION,
                                queue: false,
                                complete: () => {
                                    f();
                                }
                            });
                        })
                    } else {
                        _p.zoom = zoom;
                        _p.pan = position;
                        cy.trigger('pan zoom viewport');
                        cy.notify({ type: 'viewport' });
                    }
                }
            }
        },

        disableEvent(name, fn) {
            var names = name.split(/\s+/);
            names.forEach(name => (this[name + 'Disabled'] = true))
            fn.apply(this)
            names.forEach(name => (this[name + 'Disabled'] = false))
        },

        updateConfiguration(previous, nextConfig) {
            const { cy } = this.state;
            if (previous) {
                let { style, pan, zoom, ...other } = nextConfig
                _.each(other, (val, key) => {
                    if (!(key in previous) || previous[key] !== val) {
                        if (_.isFunction(cy[key])) {
                            cy[key](val)
                        } else console.warn('Unknown configuration key', key, val)
                    }
                })

                if (!_.isEqual(previous.style, style)) {
                    cy.style(style)
                }

                // Set viewport
                if (pan || zoom) {
                    var newViewport = { zoom, pan: {...pan} };
                    if (this.props.animate) {
                        this.panDisabled = this.zoomDisabled = true;
                        cy.stop().animate(newViewport, {
                            ...ANIMATION,
                            queue: false,
                            complete: () => {
                                this.panDisabled = this.zoomDisabled = false;
                            }
                        })
                        return true
                    } else {
                        this.disableEvent('pan zoom', () => cy.viewport(newViewport));
                    }
                }
            }

            this.previousConfig = nextConfig
        },

        makeChanges(older, newer) {
            const cy = this.state.cy
            const add = [];
            const remove = [...older];
            const modify = [];
            const oldById = _.indexBy(older, o => o.data.id);

            newer.forEach(item => {
                var id = item.data.id;
                var existing = oldById[id];
                if (existing) {
                    modify.push({ item, diffs: jsonpatch.compare(existing, item) })
                    var index = _.findIndex(remove, i => i.data.id === id);
                    if (index >= 0) remove.splice(index, 1)
                } else {
                    add.push(item)
                }
            })

            modify.forEach(({ item, diffs }) => {
                const topLevelChanges = _.indexBy(diffs.filter(diff => diff.op !== 'remove'), d => d.path.replace(/^\/([^\/]+).*$/, '$1'))
                Object.keys(topLevelChanges).forEach(change => {
                    const cyNode = cy.getElementById(item.data.id);

                    switch (change) {
                        case 'data':
                            this.disableEvent('data', () => cyNode.removeData().data(item.data))
                            break;

                        case 'selected':
                            if (cyNode.selected() !== item.selected) {
                                this.disableEvent('select unselect', () => cyNode[item.selected ? 'select' : 'unselect']());
                            }
                            break;

                        case 'classes':
                            if (item.classes) {
                                cyNode.classes(item.classes)
                            } else if (!_.isEmpty(cyNode._private.classes)) {
                                cyNode.classes();
                            }
                            break;

                        case 'position':
                            if (!cyNode.grabbed() && !(cyNode.id() in this.state.moving)) {
                                if (this.props.animate) {
                                    this.positionDisabled = true;
                                    cyNode.stop().animate({ position: item.position }, { ...ANIMATION, complete: () => {
                                        this.positionDisabled = false;
                                    }})
                                } else {
                                    this.disableEvent('position', () => cyNode.position(item.position))
                                }
                            }
                            break;

                        case 'renderedPosition':
                            if (!topLevelChanges.position && change) {
                                this.disableEvent('position', () => cyNode.renderedPosition(item.renderedPosition))
                            }
                            break;

                        default:
                            throw new Error('Change not handled: ' + change)
                    }
                })
            })
            add.forEach(item => {
                var { data } = item;

                if (isNode(data)) {
                    cy.add({ ...item, group: 'nodes' })
                } else if (isEdge(data)) {
                    cy.add({ ...item, group: 'edges' })
                }
            })
            remove.forEach(item => {
                const cyNode = cy.getElementById(item.data.id);
                if (cyNode.length && !cyNode.removed()) {
                    cy.remove(cyNode)
                }
            })
        }
    })

    return Cytoscape;
})

