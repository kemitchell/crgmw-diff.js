var ABC = require('./abc')
var diff = require('../')
var tape = require('tape')

tape.test('diff identical trees', function (t) {
  var left = JSON.parse(JSON.stringify(ABC))
  var right = JSON.parse(JSON.stringify(ABC))
  var result = diff(left, right)
  t.deepEqual(result.editScript, [])
  t.end()
})

tape.test('diff renamed key', function (t) {
  var left = JSON.parse(JSON.stringify(ABC))
  var right = JSON.parse(JSON.stringify(ABC))
  right.children[0].label.value = 'x'
  var expected = [
    {
      operation: 'update',
      node: left.children[0],
      value: 'x'
    }
  ]
  var result = diff(left, right)
  t.deepEqual(result.editScript, expected)
  t.end()
})
