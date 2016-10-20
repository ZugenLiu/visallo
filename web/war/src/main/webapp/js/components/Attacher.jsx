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

        getInitialState() {
            return { Component: null, isFlight: false }
        },

        componentDidMount() {
            //Promise.require(this.props.componentPath)
                //.then(Component => {
                    //this.setState({ Component, isFlight: _.isFunction(Component.attachTo) })
                //})
            this.attacher = attacher()
                .node(this.refs.node)
                .path(this.props.componentPath)
                .params(this.props);

            this.attacher.attach({ teardown: true, empty: true })
        },

        componentWillUnmount() {
            this.attacher.teardown();
            //const { Component, isFlight } = this.state;
            //if (Component && isFlight) {
                //const results = registry.findInstanceInfoByNode(this.refs.node);
                //for (let i = 0; i < results.length; ++i) {
                    //if (results[i].instance.constructor === Component) {
                        //results[i].instance.teardown();
                    //}
                //}
            //}
        },

        //componentDidUpdate() {
            //const { Component, isFlight } = this.state;
            //const { componentPath, ...props } = this.props;

            //if (Component && isFlight) {
                //Component.attachTo(this.refs.node, { ...props });
            //}
        //},

        render() {
            /*
            const { Component, isFlight } = this.state;
            const { componentPath, ...props } = this.props;

            if (Component) {
                if (isFlight) {
                    return <div ref="node" />
                } else {
                    return <Component {...props} />;
                }
            }
            */

            return <div ref="node" />;
        }
    });

    return Attacher;
});
