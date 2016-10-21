require(['configuration/plugins/registry'], function(registry) {
    registry.registerExtension('org.visallo.workproduct', {
        identifier: 'org.visallo.web.product.graph.GraphWorkProduct',
        componentPath: 'org/visallo/web/product/graph/dist/Graph'
    })
});
