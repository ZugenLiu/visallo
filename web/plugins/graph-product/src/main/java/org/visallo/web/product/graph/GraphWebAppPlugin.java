package org.visallo.web.product.graph;

import com.v5analytics.webster.Handler;
import org.visallo.web.WebApp;
import org.visallo.web.WebAppPlugin;

import javax.servlet.ServletContext;

public class GraphWebAppPlugin implements WebAppPlugin {
    @Override
    public void init(WebApp app, ServletContext servletContext, Handler authenticationHandler) {

        app.registerJavaScript("/org/visallo/web/product/graph/plugin.js");
        app.registerJavaScript("/org/visallo/web/product/graph/betterGrid.js", false);
        app.registerJavaScriptComponent("/org/visallo/web/product/graph/GraphContainer.jsx");
        app.registerJavaScriptComponent("/org/visallo/web/product/graph/Graph.jsx");
        app.registerJavaScriptComponent("/org/visallo/web/product/graph/Menu.jsx");
        app.registerJavaScriptComponent("/org/visallo/web/product/graph/Cytoscape.jsx");

        app.registerJavaScriptComponent("/org/visallo/web/product/graph/options/EdgeLabel.jsx");
        app.registerJavaScriptComponent("/org/visallo/web/product/graph/options/SnapToGrid.jsx");

        app.registerResourceBundle("/org/visallo/web/product/graph/messages.properties");
    }
}
