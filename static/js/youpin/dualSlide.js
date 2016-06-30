/*
    comment: 两个互相关联的幻灯片效果，例如详情页幻灯片效果 
*/
define(['../common/swipe'], function(Swipe) {
    /*var conf = {
        'smallSlideContainer': '.image_area_new',
        'bigSlideContainer': '.bigimg_box',
        'smallIndicator': '.image_area_new .curr_img',
        'bigIndicator': '.bigimg_topbar .curr_img',
        'btnClickBack': '.btn_back span',//值是返回按钮的path
        'bigSlideClickBack':false,
        'bigSlideMask': '#viewBigImagebg',
        'bigContainer': '#viewBigImage',
        'smallImgloadCallback': function(tmpImg,$img) {
            adjustImgSize(tmpImg,$img);
        },
        'bigImgloadCallback': function(tmpImg,$img) {
        },
        'smallSlideClickCallback':function($img,index){
            //每一个小幻灯片被点击时的回调函数
        },
        'bigSlideClickCallback':function($img,index){
            //每一个大幻灯片被点击时的回调函数
        }
    }*/

    function DualSilde(conf) {
        this.smallSlideContainer = $(conf['smallSlideContainer']);
        this.bigSlideContainer = $(conf['bigSlideContainer']);
        this.arrSmallImg = this.smallSlideContainer.find('ul img');
        this.arrBigImg = this.bigSlideContainer.find('ul img');
        this.bigSlideMask = $(conf['bigSlideMask']).length ? $(conf['bigSlideMask']) : null;
        this.bigContainer = $(conf['bigContainer']);
        this.smallIndicator = $(conf['smallIndicator']);
        this.bigIndicator = $(conf['bigIndicator']);

        //返回按钮
        if (conf['btnClickBack'] && $(conf['btnClickBack']).length) {
            this.btnBack = $(conf['btnClickBack']);
        }

        this.status = {
            winSizeChange: false,//slide隐藏期间是否窗口大小发生变化
            curShowSlide: 'none'//当前正在显示的slide类型，初始化为none，之后可能为small或big
        };
        this.conf = conf;

        this.smallSlide = null;
        this.bigSlide = null;
    }

    DualSilde.prototype = {
        constructor: DualSilde,
        init: function() {
            var that = this;
            //预先加载前两张图片
            this.showImg(0, 'small');
            this.showImg(1, 'small');

            //setup dualSlide
            this.setup();

            //窗口尺寸发生变化时，进行一些处理
            $(window).on('resize', function() {
                that.status['winSizeChange'] = true;
                //调整当前显示的slide的图片大小
                that.adjAllLoadedImg(that.status['curShowSlide']);
            });
        },
        setup: function() {
            var that = this;
            var conf = this.conf;
            var smallSlide = new Swipe(this.smallSlideContainer.get(0), {
                startSlide: 0,
                speed: 300,
                auto: false,
                continuous: false,
                disableScroll: true,
                stopPropagation: false,
                callback: function(index, elem, slideDirect) {
                    //回调时，当前展示的图片的index
                    that.smallIndicator.text(index + 1);
                    var nextIndex = slideDirect === 'forward' ? index + 1 : index - 1;
                    that.showImg(nextIndex, 'small');
                },
                needSendClick: true
            });
            this.smallSlide = smallSlide;
            this.status['curShowSlide'] = 'small';

            var bigSlide = this.bigSlide;
            //当小幻灯片中某一个被点击时，显示大幻灯片
            this.smallSlideContainer.on('click', 'li', function(e) {
                var index = $(this).index();
                that.showBigSlide(index);

                if (!bigSlide) {
                    bigSlide = new Swipe(that.bigSlideContainer.get(0), {
                        startSlide: index,
                        speed: 300,
                        auto: false,
                        continuous: false,
                        disableScroll: true,
                        stopPropagation: false,
                        callback: function(index, elem, slideDirect) {
                            //console.log(index);
                            that.bigIndicator.text(index + 1);
                            var nextIndex = slideDirect === 'forward' ? index + 1 : index - 1;
                            that.showImg(nextIndex, 'big');
                        },
                        needSendClick: true
                    });
                    that.bigSlide = bigSlide;
                } else {
                    //当操作小图幻灯片时，如果切换了屏幕大小，重置下大图幻灯片
                    if (that.status['winSizeChange']) {
                        that.adjAllLoadedImg('big');
                        bigSlide.setup();
                        that.status['winSizeChange'] = false;
                    }
                    //slide的第二个参数是幻灯片切换的时间，这里的1为设置一个非常短的时间1ms，来加载第index个图片
                    bigSlide.slide(index, 1);
                }

                //callback
                var clickCallback = that.conf['smallSlideClickCallback'];
                if ($.isFunction(clickCallback)) {
                    clickCallback($(this).find('img'), index);
                }
            });

            //点击大幻灯片的图片就返回小幻灯片模式
            var enablebigClickBack = this.conf['bigSlideClickBack'];
            this.bigSlideContainer.on('click', 'li', function(e) {
                var index = $(this).index();
                if (enablebigClickBack) {
                    that.hideBigSlide(index);
                }
                //callback
                var clickCallback = that.conf['bigSlideClickCallback'];
                if ($.isFunction(clickCallback)) {
                    clickCallback($(this).find('img'), index);
                }
            });

            //点击返回按钮返回小幻灯片模式
            if (this.btnBack) {
                this.btnBack.on('click', function() {
                    that.hideBigSlide();
                });
            }


        },
        showBigSlide: function(index) {
            if (this.bigSlideMask) {
                this.bigSlideMask.css('height', document.body.offsetHeight + 50 + 'px').show();
            }
            this.bigContainer.show();

            //显示大幻灯片的图片
            this.showImg(index, 'big');
            this.showImg(index + 1, 'big');
            this.showImg(index - 1, 'big');
            //更新大幻灯片的计数
            this.bigIndicator.text(index + 1);

            this.status['curShowSlide'] = 'big';
        },
        hideBigSlide: function(index) {
            //从大幻灯片返回小幻灯片的函数
            if (this.bigSlideMask) {
                this.bigSlideMask.hide();
            }
            this.bigContainer.hide();

            var smallSlide = this.smallSlide;
            if (this.status['winSizeChange']) {
                //当操作大图幻灯片时，如果切换了屏幕大小，重置下小图幻灯片,同时调整图片大小和位置
                this.adjAllLoadedImg('small');
                smallSlide.setup();
                this.status['winSizeChange'] = false;
            }

            //小幻灯片和大幻灯片进行同步
            if (typeof index !== 'undefined') {
                //显示小幻灯片第index张图片
                this.showImg(index, 'small');
                //更新小幻灯片的计数器
                this.smallIndicator.text(index + 1);
                //显示第index张小幻灯片
                smallSlide.slide(index, 1);
            }

            this.status['curShowSlide'] = 'small';

        },
        showImg: function(index, type) {
            console.log('showImg:' + type + ' ' + index)
            var img = (type == 'small') ? this.arrSmallImg[index] : this.arrBigImg[index];
            if (!img) {
                return;
            }
            var $img = $(img);
            if ($img.attr('data-load') == 'done') {
                return;
            }
            this.lazloadImg($img, type);
        },
        lazloadImg: function($img, type) {
            var conf = this.conf;
            var ref = $img.attr('ref');
            if (ref) {
                var tmpImg = new Image();
                tmpImg.onload = function() {
                    $img.attr('data-oriWidth', tmpImg.width);
                    $img.attr('data-oriHeight', tmpImg.height);
                    var imgLoadCallback;
                    if (imgLoadCallback = conf[type + 'ImgloadCallback']) {
                        imgLoadCallback($img);
                    }
                    $img.attr('src', ref).attr('data-load', 'done');
                    $img.removeAttr('ref');
                }
                tmpImg.src = ref;
            }
        },
        adjAllLoadedImg:function(type){
            //当幻灯片展现期间，如果窗口尺寸发生变化，需要对所有已经加载的图片重新调整大小
            var imgLoadCallback = this.conf[type + 'ImgloadCallback'];
            if (!$.isFunction(imgLoadCallback)) {
                //如果没有提供图片调整的回调函数，直接返回
                return;
            }
            var arrImg = (type == 'small') ? this.arrSmallImg : this.arrBigImg;
            var that = this;
            $(arrImg).each(function(index,img){
                var $img = $(img);
                if($img.attr('data-load')!== 'done'){
                    return;
                }
                imgLoadCallback($img);
            });
        }

    }

    return DualSilde;
});
