const treeCrawl = require('tree-crawl')
const childrenOf = require('./children-of')

module.exports = function (tree, iterator) {
  treeCrawl(tree, iterator, { order: 'bfs', getChildren: childrenOf })
}
