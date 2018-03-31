var diff = require('./')
var tape = require('tape')

tape(function (t) {
  var result = diff(
    {
      a: 1,
      b: 2,
      c: 3
    },
    {
      a: 1,
      b: 2,
      c: [
        {
          d: 3
        }
      ]
    }
  )
  t.deepEqual(
    result,
    []
  )
  t.end()
})
