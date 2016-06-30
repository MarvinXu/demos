/*
	comment:  
*/
define([], function() {
  	function lazyload(options) {
  		var $win = $(window),
  			_h = $win.height(),
  			_w = $win.width(),
  			$el,
  			$container,
  			opts = {
  				target: "img", 			//懒加载对象
  				event: "scrollStop", 	//默认事件
  				directX: false,			//是否判断x方向
  				effect: "show", 		//展示效果
  				container: window, 		//懒加载对象的容器
  				data_attribute: "src", 	//默认图片标签地址data-src
  				appear: null, 			//图片加载之前调用事件
  				load: null, 				//图片加载之后调用事件
  				placeholder: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAANSURBVBhXYzh8+PB/AAffA0nNPuCLAAAAAElFTkSuQmCC"
  			};

  		function init() {
  			if (options) {
  				$.extend(opts, options);
  			}

  			$el = $(opts.target);
  			$container = (opts.container === undefined ||
  				opts.container === window) ? $win : $(opts.container);

  			eachObj();
  			bindEvent();
  		}
  		init();

  		function bindEvent() {
  			if (0 === opts.event.indexOf("scrollStop")) {
  				registerScrollStop();

  				$win.on('pageshow', function(e) {
  					e.persisted && $win.off('touchstart', backEventOffHandler).one('touchstart', backEventOffHandler);
  				});
  			}

  			if (0 === opts.event.indexOf("scroll") || 0 === opts.event.indexOf("touch")) {
  				$container.bind(opts.event, function() {
  					return update();
  				});
  			}else{
  				$el.bind(opts.event, function() {
  					if (!this.loaded) {
  						$el.trigger("appear");
  					}
  				});
  			}

  			$win.bind("resize", function() {
  				update();
  			});

  			$(document).ready(function() {
  				update();
  			});
  		};

  		function registerScrollStop() {
  			$win.on('scroll', debounce(80, function() {
  				$win.trigger('scrollStop');
  			}, false));
  		}

  		function backEventOffHandler() {
  			$win.off('scroll');
  			registerScrollStop();
  		}

  		function update() {
  			$el.each(function() {
  				var $this = $(this);
  				if (inviewport(this, opts)) {
  					$this.trigger("appear");
  				}
  			});
  		};

  		function inviewport(element, opts) {
  			var rect = element.getBoundingClientRect();
  			if(opts.directX){
  				return (rect.top >= 0 && rect.top <= _h) ||
  					(rect.bottom >= 0 && rect.bottom <= _h) || 
  					(rect.left >= 0 && rect.left <= _w) || 
  					(rect.right >= 0 && rect.right <= _w);
  			}else{
  				return (rect.top >= 0 && rect.top <= _h) ||
  					(rect.bottom >= 0 && rect.bottom <= _h);
  			}			
  		};

  		function eachObj() {
  			$el.each(function() {
  				var self = this;
  				var $self = $(self);

  				self.loaded = false;

  				if ($self.attr("src") === undefined || $self.attr("src") === false) {
  					if ($self.is("img")) {
  						$self.attr("src", opts.placeholder);
  					}
  				}

  				$self.one("appear", function() {
  					if (!this.loaded) {
  						if (opts.appear) {
  							opts.appear.call(self, $el.length, opts);
  						}
  						$("<img />").bind("load", function() {
  							var original = $self.attr("data-" + opts.data_attribute);
  							$self.hide();
  							if ($self.is("img")) {
  								$self.attr("src", original);
  							} else {
  								$self.css("background-image", "url('" + original + "')");
  							}
  							$self[opts.effect](opts.effect_speed);

  							self.loaded = true;

  							var temp = $.grep($el, function(el) {
  								return !el.loaded;
  							});
  							$el = $(temp);

  							if (opts.load) {
  								opts.load.call(self, $el.length, opts);
  							}
  						}).attr("src", $self.attr("data-" + opts.data_attribute));
  					}
  				});
  			});
  		}

  		function debounce(delay, fn, t) {
  			return fn === undefined ? throttle(250, delay, false) : throttle(delay, fn, t === undefined ? false : t !== false);
  		}

  		function throttle(delay, fn, debounce_mode) {
  			var last = 0,
  				timeId;

  			if (typeof fn !== 'function') {
  				debounce_mode = fn;
  				fn = delay;
  				delay = 250;
  			}

  			function wrapper() {
  				var that = this,
  					period = Date.now() - last,
  					args = arguments;

  				function exec() {
  					last = Date.now();
  					fn.apply(that, args);
  				};

  				function clear() {
  					timeId = undefined;
  				};

  				if (debounce_mode && !timeId) {
  					exec();
  				}

  				timeId && clearTimeout(timeId);
  				if (debounce_mode === undefined && period > delay) {
  					exec();
  				} else {
  					timeId = setTimeout(debounce_mode ? clear : exec, debounce_mode === undefined ? delay - period : delay);
  				}
  			};
  			wrapper._zid = fn._zid = fn._zid || $.proxy(fn)._zid;
  			return wrapper;
  		}
  	}

  	return lazyload;
});
