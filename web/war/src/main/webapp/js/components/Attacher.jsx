define([
    'react',
    'util/component/attacher'
], function(React, attacher) {
    'use strict';

    const PropTypes = React.PropTypes;
    const Attacher = React.createClass({

        propTypes: {
            componentPath: PropTypes.string.isRequired
        },

        componentDidMount() {
            this.attacher = attacher()
                .node(this.refs.node)
                .path(this.props.componentPath)
                .params(this.props);

            this.attacher.attach({ teardown: true, empty: true })
        },

        componentWillUnmount() {
            this.attacher.teardown();
        },

        render() {
            return <div ref="node" />;
        }
    });

    return Attacher;
});
