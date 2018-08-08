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

tape.test('diff swapped object', function (t) {
  var a = {label: {type: 'string', value: 'a'}}
  var b = {label: {type: 'string', value: 'b'}}
  var left = {
    label: {type: 'object'},
    children: [
      {
        label: keyLabel('x'),
        children: [clone(a)]
      },
      {
        label: keyLabel('y'),
        children: [clone(b)]
      }
    ]
  }
  var right = {
    label: {type: 'object'},
    children: [
      {
        label: keyLabel('x'),
        children: [clone(b)]
      },
      {
        label: keyLabel('y'),
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

function keyLabel (key) {
  return {type: 'key', value: key}
}

tape.test('diff array append', function (t) {
  var a = {label: {type: 'string', value: 'a'}}
  var b = {label: {type: 'string', value: 'b'}}
  var left = {
    label: {type: 'array'},
    children: [
      {
        label: indexLabel(0),
        children: [clone(a)]
      }
    ]
  }
  var right = {
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
  var result = diff(left, right)
  var editScript = result.editScript
  t.equal(editScript.length, 2)
  t.equal(editScript[0].operation, 'insert')
  t.equal(editScript[0].node.label.type, 'index')
  t.equal(editScript[1].operation, 'insert')
  t.equal(editScript[1].node.label.type, 'string')
  t.end()
})

tape.test('diff array prepend', function (t) {
  var a = {label: {type: 'string', value: 'a'}}
  var b = {label: {type: 'string', value: 'b'}}
  var left = {
    label: {type: 'array'},
    children: [
      {
        label: indexLabel(0),
        children: [clone(b)]
      }
    ]
  }
  var right = {
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
  var result = diff(left, right)
  var editScript = result.editScript
  t.equal(editScript.length, 3)
  t.equal(editScript[0].operation, 'insert')
  t.equal(editScript[0].node.label.type, 'index')
  t.equal(editScript[1].operation, 'update')
  t.equal(editScript[2].operation, 'insert')
  t.equal(editScript[2].node.label.type, 'string')
  t.end()
})

tape.test('diff array delete', function (t) {
  var a = {label: {type: 'string', value: 'a'}}
  var b = {label: {type: 'string', value: 'b'}}
  var left = {
    label: {type: 'array'},
    children: [
      {label: indexLabel(0), children: [clone(a)]},
      {label: indexLabel(1), children: [clone(b)]}
    ]
  }
  var right = {
    label: {type: 'array'},
    children: [
      {label: indexLabel(0), children: [clone(a)]}
    ]
  }
  var result = diff(left, right)
  var editScript = result.editScript
  t.equal(editScript.length, 2)
  t.equal(editScript[0].operation, 'delete')
  t.equal(editScript[0].node.label.type, 'string')
  t.equal(editScript[1].operation, 'delete')
  t.equal(editScript[1].node.label.type, 'index')
  t.end()
})

tape.test('diff array to object', function (t) {
  var a = {label: {type: 'string', value: 'a'}}
  var b = {label: {type: 'string', value: 'b'}}
  var left = {
    label: {type: 'array'},
    children: [
      {label: indexLabel(0), children: [clone(a)]},
      {label: indexLabel(1), children: [clone(b)]}
    ]
  }
  var right = {
    label: {type: 'object'},
    children: [
      {label: keyLabel('x'), children: [clone(a)]},
      {label: keyLabel('y'), children: [clone(b)]}
    ]
  }
  var result = diff(left, right)
  var editScript = result.editScript
  t.equal(result.dummyRoots, true, 'dummyRoots: true')
  t.equal(
    editScript.length,
    3 /* inserts */ + 2 /* moves */ + 3 /* deletes */
  )
  t.end()
})
