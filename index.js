var assert = require('assert')
var breadthFirst = require('./breadth-first')
var childrenOf = require('./children-of')
var match = require('./match')
var postorder = require('./postorder')

module.exports = function (T1, T2, options) {
  options = options || {}

  addParentProperties(T1)
  addParentProperties(T2)
  //  Paper: "Visit the nodes of T2 in breadth-first order."
  //  Paper: "This traversal combines the update, insert, align, and move phases."
  var E = []
  var M = match(
    T1, T2,
    options.leaves === undefined ? 0.8 : options.leaves,
    options.branches === undefined ? 0.5 : options.branches
  )
  var Mprime = M
  var dummyRoots = false

  // Paper: If the roots of T1 and T2 are not matched in M,
  if (partnerOfIn(T1, M) !== T2) {
    dummyRoots = true
    // Paper: ... then we add new (dummy) root nodes x to T1 and y to T2,
    var x = dummyRoot()
    var y = dummyRoot()
    // Paper: ... and add (x, y) to M.
    M.push([x, y])
    // Paper: The old root of T1 is made the lone child of x
    var oldRootOfT1 = T1
    x.children = [oldRootOfT1]
    oldRootOfT1.parent = x
    T1 = x
    // Paper: ... and the old root of T2 is made the lone child of y.
    var oldRootOfT2 = T2
    y.children = [oldRootOfT2]
    oldRootOfT2.parent = y
    T2 = y
  } else {
    T1.root = true
    T2.root = true
  }

  // (a)
  // Let x be the current node in the breadth-first search of T2
  breadthFirst(T2, function (x) {
    // and let y = p(x)
    var y = p(x)
    // Let z be the partner of y in M'
    var z = partnerOfIn(y, Mprime)
    var action
    var w = partnerOfIn(x, Mprime)
    // (b) If x has no partner in M'
    if (!w) {
      // i. k <- FindPos(x)
      var k = FindPos(x)
      // ii. Append INS((w, a, v(x)), z, k) to E, for a new identifier w.
      w = newNode(_l(x), _v(x), z)
      action = INS(w, k)
      appendTo(action, E)
      // iii. Add (w, x) to M'...
      Mprime.push([w, x])
      // ... and apply INS((w, a, v(x)), z, k) to T1.
      applyTo(action, T1)
    // (c) else if x is not a root
    } else if (!x.root) {
      // i.
      // Let v = p(w) in T1
      var v = p(w)
      // ii. If v(w) =/= v(x)
      if (_v(w) !== _v(x)) {
        // A. Append UPD(w, v(x)) to E
        action = UPD(w, _v(x))
        appendTo(action, E)
        // B. Apply UPD(w, _v(x)) to T1
        applyTo(action, T1)
      }
      // iii. If (y, v) not an element of M'
      if (!elementOf([v, y], Mprime)) {
        // A. Let z be the partner of y in M'
        let z = partnerOfIn(y, Mprime)
        // B. k <- FindPos(x)
        let k = FindPos(x)
        // C. Append MOV(w, z, k) to E
        action = MOV(w, z, k)
        appendTo(action, E)
        // D. Apply MOV(w, z, k) to T1
        applyTo(action, T1)
      }
    }
    // (d) AlignChildren(w, x)
    AlignChildren(w, x)
  })
  // Delete Phase
  // 3. Do a post-order traversal of T1
  // (a) Let w be the current node in the post-order traversal of T1
  postorder(T1, function (w) {
    // (b) If w has no partner in M', then
    if (!partnerOfIn(w, Mprime)) {
      // append DEL(w) to E and
      var action = DEL(w)
      appendTo(action, E)
      // apply DEL(w) to T1
      applyTo(action, T1)
    }
  })
  // 4.
  // E is a minimum cost edit script
  // M' is a total matching
  // T1 is isomorphic to T2
  return {
    dummyRoots: dummyRoots,
    editScript: E,
    totalMatching: Mprime
  }

  function AlignChildren (w, x) {
    // Mark all children of w and all children of x "out of order."
    // Let S1 be the sequence of children of w whose partners are children of x...
    var S1 = childrenOf(w).filter(function (child) {
      var partner = partnerOfIn(child, Mprime)
      return partner && partner.parent === x
    })
    // ...and let S2 be the sequence of children of x whose partners are children of w.
    var S2 = childrenOf(x).filter(function (child) {
      var partner = partnerOfIn(child, Mprime)
      return partner && partner.parent === w
    })
    // Define the function equal(a, b)
    function equal (a, b) {
      // ...to be true if and only if (a, b) elementOf Mprime
      return elementOf([a, b], Mprime)
    }
    // Let S <- LCS(S1, S2, equal)
    var S = LCS(S1, S2, equal, Mprime)
    // For each (a, b) elementOf S, mark nodes a and b "in order."
    S.forEach(function (element) {
      var a = element[0]
      var b = element[1]
      a.inOrder = true
      b.inOrder = true
    })
    S1.forEach(function (a) {
      S2.forEach(function (b) {
        // For each a elementOf S1, b elementOf S2 such that (a, b)
        // elementOf M but (a, b) notElementOf S
        if (
          elementOf([a, b], M) &&
          !elementOf([a, b], S)
        ) {
          // (a) k <- FindPos(b)
          var k = FindPos(b)
          // (b) Append MOV(a, w, k) to E...
          var action = MOV(a, w, k)
          appendTo(action, E)
          // ...and apply MOV(a, w, k) to T1
          applyTo(action, T1)
          // (c) Mark a and B "in order"
          a.inOrder = true
          b.inOrder = true
        }
      })
    })
  }

  function FindPos (x) {
    // Let y = p(x) in T2...
    var y = p(x)
    // If x is the leftmost child of y that is marked "in order," return 1.
    var leftMostChildOfYMarkedInOrder = childrenOf(y).find(function (child) {
      return child.inOrder
    })
    if (x === leftMostChildOfYMarkedInOrder) return 1
    // Find v elementOf T2 where v is the rightmost sibling of x that is to the left of x and is marked "in order."
    var siblingsOfX = childrenOf(y)
    var indexOfX = siblingsOfX.indexOf(x)
    var siblingsToTheLeftOfX = siblingsOfX.slice(0, indexOfX)
    var v = siblingsToTheLeftOfX
      .reverse()
      .find(function (sibling) {
        return sibling.inOrder
      })
    // This branch is _not_ described in the paper.
    if (!v) return 0
    // Let u be the partner of v in T1.
    var u = partnerOfIn(v, T1)
    if (!u) return 0
    // return get_pos(u) + 1
    // Suppose u is the ith child of its parent (counting from left to right) that is marked "in order."
    var parentOfU = p(u)
    var siblingsOfU = childrenOf(parentOfU)
    var i = siblingsOfU.findIndex(function (sibling) {
      return sibling.inOrder
    })
    // Return i + 1.
    return i + 1
  }

  // Myers 1986
  function LCS (a, b, equal) {
    if (a.length === 0 || b.length === 0) return []
    var aHead = a[0]
    var bHead = b[0]
    if (equal(aHead, bHead, undefined, M)) {
      return [[aHead, bHead]].concat(LCS(a.slice(1), b.slice(1), equal))
    } else {
      var first = LCS(a, b.slice(1), equal)
      var second = LCS(a.slice(1), b, equal)
      return first.length > second.length ? first : second
    }
  }
}

function addParentProperties (node) {
  if (node.children) {
    node.children.forEach(function (child) {
      child.parent = node
      addParentProperties(child)
    })
  }
}

function applyTo (action, tree) {
  var operation = action.operation
  var node = action.node
  assert(typeof node, 'object')
  var parent
  /* istanbul ignore else */
  if (operation === 'insert') {
    parent = p(node)
    childrenOf(parent).splice(operation.index, 0, node)
  } else if (operation === 'delete') {
    parent = p(node)
    var children = childrenOf(parent)
    children.splice(children.indexOf(node), 1)
  } else if (operation === 'update') {
    node.label.value = action.value
  } else if (operation === 'move') {
    parent = action.parent
    applyTo(DEL(node), tree)
    node.parent = parent
    applyTo(INS(node, operation.index), tree)
  } else {
    throw new Error('invalid operation: ' + JSON.stringify(operation))
  }
}

function partnerOfIn (node, mapping) {
  for (var index = 0; index < mapping.length; index++) {
    var pair = mapping[index]
    if (pair[0] === node) return pair[1]
    if (pair[1] === node) return pair[0]
  }
}

function appendTo (action, mapping) {
  mapping.push(action)
}

function elementOf (pair, mapping) {
  return mapping.some(function (otherPair) {
    return (
      pair[0] === otherPair[0] &&
      pair[1] === otherPair[1]
    )
  })
}

function _l (node) {
  return node.label.type
}

function _v (node) {
  return node.label.value
}

function p (node) {
  return node.parent
}

// Edit Operation Constructors

function newNode (l, v, y) {
  assert.equal(typeof l, 'string')
  assert.equal(typeof y, 'object')
  assert(y.hasOwnProperty('label'))
  var label = {type: l}
  if (v !== undefined) label.value = v
  return {label: label, parent: y, children: []}
}

function INS (node, k) {
  assert.equal(typeof node, 'object')
  assert(node.hasOwnProperty('label'))
  return {operation: 'insert', node: node, index: k}
}

function DEL (x) {
  assert.equal(typeof x, 'object')
  assert(x.hasOwnProperty('label'))
  return {operation: 'delete', node: x}
}

function UPD (x, val) {
  assert.equal(typeof x, 'object')
  assert(x.hasOwnProperty('label'))
  return {operation: 'update', node: x, value: val}
}

function MOV (x, y, k) {
  assert.equal(typeof x, 'object')
  assert(x.hasOwnProperty('label'))
  assert.equal(typeof y, 'object')
  assert(y.hasOwnProperty('label'))
  assert.equal(typeof k, 'number')
  assert(k >= 0)
  return {operation: 'move', node: x, parent: y, index: k}
}

function dummyRoot () {
  return {label: {type: 'dummy'}, root: true}
}
