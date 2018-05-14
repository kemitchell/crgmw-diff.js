var tape = require('tape')
var postorder = require('../postorder')

tape('postorder', function (suite) {
  suite.test('sanity check', function (test) {
    var tree = {
      label: 'p',
      children: [{label: 'a'}, {label: 'b'}, {label: 'c'}]
    }
    var order = []
    postorder(tree, function (node) { order.push(node.label) })
    test.deepEqual(order, ['a', 'b', 'c', 'p'], 'expected order')
    test.end()
  })
})
