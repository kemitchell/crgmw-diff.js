const assert = require('assert')
const postorder = require('./postorder')
const stringSimilarity = require('string-similarity')

module.exports = function (
  leftTree, rightTree,
  MINIMUM_LEAF_SIMILARITY,
  MINIMUM_BRANCH_SIMILARITY
) {
  assert.strictEqual(typeof MINIMUM_LEAF_SIMILARITY, 'number')
  assert(MINIMUM_LEAF_SIMILARITY >= 0.5)
  assert(MINIMUM_LEAF_SIMILARITY <= 1.0)

  assert.strictEqual(typeof MINIMUM_BRANCH_SIMILARITY, 'number')
  assert(MINIMUM_BRANCH_SIMILARITY >= 0)
  assert(MINIMUM_BRANCH_SIMILARITY <= 1)

  const matches = []
  function match (leftNode, rightNode) {
    matches.push([leftNode, rightNode])
  }

  // Iterate leaves.
  postorder(leftTree, function (leftNode) {
    if (!isLeafNode(leftNode)) return
    postorder(rightTree, function (rightNode) {
      if (!isLeafNode(rightNode)) return
      if (rightNode.matched) return
      if (equivalentLeaves(leftNode, rightNode)) {
        match(leftNode, rightNode)
        leftNode.matched = true
        rightNode.matched = true
      }
    })
  })

  // Iterate branches.
  postorder(leftTree, function (leftNode) {
    if (isLeafNode(leftNode)) return
    postorder(rightTree, function (rightNode) {
      if (isLeafNode(rightNode)) return
      if (equivalentBranches(leftNode, rightNode)) {
        match(leftNode, rightNode)
        leftNode.matched = true
        rightNode.matched = true
      }
    })
  })

  return matches

  function equivalentLeaves (leftLeaf, rightLeaf) {
    if (leftLeaf.label.type !== rightLeaf.label.type) return false
    const score = similarity(leftLeaf, rightLeaf)
    return score >= MINIMUM_LEAF_SIMILARITY
  }

  function equivalentBranches (leftBranch, rightBranch) {
    if (leftBranch.label.type !== rightBranch.label.type) return false
    const common = commonMatches(leftBranch, rightBranch).length
    const max = Math.max(
      leafCount(leftBranch),
      leafCount(rightBranch)
    )
    const score = common / max
    return score >= MINIMUM_BRANCH_SIMILARITY
  }

  function commonMatches (leftNode, rightNode) {
    return matches.filter(function (pair) {
      return (
        isLeafNodeDescendant(leftNode, pair[0]) &&
        isLeafNodeDescendant(rightNode, pair[1])
      )
    })
  }

  function similarity (leftNode, rightNode) {
    if (leftNode.label.type === rightNode.label.type) {
      if (leftNode.label.value === rightNode.label.value) {
        return 1.0
      } else if (leftNode.label.type === 'string') {
        return stringSimilarity.compareTwoStrings(
          leftNode.label.value, rightNode.label.value
        )
      } else {
        return 0.5
      }
    }
    return 0.0
  }

  function isLeafNode (node) {
    return !node.children || node.children.length === 0
  }

  function isLeafNodeDescendant (parent, node) {
    return isLeafNode(node) && descendantOf(parent, node)
  }

  function descendantOf (parent, node) {
    let found = false
    postorder(parent, function (descendant, context) {
      if (descendant === node) {
        found = true
        context.break()
      }
    })
    return found
  }

  function leafCount (parent) {
    let count = 0
    postorder(parent, function (node) {
      if (isLeafNode(node)) count++
    })
    return count
  }
}
