(function(exports) {
  var cache = {}

  function loadJs(src, callback) {
    if (!cache[src]) {
      cache[src] = {
        state: 'init',
        queue: []
      }
    }

    if (cache[src].state == 'ready') {
      callback()
    } else {
      cache[src].queue.push(callback)
    }

    var doc = document;
    var head = doc.getElementsByTagName('head')[0];
    var s = doc.createElement('script');
    var re = /^(?:loaded|complete|undefined)$/;

    s.onreadystatechange =
      s.onload =
      s.onerror = function() {
        if (re.test(s.readyState)) {
          cache[src].state = 'ready'

          var queue = cache[src].queue
          for (var i = queue.length - 1; i >= 0; i--) {
            queue[i]()
            queue.pop()
          }

          s.onload = s.onerror = s.onreadystatechange = null
          s = null
        }
      }

    s.src = src
    s.async = true

    head.insertBefore(s, head.firstChild)
  }

  exports.loadJs = loadJs
})(this);


loadJs('', function() {
  (function($) {
    //必须支持pushstate
    var support =
      window.history && window.history.pushState && window.history.replaceState &&
      !navigator.userAgent.match(/((iPod|iPhone|iPad).+\bOS\s+[1-4]\D|WebApps\/.+CFNetwork)/)

    var cache = {}
    var request = function(url, callback, isCache) {
      var defaultJump = function() {
        location.href = url
      }

      var success = function(data) {
        try {
          if (isCache) {
            cache[url] = data
          }
          callback && callback(data)
        } catch (e) {
          defaultJump()
        }
      }

      if (isCache) {
        cache[url] && success(cache[url])
      }

      $.ajax({
        url: url,
        error: defaultJump,
        success: success
      })
    }

    var getContent = function(data, opts) {
      var body = data.match(opts.contentReg || /<body>[\s\r\n]+([\s\S]+)<\/body>/i)[1]
      var title = data.match(opts.titleReg || /<title>([\s\S]+)<\/title>[\s\r\n]+/i)[1]

      return {
        body: body,
        title: title
      }
    }

    var setContent = function(content, opts) {
      $(opts.container).html(content.body)
      document.title = content.title
    }

    var pushState = function(state) {
      history.pushState(state, state.title, state.url)
    }

    $.fn.ajaxLoadPage = function(opts) {
      if (!support) {
        return this
      }

      if (!opts.container) {
        opts.container = this
      }

      window.onpopstate = function(event) {
        var state = event.state
        if (!state) {
          return
        }
        request(state.url, function(data) {
          var content = getContent(data, opts)
          setContent(content, opts)
          opts.callback && opts.callback()
        }, opts.cache)
      }

      //first init, replace current state
      history.replaceState({
        url: location.href,
        title: document.title
      }, document.title)

      return this.on('click', opts.selector || 'a', function(event) {
        var link = event.currentTarget

        if (location.protocol !== link.protocol || location.hostname !== link.hostname) {
          return
        }

        event.preventDefault()

        var url = link.href
        request(url, function(data) {
          var content = getContent(data, opts)
          setContent(content, opts)
          pushState({
            url: url,
            title: content.title
          })
          opts.callback && opts.callback()
        }, opts.cache)
      })
    }
  })(jQuery)

  $('#container').ajaxLoadPage({
    cache: true,
    callback: function() {
      window.DUOSHUO && window.DUOSHUO.init()
    }
  })
})
