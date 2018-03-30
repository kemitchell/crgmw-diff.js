var deepEqual = require('fast-deep-equal')
var leven = require('leven')
var stringSimilarity = require('string-similarity')

var DEFAULT_EQUALITY_THRESHOLD = 0.5

var INSERT = {
  type: 'insert',
  properties: ['node', 'parent', 'index']
}

var DELETE = {
  type: 'delete',
  properties: ['path']
}

var UPDATE = {
  type: 'update',
  properties: ['path']
}

var MOVE = {
  type: 'move',
  properties: ['path', 'parent', 'index']
}

var MATCH = {
  type: 'match',
  properties: ['a', 'b']
}

function compare (left, right) {
  if (deepEqual(left.attributes, right.attributes)) {
    ratio += 1
  }
  if (typeof left.text === 'string' && typeof right.text === 'string') {
    ratio += stringSimilarity(left.text, right.text)
  } else {
    ratio += 1
  }
  // TODO: Handle tails.
  return ratio
}

function commonChildren (left, right, threshold) {
  threshold = threshold || 0.5
  var count = 0
  if (typeof left.text === 'string' && typeof right.text === 'string') {
    return count
  }
  left.children.forEach(function (leftChild) {
    right.forEach(function (rightChild) {
      if (compare(leftChild, rightChild) >= (threshold * 2)) count++
    })
  })
  var maxChildren = Math.max(left.children.length, right.children.length)
  if (maxChildren > 0) return (count / maxChildren)
  return 0
}

function roughlyEqual (left, right, threshold) {
  threshold = threshold || 0.5
  if (left.type !== right.type) return false
  if (isLeaf(left) === 0 && isLeaf(right) === 0) {
    if (compare(left, right) >= (threshold * 2)) {
      return true
    }
  } else {
    if (commonChildren(left, right, threshold) >= threshold) {
      return true
    }
  }
  return false
}

function longestCommonSubsequence (a, b, equal) {
  if (a.length === 0 || b.length === 0) return []
  var aElement = a[0]
  var bElement = b[0]
  if (equal(aElement, bElement)) {
    return [
      [[aElement, bElement], null],
      longestCommonSubsequence(a.slice(1), b.slice(1), equal)
    ]
  } else {
    return Math.max(
      longestCommonSubsequence(a, b.slice(1), equal).length,
      longestCommonSubsequence(a.slice(1), b, equal).length
    )
  }
}

function simpleMatch (left, right, threshold) {
  threshold = threshold || 0.5
  if (!deepEqual(left.path, right.path)) return []
  var matches = []
  var leftLeaves = leavesOf(left)
  var rightLeaves = leavesOf(right)
  while (leftLeaves.length !== 0 && rightLeaves.length !== 0) {
    leavesOf(left).forEach(function (leftLeaf) {
      leavesOf(right).forEach(function (rightLeaf) {
        if (roughlyEqual(leftLeaf, rightLeaf, threshold)) {
          matches.push({
            type: 'match',
            left: leftLeaf,
            right: rightLeaf
          })
        }
      })
    })
    leftLeaves = leftLeaves.reduce(function (replacement, node) {
      if (node.parent) return replacement.concat(node.parent)
      else return replacement
    }, [])
    rightLeaves = rightLeaves.reduce(function (replacement, node) {
      if (node.parent) return replacement.concat(node.parent)
      else return replacement
    }, [])
  }
  return matches
}

function fastMatch (left, right, threshold) {
  threshold = threshold || 0.5
  var matches = []
  if (!deepEqual(left.path, right.path)) return []
  var leftLeaves = leavesOf(left)
  var leftNodes = nodesOf(left)
  var rightNodes = nodesOf(right)
  var typeNodes = leftLeaves
  var types = typeNodes.map(function (node) { return node.type })
  while (types.length !== 0) {
    types.forEach(function (type) {
      var leftChain = leftNodes.reduce(function (mem, node) {
        return node.type === type ? mem.concat(node) : mem
      }, [])
      var rightChain = rightNodes.reduce(function (mem, node) {
        return node.type === type ? mem.concat(node) : mem
      }, [])
      var common = longestCommonSubsequence(
        leftChain, rightChain, roughlyEqual
      )
      common.forEach(function (element) {
        matches.push({
          type: 'match',
          left: element.left,
          right: element.right
        })
      })
    })
    typeNodes = typeNodes.reduce(function (mem, node) {
      return node.parent ? mem.concat(node.parent) : mem
    }, [])
    types = typeNodes.map(function (node) { return node.type })
  }
  return matches
}

function partnerOf (matches, node) {
  var match = matches.find(function (match) {
    // TODO: Verify.
    return match.left === node || match.right === node
  })
  if (!match) return null
  return match.left === node ? match.right : match.left
}

function editscript (leftRoot, rightRoot, matches) {
  if (!deepEqual(leftRoot.path, rightRoot.path)) return script
  var script = []

  var haveRootMatch = matches.some(function (match) {
    return match.left === leftRoot && match.right === rightRoot
  })
  if (!haveRootMatch) {
    matches.push({
      type: 'match',
      left: leftRoot,
      right: rightRoot
    })
  }

  nodesOf(right).forEach(function (rightChild) {
    var rightParent = rightNode.parent
    var leftChild = partnerOf(matches, rightChild)
    if (!leftChild) {
      // Find the parent's partner.
      var leftParent = partnerOf(matches, rightParent)
      var index = rightParent.path[rightParent.path.length - 1]
      script.push({
        type: 'insert',
        node: rightChild,
        parent: rightParent,
        index: index
      })
      // Apply the action.
      transform(left, [action])
      // Save left child for alignment.
      var leftChild = get(leftRoot, rightChild.path)
      matches.push({
        left: leftChild,
        right: rightChild
      })
    } else {
      // Partner is not a root node.
      var leftParent = leftChild.parent
      if (
        rightChild.value !== leftChild.value ||
        !deepEqual(leftChild.tail, rightChild.tail)
      ) {
        var action = {
          type: 'update',
          path: rightChild.path,
          value: rightChild.value
        }
        script.push(action)
        transform(left, [action])
      }
      var noParentMatch = matches.some(function (element) {
        return element.left === leftParent && element.right === rightParent
      })
      if (
        !noParentMatch ||
        lastElement(leftChild.path) !== lastElement(rightChild.path)
      ) {
        var rightParent = partnerOf(matches, leftParent)
        if (!rightParent) rightParent = rightChild.parent

      }
    }
  })

                # Get the left parent's right partner
                right_parent = partnerOf(matches, left_parent)
                if right_parent is None:
                    # The left_parent doesn't have a match (it might be
                    # deleted). Use what the right_child reports as its
                    # parent.
                    # XXX: Can we assume that this will be a valid
                    # parent here?
                    right_parent = right_child.getparent()

                # Get the right index
                index = right_parent.index(right_child)

                # If so, add a move action for the node to the script
                action = MOVE(getpath(left_child),
                              getpath(right_parent),
                              index)
                script.add(action)

                # Perform the action on our working copy of the left
                # tree so we'll be able to introspect
                transform(left_root, set([action, ]))

        # Align the child nodes
        left_children = left_child.getchildren()
        right_children = right_child.getchildren()

        # Find all left_child children whose parners are children of
        # right_child. We'll handle any that aren't in the deletion
        # phase.
        left_match_children = [n for n in left_children
                               if partnerOf(matches, n)
                               in right_children]
        common_sequence = lcs(left_child, right_child,
                              lambda l, r: Match(l, r) in matches)

        for left_child, right_child in \
                zip(left_match_children, right_children):
            if (left_child, right_child) in common_sequence:
                # these are already aligned
                continue

            # Get the right index
            index = right_child.getparent().index(right_child)

            # Add a move action for the node to the script
            action = MOVE(getpath(left_child), getpath(right_parent), index)
            script.add(action)

            # Perform the action on our working copy of the left
            # tree so we'll be able to introspect
            transform(left_root, set([action, ]))

    # If there any nodes we've haven't visited in left_tree that we did
    # in right_tree (that don't now have a match in matches), they need
    # to be deleted.
    for left_child in reversed(left_root.xpath("//*")):
        right_child = partnerOf(matches, left_child)
        if right_child is None:
            # Add a delete action for this node to the script
            action = DELETE(getpath(left_child))
            script.add(action)

            # Perform the action on our working copy of the left
            # tree so we'll be able to introspect
            transform(left_root, set([action, ]))

    return script


function nodesOf (node) {
  if (isLeaf(node)) return [node]
  return node.children.reduce(function (returned, child) {
    return returned.concat(nodesOf(child))
  }, [node])
}

function leavesOf (node) {
  if (isLeaf(node)) return [node]
  return node.children.reduce(function (returned, child) {
    return returned.concat(leavesOf(child))
  }, [])
}

function isLeaf (node) {
  return node.children === undefined || node.children.length === 0
}

function lastElement (array) {
  return array[array.length - 1]
}
