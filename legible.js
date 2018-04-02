module.exports = function (before, after) {
  var editScript = []

  // Compute a decent, partial mapping of nodes from the before tree to
  // the after tree. This function will append to the mapping as it
  // goes, resulting in a total mapping to return with the edit script.
  var mapping = match(before, after)

  // Perform update, insert, align, and move operations in a single,
  // combined breadth-first traversal.
  breadthFirst(after, function (node /* x */) {
    var parent = node.parent // y
    var parentPartner = partnerOf(parent) // z
    var partner = partnerOf(node) // w
    if (partner === null) {
      record(Insert(node, parentPartner, findPosition(node)))
    } else {
      if (node.value !== partner.value) {
        record(Update(partner, node.value))
      }
      if (!haveMapping(partner.parent, parent)) {
        record(Move(partner, parentPartner, findPosition(node)))
      }
    }
    alignChildren(node, partner)
  })

  // Traverse the before tree, deleting unmatched nodes.
  // This is done in post-order, so that each deleted node is a leaf
  // when the edit script is processed in order.
  postorder(before, function (node) {
    if (partnerOf(node) === null) record(Delete(node))
  })

  return {
    editScript: editScript,
    mapping: mapping
  }

  // Find a partial mapping of nodes from before to after.
  function match (before, after) {
    var mapping = []
    var afterNodes = nodesOf(after)
    postorder(before, function (node) {
      var partner = afterNodes.find(function (candidate) {
        return !candidate.matched && equal(node, candidate)
      })
      if (partner !== null) {
        mapping.push([node, partner])
        node.matched = true
        partner.matched = true
      }
    })
    return mapping
  }

  function haveMapping (before, after) {
    return mapping.some(function (pair) {
      return pair[0] === before && pair[1] === after
    })
  }

  function record (action) {
    editScript.push(action)
    apply(action, before)
  }

  function apply (action) {
    var operation = action.operation
    var node = operation.node
    var parent
    if (operation === 'insert') {
      parent = node.parent
      childrenOf(parent).splice(operation.index, 0, node)
    } else if (operation === 'delete') {
      parent = node.parent
      var children = childrenOf(parent)
      children.splice(children.indexOf(node), 1)
    } else if (operation === 'update') {
      node.value = operation.value
    } else if (operation === 'move') {
      apply(Delete(node))
      node.parent = operation.parent
      apply(Insert(node, operation.index))
    }
  }

  function partnerOf (node) {
    for (var index = 0; index < mapping.length; index++) {
      var pair = mapping[index]
      if (pair[0] === node) return pair[1]
      if (pair[1] === node) return pair[0]
    }
    return null
  }

  function alignChildren (node /* x */, partner /* w */) {
    var commonChildrenInNode = commonChildren(node, partner)
    var commonChildrenInPartner = commonChildren(partner, node)
    var longestSubsequence = LCS(
      commonChildrenInNode, commonChildrenInPartner,
      haveMapping
    )
    longestSubsequence.forEach(function (pair) {
      pair[0].inOrder = true
      pair[1].inOrder = true
    })
    commonChildrenInNode.forEach(function (nodeChild) {
      commonChildrenInPartner.forEach(function (partnerChild) {
        if (
          haveMapping(partnerChild, nodeChild) &&
          !longestSubsequence.some(function (pair) {
            return pair[0] === partnerChild && pair[1] === nodeChild
          })
        ) {
          record(Move(nodeChild, partner, findPosition(partnerChild)))
          nodeChild.inOrder = true
          partnerChild.inOrder = true
        }
      })
    })

    function commonChildren (from, to) {
      return from.children.filter(function (child) {
        var partner = partnerOf(child)
        return to.children.indexOf(partner) !== -1
      })
    }
  }

  function LCS (x, y) {
    if (x.length === 0 || y.length === 0) return []
    var xHead = x[0]
    var yHead = y[0]
    if (equal(xHead, yHead)) {
      return [[xHead, yHead]].concat(LCS(x.slice(1), y.slice(1)))
    } else {
      var first = LCS(x, y.slice(1))
      var second = LCS(x.slice(1), y)
      return first.length > second.length ? first : second
    }
  }

  var THRESHOLD = 0.8

  function equal (x, y) {
    if (isLeaf(x) && isLeaf(y)) {
      return valueSimilarity(x, y) <= THRESHOLD
    } else {
      return (
        x.label.type === y.label.type &&
        (common(x, y, mapping) / Math.max(leafCount(x), leafCount(y))) > THRESHOLD
      )
    }
  }

  function common (x, y) {
    return mapping.some(function (pair) {
      var w = pair[0]
      var z = pair[1]
      return containsLeaf(x, w) && containsLeaf(y, z)
    })
  }

  function findPosition (node) {
    var parent = node.parent
    var siblings = parent.children
    var leftSiblingsInOrder = siblings
      .slice(0, siblings.indexOf(node))
      .filter(function (sibling) {
        return sibling.inOrder
      })
    if (leftSiblingsInOrder.length === 0) return 1
    var nearestLeft = leftSiblingsInOrder[leftSiblingsInOrder.length - 1]
    var partner = partnerOf(nearestLeft)
    var partnerOffset = 0
    for (var index = 0; index < partner.children.length; index++) {
      var sibling = partner.children[index]
      if (sibling.inOrder) partnerOffset++
      if (sibling === partner) break
    }
    return partnerOffset + 1
  }
}

var treeCrawl = require('tree-crawl')

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

function Insert (node, index) {
  return {
    operation: 'insert',
    node: node,
    index: index
  }
}

function Delete (node) {
  return {
    operation: 'delete',
    node: node
  }
}

function Update (node, value) {
  return {
    operation: 'update',
    node: node,
    value: value
  }
}

function Move (node, parent, index) {
  return {
    operation: 'move',
    node: node,
    parent: parent,
    index: index
  }
}

// Value Comparison

var stringSimilarity = require('string-similarity')

function valueSimilarity (first, second) {
  var firstValue = first.label.value
  var secondValue = second.label.value
  var firstType = first.label.type
  var secondType = second.label.type
  if (firstValue === secondValue) return 2
  if (firstType !== secondType) return 0
  if (firstType === 'number') return 1
  if (firstType === 'boolean') return 1
  if (firstType === 'string') {
    return stringSimilarity.compareTwoStrings(firstValue, secondValue) * 2.0
  }
}

// Node Helper Functions

function childrenOf (node) {
  return node.children || []
}

function nodesOf (node) {
  return childrenOf(node).reduce(function (returned, child) {
    return returned.concat(nodesOf(child))
  }, [node])
}

function isLeaf (node) {
  return childrenOf(node).length === 0
}

function leafCount (x) {
  var count = 0
  postorder(x, function (node, context) {
    if (isLeaf(node)) count++
  })
  return count
}

function containsLeaf (x, y) {
  return isLeaf(y) && descendantOf(x, y)
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
