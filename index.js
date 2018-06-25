"use strict"

const tape = require("tape")
const Buffer = require("buffer").Buffer

module.exports = function(createRandomAccessFile, options) {
  tape("write and read", function(t) {
    createRandomAccessFile("write-and-read.txt", null, function(file) {
      file.write(0, Buffer.from("hello"), function(err) {
        t.error(err, "no error")
        file.read(0, 5, function(err, buf) {
          t.error(err, "no error")
          t.same(buf, Buffer.from("hello"))
          file.destroy(() => t.end())
        })
      })
    })
  })

  tape("read empty", function(t) {
    createRandomAccessFile("create-empty.txt", null, function(file) {
      file.read(0, 0, function(err, buf) {
        t.error(err, "no error")
        t.same(buf, Buffer.alloc(0), "empty buffer")
        file.destroy(() => t.end())
      })
    })
  })

  tape("read range > file", function(t) {
    createRandomAccessFile("read-range.txt", null, function(file) {
      file.read(0, 5, function(err, buf) {
        t.ok(err, "not satisfiable")
        file.destroy(() => t.end())
      })
    })
  })

  tape("read range > file with data", function(t) {
    createRandomAccessFile("read-off-range.txt", null, function(file) {
      file.write(0, Buffer.from("hello"), function(err) {
        t.error(err, "no error")
        file.read(0, 10, function(err, buf) {
          t.ok(err, "not satisfiable")
          file.destroy(() => t.end())
        })
      })
    })
  })

  tape("random access write and read", function(t) {
    createRandomAccessFile("write-and-read.txt", null, function(file) {
      file.write(10, Buffer.from("hi"), function(err) {
        t.error(err, "no error")
        file.write(0, Buffer.from("hello"), function(err) {
          t.error(err, "no error")
          file.read(10, 2, function(err, buf) {
            t.error(err, "no error")
            t.same(buf, Buffer.from("hi"))
            file.read(0, 5, function(err, buf) {
              t.error(err, "no error")
              t.same(buf, Buffer.from("hello"))
              file.read(5, 5, function(err, buf) {
                t.error(err, "no error")
                t.same(buf, Buffer.from([0, 0, 0, 0, 0]))
                file.destroy(() => t.end())
              })
            })
          })
        })
      })
    })
  })

  if (options.reopen) {
    tape("re-open", function(t) {
      const name = "re-open.txt"
      createRandomAccessFile(name, null, function(file) {
        file.write(10, Buffer.from("hello"), function(err) {
          t.error(err, "no error")
          createRandomAccessFile(name, null, function(file2) {
            file2.read(10, 5, function(err, buf) {
              t.error(err, "no error")
              t.same(buf, Buffer.from("hello"))
              file.destroy(() => t.end())
            })
          })
        })
      })
    })
  }

  if (options.reopen && options.truncate) {
    tape("re-open and truncate", function(t) {
      const path = "re-open-and-truncate.txt"
      createRandomAccessFile(path, null, function(file) {
        file.write(10, Buffer.from("hello"), function(err) {
          t.error(err, "no error")
          createRandomAccessFile(path, { truncate: true }, function(file2) {
            file2.read(10, 5, function(err, buf) {
              t.ok(err, "file should be truncated")
              file2.destroy(() => t.end())
            })
          })
        })
      })
    })
  }

  if (options.writable && options.size) {
    tape("truncate with size", function(t) {
      createRandomAccessFile(
        "truncate-with-size.txt",
        { size: 100, writable: true },
        function(file) {
          file.stat(function(err, st) {
            t.error(err, "no error")
            t.same(st.size, 100)
            file.destroy(() => t.end())
          })
        }
      )
    })
  }

  if (options.writable && options.truncate && options.size) {
    tape("bad truncate", function(t) {
      createRandomAccessFile(
        "bad-truncate.txt",
        { writable: true, size: -1, truncate: true },
        function(file) {
          file.open(function(err) {
            t.ok(err)
            file.destroy(() => t.end())
          })
        }
      )
    })
  }

  tape("mkdir path", function(t) {
    createRandomAccessFile("folder/test.txt", null, function(file) {
      file.write(0, Buffer.from("hello"), function(err) {
        t.error(err, "no error")
        file.read(0, 5, function(err, buf) {
          t.error(err, "no error")
          t.same(buf, Buffer.from("hello"))
          t.end()
          file.destroy()
        })
      })
    })
  })

  tape("write/read big chunks", function(t) {
    createRandomAccessFile("read-write-big-chunks.txt", null, function(file) {
      var bigBuffer = Buffer.alloc(10 * 1024 * 1024)
      var missing = 2

      bigBuffer.fill(
        "hey. hey. how are you doing?. i am good thanks how about you? i am good"
      )

      file.write(0, bigBuffer, function(err) {
        t.error(err, "no error")
        file.read(0, bigBuffer.length, function(err, buf) {
          t.error(err, "no error")
          t.same(buf, bigBuffer)
          done()
        })
      })
      file.write(bigBuffer.length * 2, bigBuffer, function(err) {
        t.error(err, "no error")
        file.read(bigBuffer.length * 2, bigBuffer.length, function(err, buf) {
          t.error(err, "no error")
          t.same(buf, bigBuffer)
          done()
        })
      })

      function done() {
        if (!--missing) file.destroy(() => t.end())
      }
    })
  })

  if (options.del) {
    tape("del", function(t) {
      createRandomAccessFile("del.txt", null, function(file) {
        file.write(0, Buffer.alloc(100), function(err) {
          t.error(err, "no error")
          file.stat(function(err, st) {
            t.error(err, "no error")
            t.same(st.size, 100)
            file.del(0, 40, function(err) {
              t.error(err, "no error")
              file.stat(function(err, st) {
                t.error(err, "no error")
                t.same(st.size, 100, "inplace del, same size")
                file.del(50, 50, function(err) {
                  t.error(err, "no error")
                  file.stat(function(err, st) {
                    t.error(err, "no error")
                    t.same(st.size, 50)
                    file.destroy(() => t.end())
                  })
                })
              })
            })
          })
        })
      })
    })
  }

  if (options.reopen) {
    tape("open and close many times", function(t) {
      const path = "open-close-many-times.txt"
      createRandomAccessFile(path, null, function(file) {
        var buf = Buffer.alloc(4)

        file.write(0, buf, function(err) {
          t.error(err, "no error")
          loop(5000, function(err) {
            t.error(err, "no error")
            file.destroy(() => t.end())
          })
        })

        function loop(n, cb) {
          createRandomAccessFile(path, null, function(file) {
            file.read(0, 4, function(err, buffer) {
              if (err) return cb(err)
              if (!buf.equals(buffer)) {
                t.same(buffer, buf)
                return cb()
              }
              buf.writeUInt32BE(n)
              file.write(0, buf, function(err) {
                if (err) return cb(err)
                file.close(function(err) {
                  if (!n || err) return cb(err)
                  loop(n - 1, cb)
                })
              })
            })
          })
        }
      })
    })
  }

  if (options.content) {
    tape("existing content", function(t) {
      createRandomAccessFile(
        "existing-content.txt",
        {
          content: Buffer.from("contents")
        },
        function(file) {
          file.read(0, 7, function(err, buf) {
            t.error(err)
            t.deepEqual(buf, Buffer.from("content"))
            t.end()
          })
        }
      )
    })
  }
}
