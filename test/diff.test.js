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
  var a = { label: { type: 'string', value: 'a' } }
  var b = { label: { type: 'string', value: 'b' } }
  var left = {
    label: { type: 'array' },
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
    label: { type: 'array' },
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
  return { type: 'index', value: index }
}

function clone (value) {
  return JSON.parse(JSON.stringify(value))
}

tape.test('diff swapped object', function (t) {
  var a = { label: { type: 'string', value: 'a' } }
  var b = { label: { type: 'string', value: 'b' } }
  var left = {
    label: { type: 'object' },
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
    label: { type: 'object' },
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
  return { type: 'key', value: key }
}

tape.test('diff array append', function (t) {
  var a = { label: { type: 'string', value: 'a' } }
  var b = { label: { type: 'string', value: 'b' } }
  var left = {
    label: { type: 'array' },
    children: [
      {
        label: indexLabel(0),
        children: [clone(a)]
      }
    ]
  }
  var right = {
    label: { type: 'array' },
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

tape.test('diff array shift', function (t) {
  var a = { label: { type: 'string', value: 'a' } }
  var b = { label: { type: 'string', value: 'b' } }
  var left = {
    label: { type: 'array' },
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
    label: { type: 'array' },
    children: [
      {
        label: indexLabel(0),
        children: [
          {
            label: { type: 'array' },
            children: []
          }
        ]
      },
      {
        label: indexLabel(1),
        children: [clone(a)]
      },
      {
        label: indexLabel(2),
        children: [clone(b)]
      }
    ]
  }
  var result = diff(left, right)
  var editScript = result.editScript
  t.equal(editScript.length, 4)
  // Insert new index.
  t.equal(editScript[0].operation, 'insert')
  t.equal(editScript[0].node.label.type, 'index')
  t.equal(editScript[0].node.label.value, 0)
  // Update a'b index.
  t.equal(editScript[1].operation, 'update')
  t.equal(editScript[1].node.children[0].label.value, 'a')
  t.equal(editScript[1].value, 1)
  // Update b's index.
  t.equal(editScript[2].operation, 'update')
  t.equal(editScript[2].node.children[0].label.value, 'b')
  t.equal(editScript[2].value, 2)
  // Insert array as child of new index.
  t.equal(editScript[3].operation, 'insert')
  t.equal(editScript[3].node.label.type, 'array')
  t.equal(editScript[3].node.parent.label.type, 'index')
  t.equal(editScript[3].index, 0)
  t.end()
})

tape.test('diff array splice', function (t) {
  var a = { label: { type: 'string', value: 'a' } }
  var b = { label: { type: 'string', value: 'b' } }
  var left = {
    label: { type: 'array' },
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
    label: { type: 'array' },
    children: [
      {
        label: indexLabel(0),
        children: [clone(a)]
      },
      {
        label: indexLabel(1),
        children: [
          {
            label: { type: 'array' },
            children: []
          }
        ]
      },
      {
        label: indexLabel(2),
        children: [clone(b)]
      }
    ]
  }
  var result = diff(left, right)
  var editScript = result.editScript
  t.equal(editScript.length, 3)
  // Insert new index.
  t.equal(editScript[0].operation, 'insert')
  t.equal(editScript[0].node.label.type, 'index')
  t.equal(editScript[0].node.label.value, 1)
  // Update b's index.
  t.equal(editScript[1].operation, 'update')
  t.equal(editScript[1].node.children[0].label.value, 'b')
  t.equal(editScript[1].value, 2)
  // Insert array as child of new index.
  t.equal(editScript[2].operation, 'insert')
  t.equal(editScript[2].node.label.type, 'array')
  t.equal(editScript[2].node.parent.label.type, 'index')
  t.equal(editScript[2].node.parent.label.value, 1)
  t.end()
})

tape('diff double child append', function (t) {
  var a = { label: { type: 'string', value: 'a' } }
  var b = { label: { type: 'string', value: 'b' } }
  var c = { label: { type: 'string', value: 'c' } }
  var d = { label: { type: 'string', value: 'd' } }
  var left = {
    label: { type: 'array' },
    children: [clone(a), clone(b)]
  }
  var right = {
    label: { type: 'array' },
    children: [clone(a), clone(b), clone(c), clone(d)]
  }
  var result = diff(left, right)
  var editScript = result.editScript
  t.equal(editScript.length, 2)
  // Insert c
  t.equal(editScript[0].operation, 'insert')
  t.equal(editScript[0].node.label.type, 'string')
  t.equal(editScript[0].node.label.value, 'c')
  t.equal(editScript[0].index, 2)
  // Insert d
  t.equal(editScript[1].operation, 'insert')
  t.equal(editScript[1].node.label.type, 'string')
  t.equal(editScript[1].node.label.value, 'd')
  t.equal(editScript[1].index, 3)
  t.end()
})

tape('diff child prepend', function (t) {
  var a = { label: { type: 'string', value: 'a' } }
  var b = { label: { type: 'string', value: 'b' } }
  var c = { label: { type: 'string', value: 'c' } }
  var d = { label: { type: 'string', value: 'd' } }
  var left = {
    label: { type: 'array' },
    children: [clone(b), clone(c), clone(d)]
  }
  var right = {
    label: { type: 'array' },
    children: [clone(a), clone(b), clone(c), clone(d)]
  }
  var result = diff(left, right)
  var editScript = result.editScript
  t.equal(editScript.length, 1)
  t.equal(editScript[0].operation, 'insert')
  t.equal(editScript[0].node.label.type, 'string')
  t.equal(editScript[0].node.label.value, 'a')
  t.equal(editScript[0].index, 0)
  t.end()
})

tape.test('diff array prepend', function (t) {
  var a = { label: { type: 'string', value: 'a' } }
  var b = { label: { type: 'string', value: 'b' } }
  var left = {
    label: { type: 'array' },
    children: [
      {
        label: indexLabel(0),
        children: [clone(b)]
      }
    ]
  }
  var right = {
    label: { type: 'array' },
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
  var a = { label: { type: 'string', value: 'a' } }
  var b = { label: { type: 'string', value: 'b' } }
  var left = {
    label: { type: 'array' },
    children: [
      { label: indexLabel(0), children: [clone(a)] },
      { label: indexLabel(1), children: [clone(b)] }
    ]
  }
  var right = {
    label: { type: 'array' },
    children: [
      { label: indexLabel(0), children: [clone(a)] }
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
  var a = { label: { type: 'string', value: 'a' } }
  var b = { label: { type: 'string', value: 'b' } }
  var left = {
    label: { type: 'array' },
    children: [
      { label: indexLabel(0), children: [clone(a)] },
      { label: indexLabel(1), children: [clone(b)] }
    ]
  }
  var right = {
    label: { type: 'object' },
    children: [
      { label: keyLabel('x'), children: [clone(a)] },
      { label: keyLabel('y'), children: [clone(b)] }
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

tape.test('diff string to boolean', function (t) {
  var boolean = { label: { type: 'boolean', value: false } }
  var string = { label: { type: 'string', value: 'false' } }
  var result = diff(string, boolean)
  var editScript = result.editScript
  t.equal(editScript[0].operation, 'insert')
  t.equal(editScript[0].node.label.type, 'boolean')
  t.equal(editScript[0].node.label.value, false)
  t.end()
})
