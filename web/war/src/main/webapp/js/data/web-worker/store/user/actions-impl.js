define(['../actions'], function(actions) {
    actions.protectFromMain();

    return {
        putUser: ({ user }) => ({
            type: 'USER_PUT',
            payload: { user }
        }),

        putUserPreferences: ({ preferences }) => ({
            type: 'USER_PUT_PREFS',
            payload: { preferences }
        }),

        putUserPreference: (name, value) => ({
            type: 'USER_PUT_PREF',
            payload: { name, value }
        })

    }
})
