var ABC = require('./abc')
var tape = require('tape')
var match = require('../match')

tape.test('match Figure 1: Running Example', function (test) {
  var left = {
    label: {type: 'document'},
    children: [
      {
        label: {type: 'paragraph'},
        children: [
          {label: {type: 'sentence', value: 'a'}},
          {label: {type: 'sentence', value: 'b'}},
          {label: {type: 'sentence', value: 'c'}}
        ]
      },
      {
        label: {type: 'paragraph'},
        children: [
          {label: {type: 'sentence', value: 'd'}},
          {label: {type: 'sentence', value: 'e'}}
        ]
      },
      {
        label: {type: 'paragraph'},
        children: [
          {label: {type: 'sentence', value: 'f'}}
        ]
      }
    ]
  }
  var right = {
    label: {type: 'document'},
    children: [
      {
        label: {type: 'paragraph'},
        children: [
          {label: {type: 'sentence', value: 'a'}},
          {label: {type: 'sentence', value: 'c'}}
        ]
      },
      {
        label: {type: 'paragraph'},
        children: [
          {label: {type: 'sentence', value: 'f'}}
        ]
      },
      {
        label: {type: 'paragraph'},
        children: [
          {label: {type: 'sentence', value: 'd'}},
          {label: {type: 'sentence', value: 'e'}},
          {label: {type: 'sentence', value: 'g'}}
        ]
      }
    ]
  }
  var expected = [
    // Documents
    [left, right, 'document'],
    // Paragraphs
    [left.children[0], right.children[0], 'first paragraph'],
    [left.children[1], right.children[2], 'second paragraph'],
    [left.children[2], right.children[1], 'third paragraph'],
    // Sentences
    [left.children[0].children[0], right.children[0].children[0], 'sentence a'],
    [left.children[0].children[2], right.children[0].children[1], 'sentence c'],
    [left.children[1].children[0], right.children[2].children[0], 'sentence d'],
    [left.children[1].children[1], right.children[2].children[1], 'sentence e'],
    [left.children[2].children[0], right.children[1].children[0], 'sentence f']
  ]
  var matches = match(left, right, 0.8, 0.5)
  checkMatches(test, matches, left, right, expected)
  test.assert(
    !matches.some(function (match) {
      return match[0] === left.children[0].children[1]
    }),
    'does not match sentence b'
  )
  test.end()
})

tape.test('match identical trees', function (test) {
  var left = JSON.parse(JSON.stringify(ABC))
  var right = JSON.parse(JSON.stringify(ABC))
  var expected = [
    // Object
    [left, right, 'object'],
    // Keys
    [left.children[0], right.children[0], 'first key'],
    [left.children[1], right.children[1], 'second key'],
    [left.children[2], right.children[2], 'third key'],
    // Values
    [left.children[0].children[0], right.children[0].children[0], 'first number'],
    [left.children[1].children[0], right.children[1].children[0], 'second number'],
    [left.children[2].children[0], right.children[2].children[0], 'third number']
  ]
  var matches = match(left, right, 0.8, 0.5)
  checkMatches(test, matches, left, right, expected)
  test.end()
})

function checkMatches (test, matches, left, right, expected) {
  expected.forEach(function (expectedMatch) {
    test.assert(
      matches.some(function (match) {
        return (
          match[0] === expectedMatch[0] &&
          match[1] === expectedMatch[1]
        )
      }),
      'matches ' + expectedMatch[2]
    )
  })
  test.equal(
    expected.length,
    matches.length,
    'same length'
  )
}
