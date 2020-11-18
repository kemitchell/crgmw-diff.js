const tape = require('tape')
const postorder = require('../postorder')

tape('postorder sanity check', function (test) {
  const tree = {
    label: 'p',
    children: [{ label: 'a' }, { label: 'b' }, { label: 'c' }]
  }
  const order = []
  postorder(tree, function (node) { order.push(node.label) })
  test.deepEqual(order, ['a', 'b', 'c', 'p'], 'expected order')
  test.end()
})
