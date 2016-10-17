define([
    'react',
    'util/withContextMenu',
    'util/formatters'
], function(React, withContextMenu, F) {
    'use strict';

    const PropTypes = React.PropTypes;
    const Menu = React.createClass({
        propTypes: {
            event: PropTypes.shape({
                originalEvent: PropTypes.shape({
                    pageX: PropTypes.number,
                    pageY: PropTypes.number
                })
            })
        },
        componentDidMount() {
            const menu = this.refs.menu;
            const mixin = new withContextMenu();
            mixin.$node = $(menu).parent();
            mixin.node = mixin.$node[0];
            mixin.bindContextMenuClickEvent = function() { };
            mixin.toggleMenu({ positionUsingEvent: this.props.event }, $(this.refs.dropdownMenu));
            this.mixin = mixin;
        },
        componentWillReceiveProps(nextProps) {
            this.mixin.toggleMenu({ positionUsingEvent: nextProps.event }, $(this.refs.dropdownMenu));
        },
        render() {
            const { cy } = this.props;
            return (
                <div ref="menu" onMouseDown={e => e.stopPropagation()}>
                <ul ref="dropdownMenu" className="dropdown-menu" role="menu">
                    <li className="requires-EDIT"><a onMouseUp={this.props.onEvent} className="has-shortcut" data-func="CreateVertex" tabIndex="-1" href="#">{i18n('graph.contextmenu.create_vertex')}<span className="shortcut">{F.string.shortcut('alt+n')}</span></a></li>

                    <li className="divider requires-EDIT"></li>

                    <li><a onMouseUp={this.props.onEvent} className="has-shortcut" data-func="FitToWindow" tabIndex="-1" href="#">{i18n('graph.contextmenu.fit_to_window')}<span className="shortcut">{F.string.shortcut('alt+f')}</span></a></li>

                    <li className="dropdown-submenu selectors">
                    <a onMouseUp={this.props.onEvent} tabIndex="-1" href="#">{i18n('graph.contextmenu.select')}</a>
                    <ul className="dropdown-menu">
                        <li><a onMouseUp={this.props.onEvent} className="has-shortcut" data-func="Select" data-args='["all"]' tabIndex="-1" href="#">{i18n('graph.contextmenu.select.all')}<span className="shortcut">{F.string.shortcut('meta+a')}</span></a></li>
                        <li><a onMouseUp={this.props.onEvent} className="has-shortcut" data-func="Select" data-args='["none"]' tabIndex="-1" href="#">{i18n('graph.contextmenu.select.none')}<span className="shortcut">{F.string.shortcut('esc')}</span></a></li>
                        <li><a onMouseUp={this.props.onEvent} data-func="Select" data-args='["invert"]' tabIndex="-1" href="#">{i18n('graph.contextmenu.select.invert')}</a></li>
                        <li><a onMouseUp={this.props.onEvent} data-func="Select" data-args='["vertices"]' tabIndex="-1" href="#">{i18n('graph.contextmenu.select.vertices')}</a></li>
                        <li><a onMouseUp={this.props.onEvent} data-func="Select" data-args='["edges"]' tabIndex="-1" href="#">{i18n('graph.contextmenu.select.edges')}</a></li>
                    </ul>
                    </li>

                    <li className="dropdown-submenu layouts">
                    <a onMouseUp={this.props.onEvent} tabIndex="-1" href="#">{i18n('graph.contextmenu.layout')}</a>
                    <ul className="dropdown-menu">
                        <li><a onMouseUp={this.props.onEvent} data-func="Layout" data-args='["circle", {}]' tabIndex="-1" href="#">{i18n('graph.contextmenu.layout.circle')}</a></li>
                        <li><a onMouseUp={this.props.onEvent} data-func="Layout" data-args='["bettergrid", {}]' tabIndex="-1" href="#">{i18n('graph.contextmenu.layout.grid')}</a></li>
                        <li><a onMouseUp={this.props.onEvent} data-func="Layout" data-args='["breadthfirst", {}]' tabIndex="-1" href="#">{i18n('graph.contextmenu.layout.hierarchical')}</a></li>
                        <li><a onMouseUp={this.props.onEvent} data-func="Layout" data-args='["arbor", {}]' tabIndex="-1" href="#">{i18n('graph.contextmenu.layout.force_directed')}</a></li>
                    </ul>
                    </li>

                    <li className="dropdown-submenu layouts-multi">
                    <a onMouseUp={this.props.onEvent} tabIndex="-1" href="#">{i18n('graph.contextmenu.layout.selection')}</a>
                    <ul className="dropdown-menu">
                        <li><a onMouseUp={this.props.onEvent} data-func="Layout" data-args='["circle",{"onlySelected":true}]' tabIndex="-1" href="#">{i18n('graph.contextmenu.layout.circle')}</a></li>
                        <li><a onMouseUp={this.props.onEvent} data-func="Layout" data-args='["bettergrid", {"onlySelected":true}]' tabIndex="-1" href="#">{i18n('graph.contextmenu.layout.grid')}</a></li>
                        <li><a onMouseUp={this.props.onEvent} data-func="Layout" data-args='["breadthfirst", {"onlySelected":true}]' tabIndex="-1" href="#">{i18n('graph.contextmenu.layout.hierarchical')}</a></li>
                        <li><a onMouseUp={this.props.onEvent} data-func="Layout" data-args='["arbor", {"onlySelected":true}]' tabIndex="-1" href="#">{i18n('graph.contextmenu.layout.force_directed')}</a></li>
                    </ul>
                    </li>

                    <li className="dropdown-submenu">
                    <a onMouseUp={this.props.onEvent} tabIndex="-1" href="#">{i18n('graph.contextmenu.zoom')}</a>
                    <ul className="dropdown-menu">
                        <li><a onMouseUp={this.props.onEvent} onMouseUp={this.props.onEvent} data-func="Zoom" data-args="[2]" tabIndex="-1">{i18n('graph.contextmenu.zoom.x2')}</a></li>
                        <li><a onMouseUp={this.props.onEvent} onMouseUp={this.props.onEvent} data-func="Zoom" data-args="[1]" tabIndex="-1">{i18n('graph.contextmenu.zoom.x1')}</a></li>
                        <li><a onMouseUp={this.props.onEvent} onMouseUp={this.props.onEvent} data-func="Zoom" data-args="[0.5]" tabIndex="-1">{i18n('graph.contextmenu.zoom.half')}</a></li>
                    </ul>
                    </li>

                </ul>
                </div>
            )
        },

    });

    return Menu;
});
