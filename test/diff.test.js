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

tape.test('diff swapped array', function (t) {
  var a = {label: {type: 'string', value: 'a'}}
  var b = {label: {type: 'string', value: 'b'}}
  var left = {
    label: {type: 'array'},
    children: [
      {
        label: indexLabel(0),
        children: [clone(a)]
      },
      {
        label: indexLabel(1),
        children: [clone(b)]
      }
    ]
  }
  var right = {
    label: {type: 'array'},
    children: [
      {
        label: indexLabel(0),
        children: [clone(b)]
      },
      {
        label: indexLabel(1),
        children: [clone(a)]
      }
    ]
  }
  var result = diff(left, right)
  var editScript = result.editScript
  t.equal(editScript.length, 3)
  t.equal(editScript[0].operation, 'move')
  t.equal(editScript[1].operation, 'update')
  t.equal(editScript[2].operation, 'update')
  t.end()
})

function indexLabel (index) {
  return {type: 'index', value: index}
}

function clone (value) {
  return JSON.parse(JSON.stringify(value))
}
