/*
 * 基于Swipe 2.0.6和另外一个分支(https://github.com/lyfeyaj/swipe)进行部分修正，修正内容：
 * 1、当幻灯片个数小于3时，幻灯片切换时的回调函数的参数index不对；
 * 2、自动播放时，当手动滑动幻灯片之后，自动播放功能不起作用；
 * 3、当对幻灯片绑定点击时，如果用click则有300ms延迟；如果用tap则会有点透现象，提供了tap的回调函数函数，处理点透和延迟问题；
 *
 * Brad Birdsall & Felix Liu
 * Copyright 2013, MIT License
 * 初始版本：https://github.com/thebird/Swipe
 * 另一个分支：https://github.com/lyfeyaj/swipe
 */
;(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], function(){
      return factory();
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals
    root.Swipe = factory();
  }
}(this, function () {

  var root = this;
  var _document = root.document;

  function Swipe(container, options) {

        "use strict";

        // utilities
        var noop = function() {}; // simple no operation function
        var offloadFn = function(fn) {
            setTimeout(fn || noop, 0)
        }; // offload a functions execution

        // check browser capabilities
        var browser = {
            addEventListener: !!root.addEventListener,
            touch: ('ontouchstart' in root) || root.DocumentTouch && _document instanceof DocumentTouch,
            transitions: (function(temp) {
                var props = ['transitionProperty', 'WebkitTransition', 'MozTransition', 'OTransition', 'msTransition'];
                for (var i in props) {
                    if (temp.style[props[i]] !== undefined) {
                        return true;
                    }
                }
                return false;
            })(_document.createElement('swipe'))
        };

        // quit if no root element
        if (!container) {
            return;
        }
        var element = container.children[0];
        var slides, slidePos, width, length, oriLen;
        options = options || {};
        var index = parseInt(options.startSlide, 10) || 0;
        var speed = options.speed || 300;
        options.continuous = options.continuous !== undefined ? options.continuous : true;

        // AutoRestart option: auto restart slideshow after user's touch event
        options.autoRestart = options.autoRestart !== undefined ? options.autoRestart : false;

        function setup() {

            // cache slides
            slides = element.children;
            length = slides.length;
            //oriLen主要是解决当幻灯片为2个时，会copy两个幻灯片到后面去，当重新setup幻灯片时，length就变成4个，不是真实的length，这样在callback函数及getpos方法返回的index值就不对，因此记录原始的length值
            if (typeof oriLen === 'undefined') {
                oriLen = length;
            }
            // set continuous to false if only one slide
            if (slides.length < 2) {
                options.continuous = false;
            }

            //special case if two slides
            if (browser.transitions && options.continuous && slides.length < 3) {
                element.appendChild(slides[0].cloneNode(true));
                element.appendChild(element.children[1].cloneNode(true));
                slides = element.children;
            }

            // create an array to store current positions of each slide
            slidePos = new Array(slides.length);

            // determine width of each slide
            width = container.getBoundingClientRect().width || container.offsetWidth;

            element.style.width = (slides.length * width) + 'px';

            // stack elements
            var pos = slides.length;
            while (pos--) {

                var slide = slides[pos];

                slide.style.width = width + 'px';
                slide.setAttribute('data-index', pos);

                if (browser.transitions) {
                    //每一张幻灯片都定位到第index张幻灯片的下面，重叠起来
                    slide.style.left = (pos * -width) + 'px';
                    //把序号大于index的幻灯片都移动到第index+1张幻灯片的位置
                    //把序号小于index的幻灯片都移动到第index-1张幻灯片的位置
                    move(pos, index > pos ? -width : (index < pos ? width : 0), 0);
                }

            }

            // reposition elements before and after index
            // 处理初始显示的幻灯片(即第index张幻灯片)前后两张幻灯片的位置
            if (options.continuous && browser.transitions) {
                //把第index-1张幻灯片移动到第index张幻灯片的左边
                move(circle(index - 1), -width, 0);
                //把第index+1张幻灯片移动到第index张幻灯片的右边
                move(circle(index + 1), width, 0);
            }

            if (!browser.transitions) {
                //如果不支持transitions,移动幻灯片容器的位置来达到显示index幻灯片的效果
                element.style.left = (index * -width) + 'px';
            }

            container.style.visibility = 'visible';

        }

        function prev() {

            if (options.continuous) {
                slide(index - 1);
            } else {
                if (index) {
                    slide(index - 1);
                }
            }

        }

        function next() {

            if (options.continuous) {
                slide(index + 1);
            } else {
                if (index < slides.length - 1) {
                    slide(index + 1);
                }
            }
        }

        function circle(index) {

            // a simple positive modulo using slides.length
            return (slides.length + (index % slides.length)) % slides.length;

        }

        function getPos() {
            // Fix for the clone issue in the event of 2 slides
            return index % oriLen;
        }

        function slide(to, slideSpeed) {

            // do nothing if already on requested slide
            if (index === to) {
                return;
            }
            if (browser.transitions) {

                var direction = Math.abs(index - to) / (index - to); // 1: backward, -1: forward

                // get the actual position of the slide
                if (options.continuous) {
                    var natural_direction = direction;
                    direction = -slidePos[circle(to)] / width;

                    // if going forward but to < index, use to = slides.length + to
                    // if going backward but to > index, use to = -slides.length + to
                    if (direction !== natural_direction) {
                        to = -direction * slides.length + to;
                    }

                }

                var diff = Math.abs(index - to) - 1;

                // move all the slides between index and to in the right direction
                while (diff--) {
                    move(circle((to > index ? to : index) - diff - 1), width * direction, 0);
                }

                to = circle(to);

                //把当前的幻灯片朝direction方向移动一个幻灯片的位置
                move(index, width * direction, slideSpeed || speed);
                //把要显示的幻灯片移动到显示位置
                move(to, 0, slideSpeed || speed);

                if (options.continuous) {
                    //要显示的幻灯片的移动方向的下一张幻灯片移动到下一个位置
                    move(circle(to - direction), -(width * direction), 0); // we need to get the next in place
                }
            } else {
                //如果不支持transitions，通过animate函数，移动幻灯片
                to = circle(to);
                animate(index * -width, to * -width, slideSpeed || speed);
                //no fallback for a circular continuous if the browser does not accept transitions
            }
            //滑动方向 
            var slideDirect = to > index ? 'forward' : 'backward';
            index = to;
            //幻灯片切换完成之后，异步执行callback函数
            offloadFn(options.callback && options.callback(getPos(), slides[index]), slideDirect);
        }

        //移动第index张幻灯片距离显示框dist距离的位置，动画完成时间是speed ms
        function move(index, dist, speed) {

            translate(index, dist, speed);
            //slidePos里面记录的是每一张幻灯片当前最左边距离显示框的距离
            slidePos[index] = dist;

        }

        function translate(index, dist, speed) {
            var slide = slides[index];
            var style = slide && slide.style;

            if (!style) {
                return;
            }

            style.webkitTransitionDuration =
                style.MozTransitionDuration =
                style.msTransitionDuration =
                style.OTransitionDuration =
                style.transitionDuration = speed + 'ms';

            style.webkitTransform = 'translate(' + dist + 'px,0)' + 'translateZ(0)';
            style.msTransform =
                style.MozTransform =
                style.OTransform = 'translateX(' + dist + 'px)';

        }

        function animate(from, to, speed) {

            // if not an animation, just reposition
            if (!speed) {

                element.style.left = to + 'px';
                return;

            }

            var start = +new Date();

            var timer = setInterval(function() {

                var timeElap = +new Date() - start;

                if (timeElap > speed) {

                    element.style.left = to + 'px';

                    if (delay) {
                        begin();
                    }

                    if (options.transitionEnd) {
                        options.transitionEnd.call(event, getPos(), slides[index]);
                    }
                    clearInterval(timer);
                    return;

                }

                element.style.left = (((to - from) * (Math.floor((timeElap / speed) * 100) / 100)) + from) + 'px';

            }, 4);

        }

        // setup auto slideshow
        var delay = options.auto || 0;
        var interval;

        function begin() {

            interval = setTimeout(next, delay);

        }

        function stop() {

            delay = 0;
            clearTimeout(interval);

        }

        function restart() {
            stop();
            delay = options.auto || 0;
            begin();
        }

        function sendClick(targetElement, event) {
            var clickEvent, touch;

            // On some Android devices activeElement needs to be blurred otherwise the synthetic click will have no effect (#24)
            if (document.activeElement && document.activeElement !== targetElement) {
                document.activeElement.blur();
            }

            touch = event.changedTouches[0];

            // Synthesise a click event, with an extra attribute so it can be tracked
            clickEvent = document.createEvent('MouseEvents');
            clickEvent.initMouseEvent('click', true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
            clickEvent.animaClick = true;
            targetElement.dispatchEvent(clickEvent);
        }

        // setup initial vars
        var start = {};
        var delta = {};
        var isScrolling;

        // setup event capturing
        var events = {

            handleEvent: function(event) {

                switch (event.type) {
                    case 'touchstart':
                        this.start(event);
                        break;
                    case 'touchmove':
                        this.move(event);
                        break;
                    case 'touchend':
                        offloadFn(this.end(event));
                        break;
                    case 'webkitTransitionEnd':
                    case 'msTransitionEnd':
                    case 'oTransitionEnd':
                    case 'otransitionend':
                    case 'transitionend':
                        offloadFn(this.transitionEnd(event));
                        break;
                    case 'resize':
                        offloadFn(setup);
                        break;
                }

                if (options.stopPropagation) {
                    event.stopPropagation();
                }

            },
            start: function(event) {

                var touches = event.touches[0];

                // measure start values
                start = {

                    // get initial touch coords
                    x: touches.pageX,
                    y: touches.pageY,

                    //记录状态
                    status: 'tapping',

                    // store time to determine touch duration
                    time: +new Date()

                };

                // used for testing first move event
                isScrolling = undefined;

                // reset delta and end measurements
                delta = {};

                // attach touchmove and touchend listeners
                if (length > 1) {
                    element.addEventListener('touchmove', this, false);
                    element.addEventListener('touchend', this, false);
                }


            },
            move: function(event) {

                // ensure swiping with one touch and not pinching
                if (event.touches.length > 1 || event.scale && event.scale !== 1) {
                    return;
                }
                //如果当在幻灯片容器内部移动手指时不触发浏览器的滚动，就阻止默认行为，防止浏览器滚动
                if (options.disableScroll) {
                    event.preventDefault();
                }

                var touches = event.touches[0];

                // measure change in x and y
                delta = {
                    x: touches.pageX - start.x,
                    y: touches.pageY - start.y
                }

                //计算手指移动的距离，超过10认为手指已经移动了
                var distance = Math.sqrt(Math.pow(delta.x, 2) + Math.pow(delta.y, 2));

                if (start.status === 'tapping' && distance > 10) {
                    start.status = 'moving';
                }
                // determine if scrolling test has run - one time test
                if (typeof isScrolling === 'undefined') {
                    //如果x方向移动位移小于y方向的位移，认为是垂直滚动操作
                    isScrolling = !!(isScrolling || Math.abs(delta.x) < Math.abs(delta.y));
                }

                // if user is not trying to scroll vertically，如果是垂直滚动则幻灯片不操作
                if (!isScrolling) {

                    // prevent native scrolling，阻止横向的滚动
                    event.preventDefault();

                    // stop slideshow，如果手指move，先停止幻灯片自动播放
                    stop();

                    // increase resistance if first or last slide
                    if (options.continuous) { // we don't add resistance at the end
                        //前一张幻灯片移动delta.x位移
                        translate(circle(index - 1), delta.x + slidePos[circle(index - 1)], 0);
                        //当前幻灯片移动delta.x位移
                        translate(index, delta.x + slidePos[index], 0);
                        //下一张幻灯片移动delta.x位移
                        translate(circle(index + 1), delta.x + slidePos[circle(index + 1)], 0);

                    } else {
                        //如果幻灯片已经在首或尾位置，滑动的delta.x要小于手指实际滑动的距离
                        delta.x =
                            delta.x /
                            ((!index && delta.x > 0 // 如果是第一张幻灯片且向左滑动
                                    || index == slides.length - 1 // 或最后一张幻灯片且向右滑动
                                    && delta.x < 0 // and if sliding at all
                                ) ?
                                (Math.abs(delta.x) / width + 1) // determine resistance level
                                : 1); // no resistance if false

                        // translate 1:1
                        //前一张幻灯片移动delta.x位移
                        translate(index - 1, delta.x + slidePos[index - 1], 0);
                        //当前幻灯片移动delta.x位移
                        translate(index, delta.x + slidePos[index], 0);
                        //下一张幻灯片移动delta.x位移
                        translate(index + 1, delta.x + slidePos[index + 1], 0);
                    }

                }

            },
            end: function(event) {

                //判断手指是否已经移动，如果没移动，执行tap的回调函数,同时为防止click透传，阻止event的缺省行为
                if (start.status === 'tapping') {
                    //为什么需要tapCallback，因为用click给每个幻灯片绑点击事件，有300ms延迟

                    //每一个幻灯片tap点击时的回调函数 
                    options.tapCallback && options.tapCallback(getPos(), slides[index], event);

                    //为什么需要阻止默认行为，因为如果不阻止默认行为，需要使用者在tapCallback里来阻止默认行为，如果使用者不这样做，可能导致touch引起的穿透问题，例如tap了之后，跳转一个页面，会穿透到下一个页面；

                    //阻止touch默认行为导致的click引起的穿透问题
                    event.preventDefault();

                    //为什么需要伪造一个click，因为你上面阻止了touch的默认行为，将不会触发幻灯片上的click事件了，而如果你又在全局对click添加了统计，将会丢失这个click 统计；如果幻灯片里面是个alink，则不需要调用tapCallback进行处理，伪造的click自然会触发链接的跳转，同时跳转时没有300ms延迟
                    
                    //人工伪造并触发一个click事件
                    var targetElement = event.target;
                    sendClick(targetElement, event);
                }
                // measure duration
                var duration = +new Date() - start.time;

                // determine if slide attempt triggers next/prev slide
                var isValidSlide =
                    Number(duration) < 250 // if slide duration is less than 250ms
                    && Math.abs(delta.x) > 20 // and if slide amt is greater than 20px
                    || Math.abs(delta.x) > width / 2; // or if slide amt is greater than half the width

                // determine if slide attempt is past start and end
                var isPastBounds = !index && delta.x > 0 // if first slide and slide amt is greater than 0
                    || index == slides.length - 1 && delta.x < 0; // or if last slide and slide amt is less than 0

                if (options.continuous) {
                    isPastBounds = false;
                }

                // 判断幻灯片需要滑动的方向，(true:左, false:right)
                var direction = delta.x < 0;
                //滑动方向
                var slideDirect = direction ? 'forward' : 'backward';
                // if not scrolling vertically
                if (!isScrolling) {

                    if (isValidSlide && !isPastBounds) {

                        if (direction) {
                            //向左滑动
                            if (options.continuous) { // we need to get the next in this direction in place
                                //把前一张幻灯片移动到显示框左边
                                move(circle(index - 1), -width, 0);
                                move(circle(index + 2), width, 0);

                            } else {
                                //把前一张幻灯片移动到显示框左边
                                move(index - 1, -width, 0);
                            }
                            //把当前和后一张的幻灯片向左移动
                            move(index, slidePos[index] - width, speed);
                            move(circle(index + 1), slidePos[circle(index + 1)] - width, speed);
                            index = circle(index + 1);

                        } else { //手指向右滑动
                            if (options.continuous) { // we need to get the next in this direction in place
                                //把下一张幻灯片放到显示框右边 
                                move(circle(index + 1), width, 0);
                                move(circle(index - 2), -width, 0);

                            } else {
                                move(index + 1, width, 0);
                            }
                            //把当前和前一张幻灯片都向右移动
                            move(index, slidePos[index] + width, speed);
                            move(circle(index - 1), slidePos[circle(index - 1)] + width, speed);
                            index = circle(index - 1);

                        }

                        if (options.callback) {
                            options.callback(getPos(), slides[index], slideDirect);
                        }

                    } else {
                        //如果滑动的位移较小或者触碰到边界，被滑动的幻灯片回弹回去
                        if (options.continuous) {
                            //前一个幻灯片移动到显示框左边，当前移动到显示框内，下一个幻灯片移动到显示框右边
                            move(circle(index - 1), -width, speed);
                            move(index, 0, speed);
                            move(circle(index + 1), width, speed);

                        } else {

                            move(index - 1, -width, speed);
                            move(index, 0, speed);
                            move(index + 1, width, speed);
                        }

                    }

                }

                // kill touchmove and touchend event listeners until touchstart called again
                element.removeEventListener('touchmove', events, false)
                element.removeEventListener('touchend', events, false)

            },
            transitionEnd: function(event) {

                if (parseInt(event.target.getAttribute('data-index'), 10) == index) {

                    if (delay || options.autoRestart) {
                        restart();
                    }

                    if (options.transitionEnd) {
                        options.transitionEnd.call(event, getPos(), slides[index]);
                    }

                }

            }

        }

        // trigger setup
        setup();

        // start auto slideshow if applicable
        if (delay) {
            begin();
        }


        // add event listeners
        if (browser.addEventListener) {

            // set touchstart event on element
            if (browser.touch) {
                element.addEventListener('touchstart', events, false);
            }

            if (browser.transitions) {
                element.addEventListener('webkitTransitionEnd', events, false);
                element.addEventListener('msTransitionEnd', events, false);
                element.addEventListener('oTransitionEnd', events, false);
                element.addEventListener('otransitionend', events, false);
                element.addEventListener('transitionend', events, false);
            }

            // set resize event on window
            root.addEventListener('resize', events, false);

        } else {

            root.onresize = function() {
                setup()
            }; // to play nice with old IE

        }

        // expose the Swipe API
        return {
            setup: function() {

                setup();

            },
            restart: function() {
                restart();
            },
            slide: function(to, speed) {

                // cancel slideshow
                stop();

                slide(to, speed);

            },
            prev: function() {

                // cancel slideshow
                stop();

                prev();

            },
            next: function() {

                // cancel slideshow
                stop();

                next();

            },
            stop: function() {

                // cancel slideshow
                stop();

            },
            getPos: function() {

                // return current index position
                //return index;
                return getPos();

            },
            getNumSlides: function() {

                // return total number of slides
                //return length;
                return oriLen;
            },
            kill: function() {

                // cancel slideshow
                stop();

                // reset element
                element.style.width = '';
                element.style.left = '';

                // reset slides
                var pos = slides.length;
                while (pos--) {

                    var slide = slides[pos];
                    slide.style.width = '';
                    slide.style.left = '';

                    if (browser.transitions) {
                        translate(pos, 0, 0);
                    }

                }

                // removed event listeners
                if (browser.addEventListener) {

                    // remove current event listeners
                    element.removeEventListener('touchstart', events, false);
                    element.removeEventListener('webkitTransitionEnd', events, false);
                    element.removeEventListener('msTransitionEnd', events, false);
                    element.removeEventListener('oTransitionEnd', events, false);
                    element.removeEventListener('otransitionend', events, false);
                    element.removeEventListener('transitionend', events, false);
                    root.removeEventListener('resize', events, false);

                } else {

                    root.onresize = null;

                }

            }
        }

    }


    if (root.jQuery || root.Zepto) {
         (function($) {
             $.fn.Swipe = function(params) {
                 return this.each(function() {
                     $(this).data('Swipe', new Swipe($(this)[0], params));
                 });
             }
         })(root.jQuery || root.Zepto)
     }

    return Swipe;
}));
