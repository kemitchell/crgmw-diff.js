var assert = require('assert')
var jsonolt = require('jsonolt')
var stringSimilarity = require('string-similarity')
var treeCrawl = require('tree-crawl')

module.exports = EditScript

function EditScript (json1, json2) {
  var T1 = jsonolt.encode(json1)
  var T2 = jsonolt.encode(json2)
  addParentProperties(T1)
  addParentProperties(T2)
  //  Paper: "Visit the nodes of T2 in breadth-first order."
  //  Paper: "This traversal combines the update, insert, align, and move phases."
  var E = []
  var M = Match(T1, T2)
  var Mprime = M
  // (a)
  // Let x be the current node in the breadth-first search of T2
  breadthFirst(T2, function (x) {
    // and let y = p(x)
    var y = p(x)
    // Let z be the partner of y in M'
    var z = partnerOfIn(y, Mprime)
    var action
    // (b) If x has no partner in M'
    if (!z) {
      // i. k <- FindPos(x)
      var k = FindPos(x)
      // ii. Append INS((w, a, v(x)), z, k) to E, for a new identifier w.
      var w = newNode(_l(x), _v(x), z)
      action = INS(w, k)
      appendTo(action, E)
      // iii. Add (w, x) to M'...
      Mprime.push([w, x])
      // ... and apply INS((w, a, v(x)), z, k) to T1.
      applyTo(action, T1)
    // (c) else if x is not a root
    } else if (x.parent) {
      // i.
      // Let w be the partner of x in M'
      let w = partnerOfIn(x, Mprime)
      // Let v = p(w) in T1
      let v = p(w)
      // ii. If v(w) =/= v(x)
      if (_v(w) !== _v(x)) {
        // A. Append UPD(w, v(x)) to E
        action = UPD(w, _v(x))
        appendTo(action, E)
        // B. Apply UPD(w, _v(x)) to T1
        applyTo(action, T1)
      }
      // iii. If (y, v) not an element of M'
      if (!elementOf([y, v], Mprime)) {
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
    editScript: E,
    totalMatching: Mprime
  }

  function AlignChildren (w, x) {
    // Mark all children of w and all children of x "out of order."
    // Let S1 be the sequence of children of w whose partners are children of x...
    var S1 // TODO
    // ...and let S2 be the sequence of children of x whose partners are children of w.
    var S2 // TODO
    // Define the function equal(a, b)
    function equal (a, b) {
      // ...to be true if and only if (a, b) elementOf Mprime
      // return elementOf([a, b], Mprime)
    }
    // Let S <- LCS(S1, S2, equal)
    var S = LCS(S1, S2, equal)
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
    // ...and let w be the partner of x (x elementOf T1).
    // var w = partnerOfIn(x, M)
    // If x is the leftmost child of y that is marked "in order," return 1.
    var leftMostChildOfYMarkedInOrder = childrenOf(y).find(function (child) {
      return child.inOrder
    })
    if (x === leftMostChildOfYMarkedInOrder) {
      return 1
    }
    // Find v elementOf T2 where v is the rightmost sibling of x that is to the left of x and is marked "in order."
    var siblingsOfX = childrenOf(y)
    var indexOfX = siblingsOfX.indexOf(x)
    var v = siblingsOfX
      .slice(0, indexOfX + 1)
      .reverse()
      .find(function (sibling) {
        return sibling.inOrder
      })
    // Let u be the partner of v in T1.
    var u = partnerOfIn(v, T1)
    // Suppose u is the ith child of its parent (counting from left to right) that is marked "in order."
    var parentOfU = p(u)
    var siblingsOfU = childrenOf(parentOfU)
    var i = siblingsOfU.findIndex(function (sibling) {
      return sibling.inOrder
    })
    // Return i + 1.
    return i + 1
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

function childrenOf (node) {
  return node.children || []
}

function applyTo (action, tree) {
  var operation = action.operation
  var node = operation.node
  var parent
  if (operation === 'insert') {
    parent = p(node)
    childrenOf(parent).splice(operation.index, 0, node)
  } else if (operation === 'delete') {
    parent = p(node)
    var children = childrenOf(parent)
    children.splice(children.indexOf(node), 1)
  } else if (operation === 'update') {
    node.value = operation.value
  } else if (operation === 'move') {
    applyTo({
      operation: 'delete',
      node: node
    })
    node.parent = operation.parent
    applyTo({
      operation: 'insert',
      node: node,
      index: operation.index
    })
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

// Traversals

function breadthFirst (tree, iterator) {
  treeCrawl(tree, iterator, {
    order: 'bfs',
    getChildren: childrenOf
  })
}

function postorder (tree, iterator) {
  treeCrawl(tree, iterator, {
    order: 'post',
    getChildren: childrenOf
  })
}

// Edit Operation Constructors

function newNode (l, v, y) {
  return {
    label: l,
    value: v,
    parent: y
  }
}

function INS (node, k) {
  return {
    operation: 'insert',
    node: node,
    index: k
  }
}

function DEL (x) {
  return {
    operation: 'delete',
    node: x
  }
}

function UPD (x, val) {
  return {
    operation: 'update',
    node: x,
    value: val
  }
}

function MOV (x, y, k) {
  return {
    operation: 'move',
    node: x,
    parent: y,
    index: k
  }
}

// Myers 1986
function LCS (a, b, equal) {
  if (a.length === 0 || b.length === 0) return []
  var aHead = a[0]
  var bHead = b[0]
  if (equal(aHead, bHead)) {
    return [[aHead, bHead]].concat(LCS(a.slice(1), b.slice(1), equal))
  } else {
    var first = LCS(a, b.slice(1), equal)
    var second = LCS(a.slice(1), b, equal)
    return first.length > second.length ? first : second
  }
}

// Paper page 17, Figure 10
function Match (T1, T2) {
  var M = []
  var nodes = nodesOf(T2)
  postorder(T1, function (x) {
    pairAsInMatch(x, nodes, M)
  })
  return M
}

function pairAsInMatch (x, T2Nodes, M) {
  var y = T2Nodes.find(function (y) {
    return !y.matched && equal(x, y)
  })
  if (y) {
    M.push([x, y])
    x.matched = true
    y.matched = true
  }
}

var DEFAULT_F = 0.8

function equal (x, y, f) {
  f = f === undefined ? DEFAULT_F : f
  if (isLeaf(x) && isLeaf(y)) {
    return _l(x) === _l(y) && compare(x, y) <= f
  } else {
    var t = f
    assert(t > 0.5)
    return (
      _l(x) === _l(y) &&
      (common(x, y) / Math.max(bars(x), bars(y))) > t
    )
  }
}

// Returns Numbers [0, 2]
function compare (x, y) {
  var xValue = x.label.value
  var yValue = y.label.value
  var xType = typeof xValue
  var yType = typeof yValue
  if (xValue === yValue) {
    return 2
  } else if (xType === yType) {
    return 0
  } else if (xType === 'string' && yType === 'string') {
    return 1 + stringSimilarity.compareTwoStrings(xValue, yValue)
  } else if (xType === 'number' && yType === 'number') {
    return 1 + (Math.abs(xValue - yValue) / Number.MAX_SAFE_INTEGER)
  } else if (xType === 'boolean' && yType === 'boolean') {
    return 0
  }
  if (v === null) {
    
  }
}

// Paper page 16, continuing paragraph
function contains (x, y) {
  return isLeaf(y) && descendantOf(x, y)
}

// Paper page 16
function common (x, y, M) {
  return M.some(function (pair) {
    var w = pair[0]
    var z = pair[1]
    return contains(x, w) && contains(y, z)
  })
}

function descendantOf (x, y) {
  var found = false
  postorder(x, function (node, context) {
    if (node === y) {
      found = true
      context.break()
    }
  })
  return found
}

// Paper page 16, continuing paragraph
function bars (x) {
  var count = 0
  postorder(x, function (node, context) {
    if (isLeaf(node)) count++
  })
  return count
}

// TODO: Replace label with type

function nodesOf (node) {
  return (node.children || []).reduce(function (mem, child) {
    return mem.concat(nodesOf(child))
  }, [node])
}

function isLeaf (node) {
  return !node.children || node.children.length === 0
}
