var treeCrawl = require('tree-crawl')
var childrenOf = require('./children-of')

module.exports = function (tree, iterator) {
  treeCrawl(tree, iterator, {order: 'post', getChildren: childrenOf})
}
