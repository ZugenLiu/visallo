define([
    'react'
], function(React) {
    'use strict';

    const preferenceName = 'snapToGrid';
    const SnapToGrid = React.createClass({
        onChange(event) {
            const checked = event.target.checked;
            $(event.target).trigger('toggleSnapToGrid', {
                snapToGrid: checked
            });
            this.updatePreference(checked);
        },

        componentDidMount() {
            $(document).on('toggleSnapToGrid', this.onToggleSnapToGrid)
        },

        componentWillUnmount() {
            $(document).off('toggleSnapToGrid', this.onToggleSnapToGrid)
        },

        render() {
            const preferenceValue = visalloData.currentUser.uiPreferences[preferenceName];
            const snapToGrid = preferenceValue !== 'false';

            return (
                <label>{i18n('controls.options.snapToGrid.toggle')}
                    <input onChange={this.onChange} type="checkbox" defaultChecked={snapToGrid} />
                </label>
            )
        },

        updatePreference(checked) {
            visalloData.currentUser.uiPreferences[preferenceName] = '' + checked;
            this.props.visalloApi.v1.dataRequest('user', 'preference', preferenceName, checked);
        },

        onToggleSnapToGrid(event, data) {
            if (!data) return;

            var checked = data.snapToGrid;
            this.updatePreference(checked);
            this.forceUpdate();
        }
    });

    return SnapToGrid;
});

