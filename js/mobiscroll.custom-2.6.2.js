/*jslint eqeq: true, plusplus: true, undef: true, sloppy: true, vars: true, forin: true, nomen: true */
/*!
 * jQuery MobiScroll v2.6.2
 * http://mobiscroll.com
 *
 * Copyright 2010-2013, Acid Media
 * Licensed under the MIT license.
 *
 */
(function ($) {

    function Scroller(elem, settings) {
        var m,
            hi,
            v,
            dw,
            ww, // Window width
            wh, // Window height
            rwh,
            mw, // Modal width
            mh, // Modal height
            lock,
            anim,
            debounce,
            theme,
            lang,
            click,
            scrollable,
            moved,
            start,
            startTime,
            stop,
            p,
            min,
            max,
            target,
            index,
            timer,
            readOnly,
            preventShow,
            that = this,
            ms = $.mobiscroll,
            e = elem,
            elm = $(e),
            s = extend({}, defaults),
            pres = {},
            iv = {},
            pos = {},
            pixels = {},
            wheels = [],
            input = elm.is('input'),
            visible = false,
            onStart = function (e) {
                // Scroll start
                if (testTouch(e) && !move && !isReadOnly(this) && !click) {
                    // Prevent scroll
                    e.preventDefault();

                    move = true;
                    scrollable = s.mode != 'clickpick';
                    target = $('.dw-ul', this);
                    setGlobals(target);
                    moved = iv[index] !== undefined; // Don't allow tap, if still moving
                    p = moved ? getCurrentPosition(target) : pos[index];
                    start = getCoord(e, 'Y');
                    startTime = new Date();
                    stop = start;
                    scroll(target, index, p, 0.001);

                    if (scrollable) {
                        target.closest('.dwwl').addClass('dwa');
                    }

                    $(document).on(MOVE_EVENT, onMove).on(END_EVENT, onEnd);
                }
            },
            onMove = function (e) {
                if (scrollable) {
                    e.preventDefault();
                    e.stopPropagation();
                    stop = getCoord(e, 'Y');
                    scroll(target, index, constrain(p + (start - stop) / hi, min - 1, max + 1));
                }
                moved = true;
            },
            onEnd = function (e) {
                var time = new Date() - startTime,
                    val = constrain(p + (start - stop) / hi, min - 1, max + 1),
                    speed,
                    dist,
                    tindex,
                    ttop = target.offset().top;

                if (time < 300) {
                    speed = (stop - start) / time;
                    dist = (speed * speed) / s.speedUnit;
                    if (stop - start < 0) {
                        dist = -dist;
                    }
                } else {
                    dist = stop - start;
                }

                tindex = Math.round(p - dist / hi);

                if (!dist && !moved) { // this is a "tap"
                    var idx = Math.floor((stop - ttop) / hi),
                        li = $('.dw-li', target).eq(idx),
                        hl = scrollable;

                    if (event('onValueTap', [li]) !== false) {
                        tindex = idx;
                    } else {
                        hl = true;
                    }

                    if (hl) {
                        li.addClass('dw-hl'); // Highlight
                        setTimeout(function () {
                            li.removeClass('dw-hl');
                        }, 200);
                    }
                }

                if (scrollable) {
                    calc(target, tindex, 0, true, Math.round(val));
                }

                move = false;
                target = null;

                $(document).off(MOVE_EVENT, onMove).off(END_EVENT, onEnd);
            },
            onBtnStart = function (e) {
                var btn = $(this);
                $(document).on(END_EVENT, onBtnEnd);
                // Active button
                if (!btn.hasClass('dwb-d')) {
                    btn.addClass('dwb-a');
                }
                setTimeout(function () {
                    btn.blur();
                }, 10);
                // +/- buttons
                if (btn.hasClass('dwwb')) {
                    if (testTouch(e)) {
                        step(e, btn.closest('.dwwl'), btn.hasClass('dwwbp') ? plus : minus);
                    }
                }
            },
            onBtnEnd = function (e) {
                if (click) {
                    clearInterval(timer);
                    click = false;
                }
                $(document).off(END_EVENT, onBtnEnd);
                $('.dwb-a', dw).removeClass('dwb-a');
            },
            onKeyDown = function (e) {
                if (e.keyCode == 38) { // up
                    step(e, $(this), minus);
                } else if (e.keyCode == 40) { // down
                    step(e, $(this), plus);
                }
            },
            onKeyUp = function (e) {
                if (click) {
                    clearInterval(timer);
                    click = false;
                }
            },
            onScroll = function (e) {
                if (!isReadOnly(this)) {
                    e.preventDefault();
                    e = e.originalEvent || e;
                    var delta = e.wheelDelta ? (e.wheelDelta / 120) : (e.detail ? (-e.detail / 3) : 0),
                        t = $('.dw-ul', this);

                    setGlobals(t);
                    calc(t, Math.round(pos[index] - delta), delta < 0 ? 1 : 2);
                }
            };

        // Private functions

        function step(e, w, func) {
            e.stopPropagation();
            e.preventDefault();
            if (!click && !isReadOnly(w) && !w.hasClass('dwa')) {
                click = true;
                // + Button
                var t = w.find('.dw-ul');

                setGlobals(t);
                clearInterval(timer);
                timer = setInterval(function () {
                    func(t);
                }, s.delay);
                func(t);
            }
        }

        function isReadOnly(wh) {
            if ($.isArray(s.readonly)) {
                var i = $('.dwwl', dw).index(wh);
                return s.readonly[i];
            }
            return s.readonly;
        }

        function generateWheelItems(i) {
            var html = '<div class="dw-bf">',
                ww = wheels[i],
                w = ww.values ? ww : convert(ww),
                l = 1,
                labels = w.labels || [],
                values = w.values,
                keys = w.keys || values;

            $.each(values, function (j, v) {
                if (l % 20 == 0) {
                    html += '</div><div class="dw-bf">';
                }
                html += '<div role="option" aria-selected="false" class="dw-li dw-v" data-val="' + keys[j] + '"' + (labels[j] ? ' aria-label="' + labels[j] + '"' : '') + ' style="height:' + hi + 'px;line-height:' + hi + 'px;"><div class="dw-i">' + v + '</div></div>';
                l++;
            });

            html += '</div>';
            return html;
        }

        function setGlobals(t) {
            min = $('.dw-li', t).index($('.dw-v', t).eq(0));
            max = $('.dw-li', t).index($('.dw-v', t).eq(-1));
            index = $('.dw-ul', dw).index(t);
        }

        function formatHeader(v) {
            var t = s.headerText;
            return t ? (typeof t === 'function' ? t.call(e, v) : t.replace(/\{value\}/i, v)) : '';
        }

        function read() {
            that.temp = ((input && that.val !== null && that.val != elm.val()) || that.values === null) ? s.parseValue(elm.val() || '', that) : that.values.slice(0);
            setVal();
        }

        function getCurrentPosition(t) {
            var style = window.getComputedStyle ? getComputedStyle(t[0]) : t[0].style,
                matrix,
                px;

            if (has3d) {
                $.each(['t', 'webkitT', 'MozT', 'OT', 'msT'], function (i, v) {
                    if (style[v + 'ransform'] !== undefined) {
                        matrix = style[v + 'ransform'];
                        return false;
                    }
                });
                matrix = matrix.split(')')[0].split(', ');
                px = matrix[13] || matrix[5];
            } else {
                px = style.top.replace('px', '');
            }

            return Math.round(m - (px / hi));
        }

        function ready(t, i) {
            clearTimeout(iv[i]);
            delete iv[i];
            t.closest('.dwwl').removeClass('dwa');
        }

        function scroll(t, index, val, time, active) {

            var px = (m - val) * hi,
                style = t[0].style,
                i;

            if (px == pixels[index] && iv[index]) {
                return;
            }

            if (time && px != pixels[index]) {
                // Trigger animation start event
                event('onAnimStart', [dw, index, time]);
            }

            pixels[index] = px;

            style[pr + 'Transition'] = 'all ' + (time ? time.toFixed(3) : 0) + 's ease-out';

            if (has3d) {
                style[pr + 'Transform'] = 'translate3d(0,' + px + 'px,0)';
            } else {
                style.top = px + 'px';
            }

            if (iv[index]) {
                ready(t, index);
            }

            if (time && active) {
                t.closest('.dwwl').addClass('dwa');
                iv[index] = setTimeout(function () {
                    ready(t, index);
                }, time * 1000);
            }

            pos[index] = val;
        }

        function scrollToPos(time, index, manual, dir, active) {

            // Call validation event
            if (event('validate', [dw, index, time]) !== false) {

                // Set scrollers to position
                $('.dw-ul', dw).each(function (i) {
                    var t = $(this),
                        cell = $('.dw-li[data-val="' + that.temp[i] + '"]', t),
                        cells = $('.dw-li', t),
                        v = cells.index(cell),
                        l = cells.length,
                        sc = i == index || index === undefined;

                    // Scroll to a valid cell
                    if (!cell.hasClass('dw-v')) {
                        var cell1 = cell,
                            cell2 = cell,
                            dist1 = 0,
                            dist2 = 0;

                        while (v - dist1 >= 0 && !cell1.hasClass('dw-v')) {
                            dist1++;
                            cell1 = cells.eq(v - dist1);
                        }

                        while (v + dist2 < l && !cell2.hasClass('dw-v')) {
                            dist2++;
                            cell2 = cells.eq(v + dist2);
                        }

                        // If we have direction (+/- or mouse wheel), the distance does not count
                        if (((dist2 < dist1 && dist2 && dir !== 2) || !dist1 || (v - dist1 < 0) || dir == 1) && cell2.hasClass('dw-v')) {
                            cell = cell2;
                            v = v + dist2;
                        } else {
                            cell = cell1;
                            v = v - dist1;
                        }
                    }

                    if (!(cell.hasClass('dw-sel')) || sc) {
                        // Set valid value
                        that.temp[i] = cell.attr('data-val');

                        // Add selected class to cell
                        $('.dw-sel', t).removeClass('dw-sel');

                        if (!s.multiple) {
                            $('.dw-sel', t).removeAttr('aria-selected');
                            cell.attr('aria-selected', 'true');
                        }

                        cell.addClass('dw-sel');

                        // Scroll to position
                        scroll(t, i, v, sc ? time : 0.1, sc ? active : false);
                    }
                });

                // Reformat value if validation changed something
                v = s.formatResult(that.temp);
                if (s.display == 'inline') {
                    setVal(manual, 0, true);
                } else {
                    $('.dwv', dw).html(formatHeader(v));
                }

                if (manual) {
                    event('onChange', [v]);
                }
            }

        }

        function event(name, args) {
            var ret;
            args.push(that);
            $.each([theme.defaults, pres, settings], function (i, v) {
                if (v[name]) { // Call preset event
                    ret = v[name].apply(e, args);
                }
            });
            return ret;
        }

        function calc(t, val, dir, anim, orig) {
            val = constrain(val, min, max);

            var cell = $('.dw-li', t).eq(val),
                o = orig === undefined ? val : orig,
                idx = index,
                time = anim ? (val == o ? 0.1 : Math.abs((val - o) * s.timeUnit)) : 0;

            // Set selected scroller value
            that.temp[idx] = cell.attr('data-val');

            scroll(t, idx, val, time, orig);

            setTimeout(function () {
                // Validate
                scrollToPos(time, idx, true, dir, orig !== undefined);
            }, 10);
        }

        function plus(t) {
            var val = pos[index] + 1;
            calc(t, val > max ? min : val, 1, true);
        }

        function minus(t) {
            var val = pos[index] - 1;
            calc(t, val < min ? max : val, 2, true);
        }

        function setVal(fill, time, noscroll, temp) {

            if (visible && !noscroll) {
                scrollToPos(time);
            }

            v = s.formatResult(that.temp);

            if (!temp) {
                that.values = that.temp.slice(0);
                that.val = v;
            }

            if (fill) {
                if (input) {
                    elm.val(v).trigger('change');
                }
            }
        }

        // Public functions

        that.position = function (check) {

            if (s.display == 'inline' || (ww === $(window).width() && rwh === $(window).height() && check) || (event('onPosition', [dw]) === false)) {
                return;
            }

            var w,
                l,
                t,
                aw, // anchor width
                ah, // anchor height
                ap, // anchor position
                at, // anchor top
                al, // anchor left
                arr, // arrow
                arrw, // arrow width
                arrl, // arrow left
                scroll,
                totalw = 0,
                minw = 0,
                st = $(window).scrollTop(),
                wr = $('.dwwr', dw),
                d = $('.dw', dw),
                css = {},
                anchor = s.anchor === undefined ? elm : s.anchor;

            ww = $(window).width();
            rwh = $(window).height();
            wh = window.innerHeight; // on iOS we need innerHeight
            wh = wh || rwh;

            if (/modal|bubble/.test(s.display)) {
                $('.dwc', dw).each(function () {
                    w = $(this).outerWidth(true);
                    totalw += w;
                    minw = (w > minw) ? w : minw;
                });
                w = totalw > ww ? minw : totalw;
                wr.width(w).css('white-space', totalw > ww ? '' : 'nowrap');
            }

            mw = d.outerWidth();
            mh = d.outerHeight(true);

            lock = mh <= wh && mw <= ww;

            if (s.display == 'modal') {
                l = (ww - mw) / 2;
                t = st + (wh - mh) / 2;
            } else if (s.display == 'bubble') {
                scroll = true;
                arr = $('.dw-arrw-i', dw);
                ap = anchor.offset();
                at = ap.top;
                al = ap.left;

                // horizontal positioning
                aw = anchor.outerWidth();
                ah = anchor.outerHeight();
                l = al - (d.outerWidth(true) - aw) / 2;
                l = l > (ww - mw) ? (ww - (mw + 20)) : l;
                l = l >= 0 ? l : 20;

                // vertical positioning
                t = at - mh; // above the input
                if ((t < st) || (at > st + wh)) { // if doesn't fit above or the input is out of the screen
                    d.removeClass('dw-bubble-top').addClass('dw-bubble-bottom');
                    t = at + ah; // below the input
                } else {
                    d.removeClass('dw-bubble-bottom').addClass('dw-bubble-top');
                }

                // Calculate Arrow position
                arrw = arr.outerWidth();
                arrl = al + aw / 2 - (l + (mw - arrw) / 2);

                // Limit Arrow position
                $('.dw-arr', dw).css({left: constrain(arrl, 0, arrw)});
            } else {
                css.width = '100%';
                if (s.display == 'top') {
                    t = st;
                } else if (s.display == 'bottom') {
                    t = st + wh - mh;
                }
            }

            css.top = t < 0 ? 0 : t;
            css.left = l;
            d.css(css);

            // If top + modal height > doc height, increase doc height
            $('.dw-persp', dw).height(0).height(t + mh > $(document).height() ? t + mh : $(document).height());

            // Scroll needed
            if (scroll && ((t + mh > st + wh) || (at > st + wh))) {
                $(window).scrollTop(t + mh - wh);
            }
        };

        /**
         * Enables the scroller and the associated input.
         */
        that.enable = function () {
            s.disabled = false;
            if (input) {
                elm.prop('disabled', false);
            }
        };

        /**
         * Disables the scroller and the associated input.
         */
        that.disable = function () {
            s.disabled = true;
            if (input) {
                elm.prop('disabled', true);
            }
        };

        /**
         * Gets the selected wheel values, formats it, and set the value of the scroller instance.
         * If input parameter is true, populates the associated input element.
         * @param {Array} values - Wheel values.
         * @param {Boolean} [fill=false] - Also set the value of the associated input element.
         * @param {Number} [time=0] - Animation time
         * @param {Boolean} [temp=false] - If true, then only set the temporary value.(only scroll there but not set the value)
         */
        that.setValue = function (values, fill, time, temp) {
            that.temp = $.isArray(values) ? values.slice(0) : s.parseValue.call(e, values + '', that);
            setVal(fill, time, false, temp);
        };

        that.getValue = function () {
            return that.values;
        };

        that.getValues = function () {
            var ret = [],
                i;

            for (i in that._selectedValues) {
                ret.push(that._selectedValues[i]);
            }
            return ret;
        };

        /**
         * Changes the values of a wheel, and scrolls to the correct position
         */
        that.changeWheel = function (idx, time) {
            if (dw) {
                var i = 0,
                    nr = idx.length;

                $.each(s.wheels, function (j, wg) {
                    $.each(wg, function (k, w) {
                        if ($.inArray(i, idx) > -1) {
                            wheels[i] = w;
                            $('.dw-ul', dw).eq(i).html(generateWheelItems(i));
                            nr--;
                            if (!nr) {
                                that.position();
                                scrollToPos(time, undefined, true);
                                return false;
                            }
                        }
                        i++;
                    });
                    if (!nr) {
                        return false;
                    }
                });
            }
        };

        /**
         * Return true if the scroller is currently visible.
         */
        that.isVisible = function () {
            return visible;
        };

        that.tap = function (el, handler) {
            var startX,
                startY;

            if (s.tap) {
                el.on('touchstart.dw', function (e) {
                    e.preventDefault();
                    startX = getCoord(e, 'X');
                    startY = getCoord(e, 'Y');
                }).on('touchend.dw', function (e) {
                    // If movement is less than 20px, fire the click event handler
                    if (Math.abs(getCoord(e, 'X') - startX) < 20 && Math.abs(getCoord(e, 'Y') - startY) < 20) {
                        handler.call(this, e);
                    }
                    tap = true;
                    setTimeout(function () {
                        tap = false;
                    }, 300);
                });
            }

            el.on('click.dw', function (e) {
                if (!tap) {
                    // If handler was not called on touchend, call it on click;
                    handler.call(this, e);
                }
            });

        };

        /**
         * Shows the scroller instance.
         * @param {Boolean} prevAnim - Prevent animation if true
         */
        that.show = function (prevAnim) {
            if (s.disabled || visible) {
                return false;
            }

            if (s.display == 'top') {
                anim = 'slidedown';
            }

            if (s.display == 'bottom') {
                anim = 'slideup';
            }

            // Parse value from input
            read();

            event('onBeforeShow', []);

            // Create wheels
            var lbl,
                l = 0,
                mAnim = '';

            if (anim && !prevAnim) {
                mAnim = 'dw-' + anim + ' dw-in';
            }
            // Create wheels containers
            var html = '<div role="dialog" class="' + s.theme + ' dw-' + s.display + (prefix ? ' dw' + prefix : '') + '">' + (s.display == 'inline' ? '<div class="dw dwbg dwi"><div class="dwwr">' : '<div class="dw-persp"><div class="dwo"></div><div class="dw dwbg ' + mAnim + '"><div class="dw-arrw"><div class="dw-arrw-i"><div class="dw-arr"></div></div></div><div class="dwwr"><div aria-live="assertive" class="dwv' + (s.headerText ? '' : ' dw-hidden') + '"></div>') + '<div class="dwcc">';

            $.each(s.wheels, function (i, wg) { // Wheel groups
                html += '<div class="dwc' + (s.mode != 'scroller' ? ' dwpm' : ' dwsc') + (s.showLabel ? '' : ' dwhl') + '"><div class="dwwc dwrc"><table cellpadding="0" cellspacing="0"><tr>';
                $.each(wg, function (j, w) { // Wheels
                    wheels[l] = w;
                    lbl = w.label !== undefined ? w.label : j;
                    html += '<td><div class="dwwl dwrc dwwl' + l + '">' + (s.mode != 'scroller' ? '<div class="dwb-e dwwb dwwbp" style="height:' + hi + 'px;line-height:' + hi + 'px;"><span>+</span></div><div class="dwb-e dwwb dwwbm" style="height:' + hi + 'px;line-height:' + hi + 'px;"><span>&ndash;</span></div>' : '') + '<div class="dwl">' + lbl + '</div><div tabindex="0" aria-live="off" aria-label="' + lbl + '" role="listbox" class="dwww"><div class="dww" style="height:' + (s.rows * hi) + 'px;min-width:' + s.width + 'px;"><div class="dw-ul">';
                    // Create wheel values
                    html += generateWheelItems(l);
                    html += '</div><div class="dwwol"></div></div><div class="dwwo"></div></div><div class="dwwol"></div></div></td>';
                    l++;
                });

                html += '</tr></table></div></div>';
            });

            html += '</div>' + (s.display != 'inline' ? '<div class="dwbc' + (s.button3 ? ' dwbc-p' : '') + '"><span class="dwbw dwb-s"><span class="dwb dwb-e" role="button" tabindex="0">' + s.setText + '</span></span>' + (s.button3 ? '<span class="dwbw dwb-n"><span class="dwb dwb-e" role="button" tabindex="0">' + s.button3Text + '</span></span>' : '') + '<span class="dwbw dwb-c"><span class="dwb dwb-e" role="button" tabindex="0">' + s.cancelText + '</span></span></div></div>' : '') + '</div></div></div>';
            dw = $(html);

            scrollToPos();

            event('onMarkupReady', [dw]);

            // Show
            if (s.display != 'inline') {
                dw.appendTo('body');
                if (anim && !prevAnim) {
                    dw.addClass('dw-trans');
                    // Remove animation class
                    setTimeout(function () {
                        dw.removeClass('dw-trans').find('.dw').removeClass(mAnim);
                    }, 350);
                }
            } else if (elm.is('div')) {
                elm.html(dw);
            } else {
                dw.insertAfter(elm);
            }

            event('onMarkupInserted', [dw]);

            visible = true;

            // Theme init
            theme.init(dw, that);

            if (s.display != 'inline') {
                // Init buttons
                that.tap($('.dwb-s span', dw), function () {
                    that.select();
                });

                that.tap($('.dwb-c span', dw), function () {
                    that.cancel();
                });

                if (s.button3) {
                    that.tap($('.dwb-n span', dw), s.button3);
                }

                // Enter / ESC
                $(window).on('keydown.dw', function (e) {
                    if (e.keyCode == 13) {
                        that.select();
                    } else if (e.keyCode == 27) {
                        that.cancel();
                    }
                });

                // Prevent scroll if not specified otherwise
                if (s.scrollLock) {
                    dw.on('touchmove touchstart', function (e) {
                        if (lock) {
                            e.preventDefault();
                        }
                    });
                }

                // Disable inputs to prevent bleed through (Android bug) and set autocomplete to off (for Firefox)
                $('input,select,button').each(function () {
                    if (!this.disabled) {
                        if ($(this).attr('autocomplete')) {
                            $(this).data('autocomplete', $(this).attr('autocomplete'));
                        }
                        $(this).addClass('dwtd').prop('disabled', true).attr('autocomplete', 'off');
                    }
                });

                // Set position
                that.position();
                $(window).on('orientationchange.dw resize.dw scroll.dw', function (e) {
                    // Sometimes scrollTop is not correctly set, so we wait a little
                    clearTimeout(debounce);
                    debounce = setTimeout(function () {
                        var scroll = e.type == 'scroll';
                        if ((scroll && lock) || !scroll) {
                            that.position(!scroll);
                        }
                    }, 100);
                });

                that.alert(s.ariaDesc);
            }

            // Events
            $('.dwwl', dw)
                .on('DOMMouseScroll mousewheel', onScroll)
                .on(START_EVENT, onStart)
                .on('keydown', onKeyDown)
                .on('keyup', onKeyUp);

            dw.on(START_EVENT, '.dwb-e', onBtnStart).on('keydown', '.dwb-e', function (e) {
                if (e.keyCode == 32) { // Space
                    e.preventDefault();
                    e.stopPropagation();
                    $(this).click();
                }
            });

            event('onShow', [dw, v]);
        };

        /**
         * Hides the scroller instance.
         */
        that.hide = function (prevAnim, btn) {
            // If onClose handler returns false, prevent hide
            if (!visible || event('onClose', [v, btn]) === false) {
                return false;
            }

            // Re-enable temporary disabled fields
            $('.dwtd').each(function () {
                $(this).prop('disabled', false).removeClass('dwtd');
                if ($(this).data('autocomplete')) {
                    $(this).attr('autocomplete', $(this).data('autocomplete'));
                } else {
                    $(this).removeAttr('autocomplete');
                }
            });

            // Hide wheels and overlay
            if (dw) {
                if (s.display != 'inline' && anim && !prevAnim) {
                    dw.addClass('dw-trans').find('.dw').addClass('dw-' + anim + ' dw-out');
                    setTimeout(function () {
                        dw.remove();
                        dw = null;
                    }, 350);
                } else {
                    dw.remove();
                    dw = null;
                }

                // Stop positioning on window resize
                $(window).off('.dw');
            }

            pixels = {};
            visible = false;
            preventShow = true;

            elm.focus();
        };

        that.select = function () {
            if (that.hide(false, 'set') !== false) {
                setVal(true, 0, true);
                event('onSelect', [that.val]);
            }
        };

        that.alert = function (txt) {
            aria.text(txt);
            clearTimeout(alertTimer);
            alertTimer = setTimeout(function () {
                aria.text('');
            }, 5000);
        };

        /**
         * Cancel and hide the scroller instance.
         */
        that.cancel = function () {
            if (that.hide(false, 'cancel') !== false) {
                event('onCancel', [that.val]);
            }
        };

        /**
         * Scroller initialization.
         */
        that.init = function (ss) {
            // Get theme defaults
            theme = extend({defaults: {}, init: empty}, ms.themes[ss.theme || s.theme]);

            // Get language defaults
            lang = ms.i18n[ss.lang || s.lang];

            extend(settings, ss); // Update original user settings
            extend(s, theme.defaults, lang, settings);

            that.settings = s;

            // Unbind all events (if re-init)
            elm.off('.dw');

            var preset = ms.presets[s.preset];

            if (preset) {
                pres = preset.call(e, that);
                extend(s, pres, settings); // Load preset settings
            }

            // Set private members
            m = Math.floor(s.rows / 2);
            hi = s.height;
            anim = s.animate;

            if (visible) {
                that.hide();
            }

            if (s.display == 'inline') {
                that.show();
            } else {
                read();
                if (input) {
                    // Set element readonly, save original state
                    if (readOnly === undefined) {
                        readOnly = e.readOnly;
                    }
                    e.readOnly = true;
                    // Init show datewheel
                    if (s.showOnFocus) {
                        elm.on('focus.dw', function () {
                            if (!preventShow) {
                                that.show();
                            }
                            preventShow = false;
                        });
                    }
                }
                if (s.showOnTap) {
                    that.tap(elm, function () {
                        that.show();
                    });
                }
            }
        };

        that.trigger = function (name, params) {
            return event(name, params);
        };

        that.option = function (opt, value) {
            var obj = {};
            if (typeof opt === 'object') {
                obj = opt;
            } else {
                obj[opt] = value;
            }
            that.init(obj);
        };

        that.destroy = function () {
            that.hide();
            elm.off('.dw');
            delete scrollers[e.id];
            if (input) {
                e.readOnly = readOnly;
            }
        };

        that.getInst = function () {
            return that;
        };

        that.values = null;
        that.val = null;
        that.temp = null;
        that._selectedValues = {};

        that.init(settings);
        /**
         * 新增初始化事件
         */
        event('onInit', []);
    }

    function testProps(props) {
        var i;
        for (i in props) {
            if (mod[props[i]] !== undefined) {
                return true;
            }
        }
        return false;
    }

    function testPrefix() {
        var prefixes = ['Webkit', 'Moz', 'O', 'ms'],
            p;

        for (p in prefixes) {
            if (testProps([prefixes[p] + 'Transform'])) {
                return '-' + prefixes[p].toLowerCase();
            }
        }
        return '';
    }

    function testTouch(e) {
        if (e.type === 'touchstart') {
            touch = true;
            /*setTimeout(function () {
                touch = false; // Reset if mouse event was not fired
            }, 500);*/
        } else if (touch) {
            touch = false;
            return false;
        }
        return true;
    }

    function getCoord(e, c) {
        var org = e.originalEvent,
            ct = e.changedTouches;
        return ct || (org && org.changedTouches) ? (org ? org.changedTouches[0]['page' + c] : ct[0]['page' + c]) : e['page' + c];

    }

    function constrain(val, min, max) {
        return Math.max(min, Math.min(val, max));
    }

    function convert(w) {
        var ret = {
            values: [],
            keys: []
        };
        $.each(w, function (k, v) {
            ret.keys.push(k);
            ret.values.push(v);
        });
        return ret;
    }

    function init(that, options, args) {
        var ret = that;

        // Init
        if (typeof options === 'object') {
            return that.each(function () {
                if (!this.id) {
                    uuid += 1;
                    this.id = 'mobiscroll' + uuid;
                }
                scrollers[this.id] = new Scroller(this, options);
            });
        }

        // Method call
        if (typeof options === 'string') {
            that.each(function () {
                var r,
                    inst = scrollers[this.id];

                if (inst && inst[options]) {
                    r = inst[options].apply(this, Array.prototype.slice.call(args, 1));
                    if (r !== undefined) {
                        ret = r;
                        return false;
                    }
                }
            });
        }

        return ret;
    }

    var move,
        tap,
        touch,
        alertTimer,
        aria,
        date = new Date(),
        uuid = date.getTime(),
        scrollers = {},
        empty = function () {
        },
        mod = document.createElement('modernizr').style,
        has3d = testProps(['perspectiveProperty', 'WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective']),
        prefix = testPrefix(),
        pr = prefix.replace(/^\-/, '').replace('moz', 'Moz'),
        extend = $.extend,
        START_EVENT = 'touchstart mousedown',
        MOVE_EVENT = 'touchmove mousemove',
        END_EVENT = 'touchend mouseup',
        defaults = {
            // Options
            width: 70,
            height: 40,
            rows: 3,
            delay: 300,
            disabled: false,
            readonly: false,
            showOnFocus: true,
            showOnTap: true,
            showLabel: true,
            wheels: [],
            theme: '',
            headerText: '{value}',
            display: 'modal',
            mode: 'scroller',
            preset: '',
            lang: 'en-US',
            setText: 'Set',
            cancelText: 'Cancel',
            ariaDesc: 'Select a value',
            scrollLock: true,
            tap: true,
            speedUnit: 0.0012,
            timeUnit: 0.1,
            formatResult: function (d) {
                return d.join(' ');
            },
            parseValue: function (value, inst) {
                var val = value.split(' '),
                    ret = [],
                    i = 0,
                    keys;

                $.each(inst.settings.wheels, function (j, wg) {
                    $.each(wg, function (k, w) {
                        w = w.values ? w : convert(w);
                        keys = w.keys || w.values;
                        if ($.inArray(val[i], keys) !== -1) {
                            ret.push(val[i]);
                        } else {
                            ret.push(keys[0]);
                        }
                        i++;
                    });
                });
                return ret;
            }
        };

    $(function () {
        aria = $('<div class="dw-hidden" role="alert"></div>').appendTo('body');
    });

    $(document).on('mouseover mouseup mousedown click', function (e) { // Prevent standard behaviour on body click
        if (tap) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    });

    $.fn.mobiscroll = function (method) {
        extend(this, $.mobiscroll.shorts);
        return init(this, method, arguments);
    };

    $.mobiscroll = $.mobiscroll || {
        /**
         * Set settings for all instances.
         * @param {Object} o - New default settings.
         */
        setDefaults: function (o) {
            extend(defaults, o);
        },
        presetShort: function (name) {
            this.shorts[name] = function (method) {
                return init(this, extend(method, {preset: name}), arguments);
            };
        },
        has3d: has3d,
        shorts: {},
        presets: {},
        themes: {},
        i18n: {}
    };

    $.scroller = $.scroller || $.mobiscroll;
    $.fn.scroller = $.fn.scroller || $.fn.mobiscroll;

})(jQuery);
(function ($) {

    $.mobiscroll.themes.android = {
        defaults: {
            dateOrder: 'Mddyy',
            mode: 'clickpick',
            height: 50,
            showLabel: false
        }
    };

})(jQuery);


(function ($) {
    var theme = {
        defaults: {
            dateOrder: 'Mddyy',
            mode: 'mixed',
            rows: 5,
            width: 70,
            height: 36,
            showLabel: false,
            useShortLabels: true
        }
    };

    $.mobiscroll.themes['android-ics'] = theme;
    $.mobiscroll.themes['android-ics light'] = theme;

})(jQuery);


(function ($) {
    $.mobiscroll.i18n.de = $.extend($.mobiscroll.i18n.de, {
        // Core
        setText: 'OK',
        cancelText: 'Abbrechen',
        // Datetime component
        dateFormat: 'dd.mm.yy',
        dateOrder: 'ddmmyy',
        dayNames: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
        dayNamesShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
        dayText: 'Tag',
        hourText: 'Stunde',
        minuteText: 'Minuten',
        monthNames: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
        monthNamesShort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
        monthText: 'Monat',
        secText: 'Sekunden',
        timeFormat: 'HH:ii',
        timeWheels: 'HHii',
        yearText: 'Jahr',
        nowText: 'Jetzt',
        // Calendar component
        dateText: 'Datum',
        timeText: 'Zeit',
        calendarText: 'Kalender',
        // Measurement components
        wholeText: 'Ganze Zahl',
        fractionText: 'Bruchzahl',
        unitText: 'Maßeinheit',
        // Time / Timespan component
        labels: ['Jahre', 'Monate', 'Tage', 'Stunden', 'Minuten', 'Sekunden', ''],
        labelsShort: ['Yrs', 'Mths', 'Days', 'Hrs', 'Mins', 'Secs', ''],
        // Timer component
        startText: 'Start',
        stopText: 'Stop',
        resetText: 'Reset',
        lapText: 'Lap',
        hideText: 'Hide'
    });
})(jQuery);

(function ($) {
    $.mobiscroll.i18n.es = $.extend($.mobiscroll.i18n.es, {
        // Core
        setText: 'Aceptar',
        cancelText: 'Cancelar',
        // Datetime component
        dateFormat: 'dd/mm/yy',
        dateOrder: 'ddmmyy',
        dayNames: ['Domingo', 'Lunes', 'Martes', 'Mi&#xE9;rcoles', 'Jueves', 'Viernes', 'S&#xE1;bado'],
        dayNamesShort: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'S&#xE1;'],
        dayText: 'D&#237;a',
        hourText: 'Horas',
        minuteText: 'Minutos',
        monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
        monthText: 'Mes',
        secText: 'Segundos',
        timeFormat: 'HH:ii',
        timeWheels: 'HHii',
        yearText: 'A&ntilde;o',
        nowText: 'Ahora',
        // Calendar component
        dateText: 'Fecha',
        timeText: 'Tiempo',
        calendarText: 'Calendario',
        // Measurement components
        wholeText: 'Entero',
        fractionText: 'Fracción',
        unitText: 'Unidad',
        // Time / Timespan component
        labels: ['Años', 'Meses', 'Días', 'Horas', 'Minutos', 'Segundos', ''],
        labelsShort: ['Yrs', 'Mths', 'Days', 'Hrs', 'Mins', 'Secs', ''],
        // Timer component
        startText: 'Iniciar',
        stopText: 'Deténgase',
        resetText: 'Reinicializar',
        lapText: 'Lap',
        hideText: 'Esconder'
    });
})(jQuery);

(function ($) {
    $.mobiscroll.i18n.fr = $.extend($.mobiscroll.i18n.fr, {
        // Core
        setText: 'Terminé',
        cancelText: 'Annuler',
        // Datetime component
        dateFormat: 'dd/mm/yy',
        dateOrder: 'ddmmyy',
        dayNames: ['&#68;imanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
        dayNamesShort: ['&#68;im.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
        dayText: 'Jour',
        monthText: 'Mois',
        monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
        monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
        hourText: 'Heures',
        minuteText: 'Minutes',
        secText: 'Secondes',
        timeFormat: 'HH:ii',
        timeWheels: 'HHii',
        yearText: 'Année',
        nowText: 'Maintenant',
        // Calendar component
        dateText: 'Date',
        timeText: 'Heure',
        calendarText: 'Calendrier',
        // Measurement components
        wholeText: 'Entier',
        fractionText: 'Fraction',
        unitText: 'Unité',
        // Time / Timespan component
        labels: ['Ans', 'Mois', 'Jours', 'Heures', 'Minutes', 'Secondes', ''],
        labelsShort: ['Yrs', 'Mths', 'Days', 'Hrs', 'Mins', 'Secs', ''],
        // Timer component
        startText: 'Indít',
        stopText: 'Megállít',
        resetText: 'Visszaállít',
        lapText: 'Lap',
        hideText: 'Elrejt'
    });
})(jQuery);

(function ($) {
    $.mobiscroll.i18n.hu = $.extend($.mobiscroll.i18n.hu, {
        // Core
        setText: 'OK',
        cancelText: 'Mégse',
        // Datetime component
        dateFormat: 'yy.mm.dd',
        dateOrder: 'yymmdd',
        dayNames: ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'],
        dayNamesShort: ['Va', 'Hé', 'Ke', 'Sze', 'Csü', 'Pé', 'Szo'],
        dayText: 'Nap',
        hourText: 'Óra',
        minuteText: 'Perc',
        monthNames: ['Január', 'Február', 'Március', 'Április', 'Május', 'Június', 'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'],
        monthNamesShort: ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'],
        monthText: 'Hónap',
        secText: 'Másodperc',
        timeFormat: 'HH:ii',
        timeWheels: 'HHii',
        yearText: 'Év',
        nowText: 'Most',
        // Calendar component
        dateText: 'Dátum',
        timeText: 'Idő',
        calendarText: 'Naptár',
        // Measurement components
        wholeText: 'Egész',
        fractionText: 'Tört',
        unitText: 'Egység',
        // Time / Timespan component
        labels: ['Év', 'Hónap', 'Nap', 'Óra', 'Perc', 'Másodperc', ''],
        labelsShort: ['Év', 'Hó.', 'Nap', 'Óra', 'Perc', 'Mp.', ''],
        // Timer component
        startText: 'Indít',
        stopText: 'Megállít',
        resetText: 'Visszaállít',
        lapText: 'Lap',
        hideText: 'Elrejt'
    });
})(jQuery);

(function ($) {
    $.mobiscroll.i18n.it = $.extend($.mobiscroll.i18n.it, {
        // Core
        setText: 'OK',
        cancelText: 'Annulla',
        // Datetime component
        dateFormat: 'dd-mm-yyyy',
        dateOrder: 'ddmmyy',
        dayNames: ['Domenica', 'Luned&Igrave;', 'Merted&Igrave;', 'Mercoled&Igrave;', 'Gioved&Igrave;', 'Venerd&Igrave;', 'Sabato'],
        dayNamesShort: ['Do', 'Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa'],
        dayText: 'Giorno',
        hourText: 'Ore',
        minuteText: 'Minuti',
        monthNames: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
        monthNamesShort: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'],
        monthText: 'Mese',
        secText: 'Secondi',
        timeFormat: 'HH:ii',
        timeWheels: 'HHii',
        yearText: 'Anno',
        // Calendar component
        dateText: 'Data',
        timeText: 'Volta',
        calendarText: 'Calendario',
        // Measurement components
        wholeText: 'Intero',
        fractionText: 'Frazione',
        unitText: 'Unità',
        // Time / Timespan component
        labels: ['Anni', 'Mesi', 'Giorni', 'Ore', 'Minuti', 'Secondi', ''],
        labelsShort: ['Yrs', 'Mths', 'Days', 'Hrs', 'Mins', 'Secs', ''],
        // Timer component
        startText: 'Inizio',
        stopText: 'Arresto',
        resetText: 'Ripristina',
        lapText: 'Lap',
        hideText: 'Nascondi'
    });
})(jQuery);

(function ($) {
    $.mobiscroll.i18n.ja = $.extend($.mobiscroll.i18n.ja, {
        // Core
        setText: 'セット',
        cancelText: 'キャンセル',
        // Datetime component
        dateFormat: 'yy年mm月dd日',
        dateOrder: 'yymmdd',
        dayNames: ['日', '月', '火', '水', '木', '金', '土'],
        dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
        dayText: '日',
        hourText: '時',
        minuteText: '分',
        monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        monthNamesShort: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        monthText: '月',
        secText: '秒',
        timeFormat: 'HH:ii',
        timeWheels: 'HHii',
        yearText: '年',
        nowText: '今',
        // Calendar component
        dateText: '日付',
        timeText: '時間',
        calendarText: 'カレンダー',
        // Measurement components
        wholeText: '全数',
        fractionText: '分数',
        unitText: '単位',
        // Time / Timespan component
        labels: ['年間', '月間', '日間', '時間', '分', '秒', ''],
        labelsShort: ['年間', '月間', '日間', '時間', '分', '秒', ''],
        // Timer component
        startText: '開始',
        stopText: '停止',
        resetText: 'リセット',
        lapText: 'ラップ',
        hideText: '隠す'
    });
})(jQuery);

(function ($) {
    $.mobiscroll.i18n.nl = $.extend($.mobiscroll.i18n.nl, {
        // Core
        setText: 'Instellen',
        cancelText: 'Annuleer',
        // Datetime component
        dateFormat: 'dd/mm/yy',
        dateOrder: 'ddmmyy',
        dayNames: ['zondag', 'maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'],
        dayNamesShort: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
        dayText: 'Dag',
        hourText: 'Uur',
        minuteText: 'Minuten',
        monthNames: ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
        monthNamesShort: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
        monthText: 'Maand',
        secText: 'Seconden',
        timeFormat: 'hh:ii A',
        timeWheels: 'hhiiA',
        yearText: 'Jaar',
        nowText: 'Nu',
        // Calendar component
        dateText: 'Datum',
        timeText: 'Tijd',
        calendarText: 'Kalender',
        // Measurement components
        wholeText: 'geheel',
        fractionText: 'fractie',
        unitText: 'eenheid',
        // Time / Timespan component
        labels: ['Jaren', 'Maanden', 'Dagen', 'Uren', 'Minuten', 'Seconden', ''],
        labelsShort: ['j', 'm', 'd', 'u', 'min', 'sec', ''],
        // Timer component
        startText: 'Start',
        stopText: 'Stop',
        resetText: 'Reset',
        lapText: 'Lap',
        hideText: 'Verbergen'
    });
})(jQuery);

(function ($) {
    $.mobiscroll.i18n.no = $.extend($.mobiscroll.i18n.no, {
        // Core
        setText: 'OK',
        cancelText: 'Avbryt',
        // Datetime component
        dateFormat: 'dd.mm.yy',
        dateOrder: 'ddmmyy',
        dayNames: ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'],
        dayNamesShort: ['Sø', 'Ma', 'Ti', 'On', 'To', 'Fr', 'Lø'],
        dayText: 'Dag',
        hourText: 'Time',
        minuteText: 'Minutt',
        monthNames: ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'],
        monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'],
        monthText: 'Måned',
        secText: 'Sekund',
        timeFormat: 'HH:ii',
        timeWheels: 'HHii',
        yearText: 'År',
        nowText: 'Nå',
        // Calendar component
        dateText: 'Dato',
        timeText: 'Tid',
        calendarText: 'Kalender',
        // Measurement components
        wholeText: 'Hele',
        fractionText: 'Fraksjon',
        unitText: 'Enhet',
        // Time / Timespan component
        labels: ['År', 'Måneder', 'Dager', 'Timer', 'Minutter', 'Sekunder', ''],
        labelsShort: ['Yrs', 'Mths', 'Days', 'Hrs', 'Mins', 'Secs', ''],
        // Timer component
        startText: 'Start',
        stopText: 'Stopp',
        resetText: 'Tilbakestille',
        lapText: 'Runde',
        hideText: 'Skjul'
    });
})(jQuery);

/*
 * Translation by: Ivan Gomes <contato@ivangomes.com.br>
 *
 */
(function ($) {
    $.mobiscroll.i18n['pt-BR'] = $.extend($.mobiscroll.i18n['pt-BR'], {
        // Core
        setText: 'Selecionar',
        cancelText: 'Cancelar',
        // Datetime component
        dateFormat: 'dd/mm/yy',
        dateOrder: 'ddMMyy',
        dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
        dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
        dayText: 'Dia',
        hourText: 'Hora',
        minuteText: 'Minutos',
        monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
        monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
        monthText: 'Mês',
        secText: 'Segundo',
        timeFormat: 'HH:ii',
        timeWheels: 'HHii',
        yearText: 'Ano',
        // Calendar component
        dateText: 'Data',
        timeText: 'Tempo',
        calendarText: 'Calendário',
        // Measurement components
        wholeText: 'Inteiro',
        fractionText: 'Fração',
        unitText: 'Unidade',
        // Time / Timespan component
        labels: ['Anos', 'Meses', 'Dias', 'Horas', 'Minutos', 'Segundos', ''],
        labelsShort: ['Yrs', 'Mths', 'Days', 'Hrs', 'Mins', 'Secs', ''],
        // Timer component
        startText: 'Começar',
        stopText: 'Pare',
        resetText: 'Reinicializar',
        lapText: 'Lap',
        hideText: 'Esconder'
    });
})(jQuery);

(function ($) {
    $.mobiscroll.i18n.tr = $.extend($.mobiscroll.i18n.tr, {
        // Core
        setText: 'Seç',
        cancelText: 'İptal',
        // Datetime component
        dateFormat: 'dd.mm.yy',
        dateOrder: 'ddmmyy',
        dayNames: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
        dayNamesShort: ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'],
        dayText: 'Gün',
        hourText: 'Saat',
        minuteText: 'Dakika',
        monthNames: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
        monthNamesShort: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'],
        monthText: 'Ay',
        secText: 'Saniye',
        timeFormat: 'hh:ii A',
        timeWheels: 'hhiiA',
        yearText: 'Yıl',
        nowText: 'Şimdi',
        // Calendar component
        dateText: 'Tarih',
        timeText: 'Zaman',
        calendarText: 'Takvim',
        // Measurement components
        wholeText: 'Tam',
        fractionText: 'Kesir',
        unitText: 'Birim',
        // Time / Timespan component
        labels: ['Yıl', 'Ay', 'Gün', 'Saat', 'Dakika', 'Saniye', ''],
        labelsShort: ['Yıl', 'Ay', 'Gün', 'Sa', 'Dak', 'Sn', ''],
        // Timer component
        startText: 'Başla',
        stopText: 'Durdur',
        resetText: 'Sıfırla',
        lapText: 'Tur',
        hideText: 'Gizle'
    });
})(jQuery);

(function ($) {
    $.mobiscroll.i18n.zh = $.extend($.mobiscroll.i18n.zh, {
        // Core
        setText: '确定',
        cancelText: '取消',
        // Datetime component
        dateFormat: 'dd/mm/yy',
        dateOrder: 'ddmmyy',
        dayNames: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
        dayNamesShort: ['日', '一', '二', '三', '四', '五', '六'],
        dayText: '日',
        hourText: '时',
        minuteText: '分',
        monthNames: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
        monthNamesShort: ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'],
        monthText: '月',
        secText: '秒',
        timeFormat: 'HH:ii',
        timeWheels: 'HHii',
        yearText: '年',
        nowText: '当前',
        // Calendar component
        dateText: '日',
        timeText: '时间',
        calendarText: '日历',
        // Measurement components
        wholeText: 'Whole',
        fractionText: 'Fraction',
        unitText: 'Unit',
        // Time / Timespan component
        labels: ['Years', 'Months', 'Days', 'Hours', 'Minutes', 'Seconds', ''],
        labelsShort: ['Yrs', 'Mths', 'Days', 'Hrs', 'Mins', 'Secs', ''],
        // Timer component
        startText: 'Start',
        stopText: 'Stop',
        resetText: 'Reset',
        lapText: 'Lap',
        hideText: 'Hide'
    });
})(jQuery);

/*jslint eqeq: true, plusplus: true, undef: true, sloppy: true, vars: true, forin: true */
(function ($) {

    var ms = $.mobiscroll,
        date = new Date(),
        defaults = {
            dateFormat: 'mm/dd/yy',
            dateOrder: 'mmddy',
            timeWheels: 'hhiiA',
            timeFormat: 'hh:ii A',
            startYear: date.getFullYear() - 100,
            endYear: date.getFullYear() + 1,
            monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            shortYearCutoff: '+10',
            monthText: 'Month',
            dayText: 'Day',
            yearText: 'Year',
            hourText: 'Hours',
            minuteText: 'Minutes',
            secText: 'Seconds',
            ampmText: '&nbsp;',
            nowText: 'Now',
            showNow: false,
            stepHour: 1,
            stepMinute: 1,
            stepSecond: 1,
            separator: ' '
        },
        preset = function (inst) {
            var that = $(this),
                html5def = {},
                format;
            // Force format for html5 date inputs (experimental)
            if (that.is('input')) {
                switch (that.attr('type')) {
                    case 'date':
                        format = 'yy-mm-dd';
                        break;
                    case 'datetime':
                        format = 'yy-mm-ddTHH:ii:ssZ';
                        break;
                    case 'datetime-local':
                        format = 'yy-mm-ddTHH:ii:ss';
                        break;
                    case 'month':
                        format = 'yy-mm';
                        html5def.dateOrder = 'mmyy';
                        break;
                    case 'time':
                        format = 'HH:ii:ss';
                        break;
                }
                // Check for min/max attributes
                var min = that.attr('min'),
                    max = that.attr('max');
                if (min) {
                    html5def.minDate = ms.parseDate(format, min);
                }
                if (max) {
                    html5def.maxDate = ms.parseDate(format, max);
                }
            }

            // Set year-month-day order
            var i,
                k,
                keys,
                values,
                wg,
                start,
                end,
                orig = $.extend({}, inst.settings),
                s = $.extend(inst.settings, defaults, html5def, orig),
                offset = 0,
                wheels = [],
                ord = [],
                o = {},
                f = {y: 'getFullYear', m: 'getMonth', d: 'getDate', h: getHour, i: getMinute, s: getSecond, a: getAmPm},
                p = s.preset,
                dord = s.dateOrder,
                tord = s.timeWheels,
                regen = dord.match(/D/),
                ampm = tord.match(/a/i),
                hampm = tord.match(/h/),
                hformat = p == 'datetime' ? s.dateFormat + s.separator + s.timeFormat : p == 'time' ? s.timeFormat : s.dateFormat,
                defd = new Date(),
                stepH = s.stepHour,
                stepM = s.stepMinute,
                stepS = s.stepSecond,
                mind = s.minDate || new Date(s.startYear, 0, 1),
                maxd = s.maxDate || new Date(s.endYear, 11, 31, 23, 59, 59);

            format = format || hformat;

            if (p.match(/date/i)) {

                // Determine the order of year, month, day wheels
                $.each(['y', 'm', 'd'], function (j, v) {
                    i = dord.search(new RegExp(v, 'i'));
                    if (i > -1) {
                        ord.push({o: i, v: v});
                    }
                });
                ord.sort(function (a, b) {
                    return a.o > b.o ? 1 : -1;
                });
                $.each(ord, function (i, v) {
                    o[v.v] = i;
                });

                wg = [];
                for (k = 0; k < 3; k++) {
                    if (k == o.y) {
                        offset++;
                        values = [];
                        keys = [];
                        start = mind.getFullYear();
                        end = maxd.getFullYear();
                        for (i = start; i <= end; i++) {
                            keys.push(i);
                            values.push(dord.match(/yy/i) ? i : (i + '').substr(2, 2));
                        }
                        addWheel(wg, keys, values, s.yearText);
                    } else if (k == o.m) {
                        offset++;
                        values = [];
                        keys = [];
                        for (i = 0; i < 12; i++) {
                            var str = dord.replace(/[dy]/gi, '').replace(/mm/, i < 9 ? '0' + (i + 1) : i + 1).replace(/m/, (i + 1));
                            keys.push(i);
                            values.push(str.match(/MM/) ? str.replace(/MM/, '<span class="dw-mon">' + s.monthNames[i] + '</span>') : str.replace(/M/, '<span class="dw-mon">' + s.monthNamesShort[i] + '</span>'));
                        }
                        addWheel(wg, keys, values, s.monthText);
                    } else if (k == o.d) {
                        offset++;
                        values = [];
                        keys = [];
                        for (i = 1; i < 32; i++) {
                            keys.push(i);
                            values.push(dord.match(/dd/i) && i < 10 ? '0' + i : i);
                        }
                        addWheel(wg, keys, values, s.dayText);
                    }
                }
                wheels.push(wg);
            }

            if (p.match(/time/i)) {

                // Determine the order of hours, minutes, seconds wheels
                ord = [];
                $.each(['h', 'i', 's', 'a'], function (i, v) {
                    i = tord.search(new RegExp(v, 'i'));
                    if (i > -1) {
                        ord.push({o: i, v: v});
                    }
                });
                ord.sort(function (a, b) {
                    return a.o > b.o ? 1 : -1;
                });
                $.each(ord, function (i, v) {
                    o[v.v] = offset + i;
                });

                wg = [];
                for (k = offset; k < offset + 4; k++) {
                    if (k == o.h) {
                        offset++;
                        values = [];
                        keys = [];
                        for (i = 0; i < (hampm ? 12 : 24); i += stepH) {
                            keys.push(i);
                            values.push(hampm && i == 0 ? 12 : tord.match(/hh/i) && i < 10 ? '0' + i : i);
                        }
                        addWheel(wg, keys, values, s.hourText);
                    } else if (k == o.i) {
                        offset++;
                        values = [];
                        keys = [];
                        for (i = 0; i < 60; i += stepM) {
                            keys.push(i);
                            values.push(tord.match(/ii/) && i < 10 ? '0' + i : i);
                        }
                        addWheel(wg, keys, values, s.minuteText);
                    } else if (k == o.s) {
                        offset++;
                        values = [];
                        keys = [];
                        for (i = 0; i < 60; i += stepS) {
                            keys.push(i);
                            values.push(tord.match(/ss/) && i < 10 ? '0' + i : i);
                        }
                        addWheel(wg, keys, values, s.secText);
                    } else if (k == o.a) {
                        offset++;
                        var upper = tord.match(/A/);
                        addWheel(wg, [0, 1], upper ? ['AM', 'PM'] : ['am', 'pm'], s.ampmText);
                    }
                }

                wheels.push(wg);
            }

            function get(d, i, def) {
                if (o[i] !== undefined) {
                    return +d[o[i]];
                }
                if (def !== undefined) {
                    return def;
                }
                return defd[f[i]] ? defd[f[i]]() : f[i](defd);
            }

            function addWheel(wg, k, v, lbl) {
                wg.push({
                    values: v,
                    keys: k,
                    label: lbl
                });
            }

            function step(v, st) {
                return Math.floor(v / st) * st;
            }

            function getHour(d) {
                var hour = d.getHours();
                hour = hampm && hour >= 12 ? hour - 12 : hour;
                return step(hour, stepH);
            }

            function getMinute(d) {
                return step(d.getMinutes(), stepM);
            }

            function getSecond(d) {
                return step(d.getSeconds(), stepS);
            }

            function getAmPm(d) {
                return ampm && d.getHours() > 11 ? 1 : 0;
            }

            function getDate(d) {
                var hour = get(d, 'h', 0);
                return new Date(get(d, 'y'), get(d, 'm'), get(d, 'd', 1), get(d, 'a') ? hour + 12 : hour, get(d, 'i', 0), get(d, 's', 0));
            }

            // Extended methods
            // ---

            /**
             * Sets the selected date
             *
             * @param {Date} d Date to select.
             * @param {Boolean} [fill=false] Also set the value of the associated input element. Default is true.
             * @return {Object} jQuery object to maintain chainability
             */
            inst.setDate = function (d, fill, time, temp) {
                var i;

                // Set wheels
                for (i in o) {
                    inst.temp[o[i]] = d[f[i]] ? d[f[i]]() : f[i](d);
                }
                inst.setValue(inst.temp, fill, time, temp);
            };

            /**
             * Returns the currently selected date.
             *
             * @param {Boolean} [temp=false] If true, return the currently shown date on the picker, otherwise the last selected one
             * @return {Date}
             */
            inst.getDate = function (temp) {
                return getDate(temp ? inst.temp : inst.values);
            };

            // ---

            return {
                button3Text: s.showNow ? s.nowText : undefined,
                button3: s.showNow ? function () {
                    inst.setDate(new Date(), false, 0.3, true);
                } : undefined,
                wheels: wheels,
                headerText: function (v) {
                    return ms.formatDate(hformat, getDate(inst.temp), s);
                },
                /**
                 * Builds a date object from the wheel selections and formats it to the given date/time format
                 * @param {Array} d - An array containing the selected wheel values
                 * @return {String} - The formatted date string
                 */
                formatResult: function (d) {
                    return ms.formatDate(format, getDate(d), s);
                },
                /**
                 * Builds a date object from the input value and returns an array to set wheel values
                 * @return {Array} - An array containing the wheel values to set
                 */
                parseValue: function (val) {
                    var d = new Date(),
                        i,
                        result = [];
                    try {
                        d = ms.parseDate(format, val, s);
                    } catch (e) {
                    }
                    // Set wheels
                    for (i in o) {
                        result[o[i]] = d[f[i]] ? d[f[i]]() : f[i](d);
                    }
                    return result;
                },
                /**
                 * Validates the selected date to be in the minDate / maxDate range and sets unselectable values to disabled
                 * @param {Object} dw - jQuery object containing the generated html
                 * @param {Integer} [i] - Index of the changed wheel, not set for initial validation
                 */
                validate: function (dw, i) {
                    var temp = inst.temp, //.slice(0),
                        mins = {y: mind.getFullYear(), m: 0, d: 1, h: 0, i: 0, s: 0, a: 0},
                        maxs = {
                            y: maxd.getFullYear(),
                            m: 11,
                            d: 31,
                            h: step(hampm ? 11 : 23, stepH),
                            i: step(59, stepM),
                            s: step(59, stepS),
                            a: 1
                        },
                        minprop = true,
                        maxprop = true;
                    $.each(['y', 'm', 'd', 'a', 'h', 'i', 's'], function (x, i) {
                        if (o[i] !== undefined) {
                            var min = mins[i],
                                max = maxs[i],
                                maxdays = 31,
                                val = get(temp, i),
                                t = $('.dw-ul', dw).eq(o[i]),
                                y,
                                m;
                            if (i == 'd') {
                                y = get(temp, 'y');
                                m = get(temp, 'm');
                                maxdays = 32 - new Date(y, m, 32).getDate();
                                max = maxdays;
                                if (regen) {
                                    $('.dw-li', t).each(function () {
                                        var that = $(this),
                                            d = that.data('val'),
                                            w = new Date(y, m, d).getDay(),
                                            str = dord.replace(/[my]/gi, '').replace(/dd/, d < 10 ? '0' + d : d).replace(/d/, d);
                                        $('.dw-i', that).html(str.match(/DD/) ? str.replace(/DD/, '<span class="dw-day">' + s.dayNames[w] + '</span>') : str.replace(/D/, '<span class="dw-day">' + s.dayNamesShort[w] + '</span>'));
                                    });
                                }
                            }
                            if (minprop && mind) {
                                min = mind[f[i]] ? mind[f[i]]() : f[i](mind);
                            }
                            if (maxprop && maxd) {
                                max = maxd[f[i]] ? maxd[f[i]]() : f[i](maxd);
                            }
                            if (i != 'y') {
                                var i1 = $('.dw-li', t).index($('.dw-li[data-val="' + min + '"]', t)),
                                    i2 = $('.dw-li', t).index($('.dw-li[data-val="' + max + '"]', t));
                                $('.dw-li', t).removeClass('dw-v').slice(i1, i2 + 1).addClass('dw-v');
                                if (i == 'd') { // Hide days not in month
                                    $('.dw-li', t).removeClass('dw-h').slice(maxdays).addClass('dw-h');
                                }
                            }
                            if (val < min) {
                                val = min;
                            }
                            if (val > max) {
                                val = max;
                            }
                            if (minprop) {
                                minprop = val == min;
                            }
                            if (maxprop) {
                                maxprop = val == max;
                            }
                            // Disable some days
                            if (s.invalid && i == 'd') {
                                var idx = [];
                                // Disable exact dates
                                if (s.invalid.dates) {
                                    $.each(s.invalid.dates, function (i, v) {
                                        if (v.getFullYear() == y && v.getMonth() == m) {
                                            idx.push(v.getDate() - 1);
                                        }
                                    });
                                }
                                // Disable days of week
                                if (s.invalid.daysOfWeek) {
                                    var first = new Date(y, m, 1).getDay(),
                                        j;
                                    $.each(s.invalid.daysOfWeek, function (i, v) {
                                        for (j = v - first; j < maxdays; j += 7) {
                                            if (j >= 0) {
                                                idx.push(j);
                                            }
                                        }
                                    });
                                }
                                // Disable days of month
                                if (s.invalid.daysOfMonth) {
                                    $.each(s.invalid.daysOfMonth, function (i, v) {
                                        v = (v + '').split('/');
                                        if (v[1]) {
                                            if (v[0] - 1 == m) {
                                                idx.push(v[1] - 1);
                                            }
                                        } else {
                                            idx.push(v[0] - 1);
                                        }
                                    });
                                }
                                $.each(idx, function (i, v) {
                                    $('.dw-li', t).eq(v).removeClass('dw-v');
                                });
                            }

                            // Set modified value
                            temp[o[i]] = val;
                        }
                    });
                }
            };
        };

    $.each(['date', 'time', 'datetime'], function (i, v) {
        ms.presets[v] = preset;
        ms.presetShort(v);
    });

    /**
     * Format a date into a string value with a specified format.
     * @param {String} format - Output format.
     * @param {Date} date - Date to format.
     * @param {Object} settings - Settings.
     * @return {String} - Returns the formatted date string.
     */
    ms.formatDate = function (format, date, settings) {
        if (!date) {
            return null;
        }
        var s = $.extend({}, defaults, settings),
            look = function (m) { // Check whether a format character is doubled
                var n = 0;
                while (i + 1 < format.length && format.charAt(i + 1) == m) {
                    n++;
                    i++;
                }
                return n;
            },
            f1 = function (m, val, len) { // Format a number, with leading zero if necessary
                var n = '' + val;
                if (look(m)) {
                    while (n.length < len) {
                        n = '0' + n;
                    }
                }
                return n;
            },
            f2 = function (m, val, s, l) { // Format a name, short or long as requested
                return (look(m) ? l[val] : s[val]);
            },
            i,
            output = '',
            literal = false;

        for (i = 0; i < format.length; i++) {
            if (literal) {
                if (format.charAt(i) == "'" && !look("'")) {
                    literal = false;
                } else {
                    output += format.charAt(i);
                }
            } else {
                switch (format.charAt(i)) {
                    case 'd':
                        output += f1('d', date.getDate(), 2);
                        break;
                    case 'D':
                        output += f2('D', date.getDay(), s.dayNamesShort, s.dayNames);
                        break;
                    case 'o':
                        output += f1('o', (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000, 3);
                        break;
                    case 'm':
                        output += f1('m', date.getMonth() + 1, 2);
                        break;
                    case 'M':
                        output += f2('M', date.getMonth(), s.monthNamesShort, s.monthNames);
                        break;
                    case 'y':
                        output += (look('y') ? date.getFullYear() : (date.getYear() % 100 < 10 ? '0' : '') + date.getYear() % 100);
                        break;
                    case 'h':
                        var h = date.getHours();
                        output += f1('h', (h > 12 ? (h - 12) : (h == 0 ? 12 : h)), 2);
                        break;
                    case 'H':
                        output += f1('H', date.getHours(), 2);
                        break;
                    case 'i':
                        output += f1('i', date.getMinutes(), 2);
                        break;
                    case 's':
                        output += f1('s', date.getSeconds(), 2);
                        break;
                    case 'a':
                        output += date.getHours() > 11 ? 'pm' : 'am';
                        break;
                    case 'A':
                        output += date.getHours() > 11 ? 'PM' : 'AM';
                        break;
                    case "'":
                        if (look("'")) {
                            output += "'";
                        } else {
                            literal = true;
                        }
                        break;
                    default:
                        output += format.charAt(i);
                }
            }
        }
        return output;
    };

    /**
     * Extract a date from a string value with a specified format.
     * @param {String} format - Input format.
     * @param {String} value - String to parse.
     * @param {Object} settings - Settings.
     * @return {Date} - Returns the extracted date.
     */
    ms.parseDate = function (format, value, settings) {
        var def = new Date();

        if (!format || !value) {
            return def;
        }

        value = (typeof value == 'object' ? value.toString() : value + '');

        var s = $.extend({}, defaults, settings),
            shortYearCutoff = s.shortYearCutoff,
            year = def.getFullYear(),
            month = def.getMonth() + 1,
            day = def.getDate(),
            doy = -1,
            hours = def.getHours(),
            minutes = def.getMinutes(),
            seconds = 0, //def.getSeconds(),
            ampm = -1,
            literal = false, // Check whether a format character is doubled
            lookAhead = function (match) {
                var matches = (iFormat + 1 < format.length && format.charAt(iFormat + 1) == match);
                if (matches) {
                    iFormat++;
                }
                return matches;
            },
            getNumber = function (match) { // Extract a number from the string value
                lookAhead(match);
                var size = (match == '@' ? 14 : (match == '!' ? 20 : (match == 'y' ? 4 : (match == 'o' ? 3 : 2)))),
                    digits = new RegExp('^\\d{1,' + size + '}'),
                    num = value.substr(iValue).match(digits);

                if (!num) {
                    return 0;
                }
                //throw 'Missing number at position ' + iValue;
                iValue += num[0].length;
                return parseInt(num[0], 10);
            },
            getName = function (match, s, l) { // Extract a name from the string value and convert to an index
                var names = (lookAhead(match) ? l : s),
                    i;

                for (i = 0; i < names.length; i++) {
                    if (value.substr(iValue, names[i].length).toLowerCase() == names[i].toLowerCase()) {
                        iValue += names[i].length;
                        return i + 1;
                    }
                }
                return 0;
                //throw 'Unknown name at position ' + iValue;
            },
            checkLiteral = function () {
                //if (value.charAt(iValue) != format.charAt(iFormat))
                //throw 'Unexpected literal at position ' + iValue;
                iValue++;
            },
            iValue = 0,
            iFormat;

        for (iFormat = 0; iFormat < format.length; iFormat++) {
            if (literal) {
                if (format.charAt(iFormat) == "'" && !lookAhead("'")) {
                    literal = false;
                } else {
                    checkLiteral();
                }
            } else {
                switch (format.charAt(iFormat)) {
                    case 'd':
                        day = getNumber('d');
                        break;
                    case 'D':
                        getName('D', s.dayNamesShort, s.dayNames);
                        break;
                    case 'o':
                        doy = getNumber('o');
                        break;
                    case 'm':
                        month = getNumber('m');
                        break;
                    case 'M':
                        month = getName('M', s.monthNamesShort, s.monthNames);
                        break;
                    case 'y':
                        year = getNumber('y');
                        break;
                    case 'H':
                        hours = getNumber('H');
                        break;
                    case 'h':
                        hours = getNumber('h');
                        break;
                    case 'i':
                        minutes = getNumber('i');
                        break;
                    case 's':
                        seconds = getNumber('s');
                        break;
                    case 'a':
                        ampm = getName('a', ['am', 'pm'], ['am', 'pm']) - 1;
                        break;
                    case 'A':
                        ampm = getName('A', ['am', 'pm'], ['am', 'pm']) - 1;
                        break;
                    case "'":
                        if (lookAhead("'")) {
                            checkLiteral();
                        } else {
                            literal = true;
                        }
                        break;
                    default:
                        checkLiteral();
                }
            }
        }
        if (year < 100) {
            year += new Date().getFullYear() - new Date().getFullYear() % 100 +
                (year <= (typeof shortYearCutoff != 'string' ? shortYearCutoff : new Date().getFullYear() % 100 + parseInt(shortYearCutoff, 10)) ? 0 : -100);
        }
        if (doy > -1) {
            month = 1;
            day = doy;
            do {
                var dim = 32 - new Date(year, month - 1, 32).getDate();
                if (day <= dim) {
                    break;
                }
                month++;
                day -= dim;
            } while (true);
        }
        hours = (ampm == -1) ? hours : ((ampm && hours < 12) ? (hours + 12) : (!ampm && hours == 12 ? 0 : hours));
        var date = new Date(year, month - 1, day, hours, minutes, seconds);
        if (date.getFullYear() != year || date.getMonth() + 1 != month || date.getDate() != day) {
            throw 'Invalid date';
        }
        return date;
    };

})(jQuery);

(function ($) {

    $.mobiscroll.themes.ios = {
        defaults: {
            dateOrder: 'MMdyy',
            rows: 5,
            height: 30,
            width: 55,
            headerText: false,
            showLabel: false,
            useShortLabels: true
        }
    };

})(jQuery);

(function ($) {

    $.mobiscroll.themes.jqm = {
        defaults: {
            jqmBorder: 'a',
            jqmBody: 'c',
            jqmHeader: 'b',
            jqmWheel: 'd',
            jqmClickPick: 'c',
            jqmSet: 'b',
            jqmCancel: 'c'
        },
        init: function (elm, inst) {
            var s = inst.settings;
            $('.dw', elm).removeClass('dwbg').addClass('ui-overlay-shadow ui-corner-all ui-body-' + s.jqmBorder);
            $('.dwb-s span', elm).attr('data-role', 'button').attr('data-theme', s.jqmSet);
            $('.dwb-n span', elm).attr('data-role', 'button').attr('data-theme', s.jqmCancel);
            $('.dwb-c span', elm).attr('data-role', 'button').attr('data-theme', s.jqmCancel);
            $('.dwwb', elm).attr('data-role', 'button').attr('data-theme', s.jqmClickPick);
            $('.dwv', elm).addClass('ui-header ui-bar-' + s.jqmHeader);
            $('.dwwr', elm).addClass('ui-body-' + s.jqmBody);
            $('.dwpm .dwwl', elm).addClass('ui-body-' + s.jqmWheel);
            $('.dwpm .dwl', elm).addClass('ui-body-' + s.jqmBody);
            elm.trigger('create');
            // Hide on overlay click
            $('.dwo', elm).click(function () {
                inst.cancel();
            });
        }
    };

})(jQuery);

/*jslint eqeq: true, plusplus: true, undef: true, sloppy: true, vars: true, forin: true */
(function ($) {
    var ms = $.mobiscroll,
        defaults = {
            invalid: [],
            showInput: true,
            inputClass: ''
        },
        preset = function (inst) {
            var orig = $.extend({}, inst.settings),
                s = $.extend(inst.settings, defaults, orig),
                elm = $(this),
                input,
                prevent,
                id = this.id + '_dummy',
                lvl = 0,
                ilvl = 0,
                timer = {},
                wa = s.wheelArray || createWheelArray(elm),
                labels = generateLabels(lvl),
                currWheelVector = [],
                fwv = firstWheelVector(wa),
                w = generateWheelsFromVector(fwv, lvl);

            /**
             * Disables the invalid items on the wheels
             * @param {Object} dw - the jQuery mobiscroll object
             * @param {Number} nrWheels - the number of the current wheels
             * @param {Array} whArray - The wheel array objects containing the wheel tree
             * @param {Array} whVector - the wheel vector containing the current keys
             */
            function setDisabled(dw, nrWheels, whArray, whVector) {
                var i = 0;
                while (i < nrWheels) {
                    var currWh = $('.dwwl' + i, dw),
                        inv = getInvalidKeys(whVector, i, whArray);
                    $.each(inv, function (i, v) {
                        $('.dw-li[data-val="' + v + '"]', currWh).removeClass('dw-v');
                    });
                    i++;
                }
            }

            /**
             * Returns the invalid keys of one wheel as an array
             * @param {Array} whVector - the wheel vector used to search for the wheel in the wheel array
             * @param {Number} index - index of the wheel in the wheel vector, that we are interested in
             * @param {Array} whArray - the wheel array we are searching in
             * @return {Array} - list of invalid keys
             */
            function getInvalidKeys(whVector, index, whArray) {
                var i = 0,
                    n,
                    whObjA = whArray,
                    invalids = [];

                while (i < index) {
                    var ii = whVector[i];
                    //whObjA = whObjA[ii].children;
                    for (n in whObjA) {
                        if (whObjA[n].key == ii) {
                            whObjA = whObjA[n].children;
                            break;
                        }
                    }
                    i++;
                }
                i = 0;
                while (i < whObjA.length) {
                    if (whObjA[i].invalid) {
                        invalids.push(whObjA[i].key);
                    }
                    i++;
                }
                return invalids;
            }

            /**
             * Creates a Boolean vector with true values (except one) that can be used as the readonly vector
             * n - the length of the vector
             * i - the index of the value that's going to be false
             */
            function createROVector(n, i) {
                var a = [];
                while (n) {
                    a[--n] = true;
                }
                a[i] = false;
                return a;
            }

            /**
             * Creates a labels vector, from values if they are defined, otherwise from numbers
             * l - the length of the vector
             */
            function generateLabels(l) {
                var a = [],
                    i;
                for (i = 0; i < l; i++) {
                    a[i] = s.labels && s.labels[i] ? s.labels[i] : i;
                }
                return a;
            }

            /**
             * Creates the wheel array from the vector provided
             * wv - wheel vector containing the values that should be selected on the wheels
             * l - the length of the wheel array
             */
            function generateWheelsFromVector(wv, l, index) {
                var i = 0, j, obj, chInd,
                    w = [],
                    wtObjA = wa;

                if (l) { // if length is defined we need to generate that many wheels (even if they are empty)
                    for (j = 0; j < l; j++) {
                        w[j] = [{}];
                        //w[j] = {};
                        //w[j][labels[j]] = {}; // each wheel will have a label generated by the generateLabels method
                    }
                }
                while (i < wv.length) { // we generate the wheels until the length of the wheel vector
                    //w[i] = {};
                    //w[i][labels[i]] = getWheelFromObjA(wtObjA);
                    w[i] = [getWheelFromObjA(wtObjA, labels[i])];

                    j = 0;
                    chInd = undefined;

                    while (j < wtObjA.length && chInd === undefined) {
                        if (wtObjA[j].key == wv[i] && ((index !== undefined && i <= index) || index === undefined)) {
                            chInd = j;
                        }
                        j++;
                    }

                    if (chInd !== undefined && wtObjA[chInd].children) {
                        i++;
                        wtObjA = wtObjA[chInd].children;
                    } else if ((obj = getFirstValidItemObjOrInd(wtObjA)) && obj.children) {
                        i++;
                        wtObjA = obj.children;
                    } else {
                        return w;
                    }
                }
                return w;
            }

            /**
             * Returns the first valid Wheel Node Object or its index from a Wheel Node Object Array
             * getInd - if it is true then the return value is going to be the index, otherwise the object itself
             */
            function getFirstValidItemObjOrInd(wtObjA, getInd) {
                if (!wtObjA) {
                    return false;
                }

                var i = 0,
                    obj;

                while (i < wtObjA.length) {
                    if (!(obj = wtObjA[i++]).invalid) {
                        return getInd ? i - 1 : obj;
                    }
                }
                return false;
            }

            function getWheelFromObjA(objA, lbl) {
                var wheel = {
                        keys: [],
                        values: [],
                        label: lbl
                    },
                    j = 0;

                while (j < objA.length) {
                    wheel.values.push(objA[j].value);
                    wheel.keys.push(objA[j].key);
                    j++;
                    //wheel[objA[j].key] = objA[j++].value;
                }
                return wheel;
            }

            /**
             * Hides the last i number of wheels
             * i - the last number of wheels that has to be hidden
             */
            function hideWheels(dw, i) {
                $('.dwc', dw).css('display', '').slice(i).hide();
            }

            /**
             * Generates the first wheel vector from the wheeltree
             * wt - the wheel tree object
             * uses the lvl global variable to determine the length of the vector
             */
            function firstWheelVector(wa) {
                var t = [],
                    ndObjA = wa,
                    obj,
                    ok = true,
                    i = 0;

                while (ok) {
                    obj = getFirstValidItemObjOrInd(ndObjA);
                    t[i++] = obj.key;
                    if (ok = obj.children) {
                        ndObjA = obj.children;
                    }
                }
                return t;
            }

            /**
             * Calculates the level of a wheel vector and the new wheel vector, depending on current wheel vector and the index of the changed wheel
             * wv - current wheel vector
             * index - index of the changed wheel
             */
            function calcLevelOfVector2(wv, index) {
                var t = [],
                    ndObjA = wa,
                    lvl = 0,
                    next = false,
                    i,
                    childName,
                    chInd;

                if (wv[lvl] !== undefined && lvl <= index) {
                    i = 0;

                    childName = wv[lvl];
                    chInd = undefined;

                    while (i < ndObjA.length && chInd === undefined) {
                        if (ndObjA[i].key == wv[lvl] && !ndObjA[i].invalid) {
                            chInd = i;
                        }
                        i++;
                    }
                } else {
                    chInd = getFirstValidItemObjOrInd(ndObjA, true);
                    childName = ndObjA[chInd].key;
                }

                next = chInd !== undefined ? ndObjA[chInd].children : false;

                t[lvl] = childName;

                while (next) {
                    ndObjA = ndObjA[chInd].children;
                    lvl++;
                    next = false;
                    chInd = undefined;

                    if (wv[lvl] !== undefined && lvl <= index) {
                        i = 0;

                        childName = wv[lvl];
                        chInd = undefined;

                        while (i < ndObjA.length && chInd === undefined) {
                            if (ndObjA[i].key == wv[lvl] && !ndObjA[i].invalid) {
                                chInd = i;
                            }
                            i++;
                        }
                    } else {
                        chInd = getFirstValidItemObjOrInd(ndObjA, true);
                        chInd = chInd === false ? undefined : chInd;
                        childName = ndObjA[chInd].key;
                    }
                    next = chInd !== undefined && getFirstValidItemObjOrInd(ndObjA[chInd].children) ? ndObjA[chInd].children : false;
                    t[lvl] = childName;
                }
                return {
                    lvl: lvl + 1,
                    nVector: t
                }; // return the calculated level and the wheel vector as an object
            }

            function createWheelArray(ul) {
                var wheelArray = [];

                lvl = lvl > ilvl++ ? lvl : ilvl;

                ul.children('li').each(function (index) {
                    var that = $(this),
                        c = that.clone();

                    c.children('ul,ol').remove();

                    var v = c.html().replace(/^\s\s*/, '').replace(/\s\s*$/, ''),
                        inv = that.data('invalid') ? true : false,
                        wheelObj = {
                            key: that.data('val') || index,
                            value: v,
                            invalid: inv,
                            children: null
                        },
                        nest = that.children('ul,ol');

                    if (nest.length) {
                        wheelObj.children = createWheelArray(nest);
                    }

                    wheelArray.push(wheelObj);
                });

                ilvl--;
                return wheelArray;
            }

            $('#' + id).remove(); // Remove input if exists

            if (s.showInput) {
                input = $('<input type="text" id="' + id + '" value="" class="' + s.inputClass + '" readonly />').insertBefore(elm);
                inst.settings.anchor = input; // give the core the input element for the bubble positioning

                if (s.showOnFocus) {
                    input.focus(function () {
                        inst.show();
                    });
                }

                if (s.showOnTap) {
                    inst.tap(input, function () {
                        inst.show();
                    });
                }
            }

            if (!s.wheelArray) {
                elm.hide().closest('.ui-field-contain').trigger('create');
            }

            return {
                width: 50,
                wheels: w,
                headerText: false,
                onBeforeShow: function (dw) {
                    var t = inst.temp;
                    currWheelVector = t.slice(0);
                    inst.settings.wheels = generateWheelsFromVector(t, lvl, lvl);
                    prevent = true;
                },
                onSelect: function (v, inst) {
                    if (input) {
                        input.val(v);
                    }
                },
                onChange: function (v, inst) {
                    if (input && s.display == 'inline') {
                        input.val(v);
                    }
                },
                onClose: function () {
                    if (input) {
                        input.blur();
                    }
                },
                onShow: function (dw) {
                    $('.dwwl', dw).on('mousedown touchstart', function () {
                        clearTimeout(timer[$('.dwwl', dw).index(this)]);
                    });
                },
                validate: function (dw, index, time) {
                    var t = inst.temp;
                    if ((index !== undefined && currWheelVector[index] != t[index]) || (index === undefined && !prevent)) {
                        inst.settings.wheels = generateWheelsFromVector(t, null, index);
                        var args = [],
                            i = (index || 0) + 1,
                            o = calcLevelOfVector2(t, index);
                        if (index !== undefined) {
                            inst.temp = o.nVector.slice(0);
                        }
                        while (i < o.lvl) {
                            args.push(i++);
                        }
                        hideWheels(dw, o.lvl);
                        currWheelVector = inst.temp.slice(0);
                        if (args.length) {
                            prevent = true;
                            inst.settings.readonly = createROVector(lvl, index);
                            clearTimeout(timer[index]);
                            timer[index] = setTimeout(function () {
                                inst.changeWheel(args);
                                inst.settings.readonly = false;
                            }, time * 1000);
                            return false;
                        }
                        setDisabled(dw, o.lvl, wa, inst.temp);
                    } else {
                        var o = calcLevelOfVector2(t, t.length);
                        setDisabled(dw, o.lvl, wa, t);
                        hideWheels(dw, o.lvl);
                    }
                    prevent = false;
                }
            };
        };

    $.each(['list', 'image', 'treelist'], function (i, v) {
        ms.presets[v] = preset;
        ms.presetShort(v);
    });

})(jQuery);

/*jslint eqeq: true, plusplus: true, undef: true, sloppy: true, vars: true, forin: true */
(function ($) {

    var defaults = {
        inputClass: '',
        invalid: [],
        rtl: false,
        group: false,
        groupLabel: 'Groups'
    };

    $.mobiscroll.presetShort('select');

    $.mobiscroll.presets.select = function (inst) {
        var orig = $.extend({}, inst.settings),
            s = $.extend(inst.settings, defaults, orig),
            elm = $(this),
            multiple = elm.prop('multiple'),
            id = this.id + '_dummy',
            option = multiple ? (elm.val() ? elm.val()[0] : $('option', elm).attr('value')) : elm.val(),
            group = elm.find('option[value="' + option + '"]').parent(),
            prev = group.index() + '',
            gr = prev,
            prevent,
            l1 = $('label[for="' + this.id + '"]').attr('for', id),
            l2 = $('label[for="' + id + '"]'),
            label = s.label !== undefined ? s.label : (l2.length ? l2.text() : elm.attr('name')),
            invalid = [],
            origValues = [],
            main = {},
            grIdx,
            optIdx,
            timer,
            input,
            roPre = s.readonly,
            w;

        function genWheels() {
            var cont,
                wg = 0,
                values = [],
                keys = [],
                w = [[]];

            if (s.group) {
                if (s.rtl) {
                    wg = 1;
                }

                $('optgroup', elm).each(function (i) {
                    values.push($(this).attr('label'));
                    keys.push(i);
                });

                w[wg] = [{
                    values: values,
                    keys: keys,
                    label: s.groupLabel
                }];

                cont = group;
                wg += (s.rtl ? -1 : 1);

            } else {
                cont = elm;
            }

            values = [];
            keys = [];

            $('option', cont).each(function () {
                var v = $(this).attr('value');
                values.push($(this).text());
                keys.push(v);
                if ($(this).prop('disabled')) {
                    invalid.push(v);
                }
            });
            w[wg] = [{
                values: values,
                keys: keys,
                label: label
            }];

            return w;
        }

        function setVal(v, fill) {
            var value = [];

            if (multiple) {
                var sel = [],
                    i = 0;

                for (i in inst._selectedValues) {
                    sel.push(main[i]);
                    value.push(i);
                }
                input.val(sel.join(', '));
            } else {
                input.val(v);
                value = fill ? inst.values[optIdx] : null;
            }

            if (fill) {
                prevent = true;
                elm.val(value).trigger('change');
            }
        }

        function onTap(li) {
            if (multiple && li.hasClass('dw-v') && li.closest('.dw').find('.dw-ul').index(li.closest('.dw-ul')) == optIdx) {
                var val = li.attr('data-val'),
                    selected = li.hasClass('dw-msel');

                if (selected) {
                    li.removeClass('dw-msel').removeAttr('aria-selected');
                    delete inst._selectedValues[val];
                } else {
                    li.addClass('dw-msel').attr('aria-selected', 'true');
                    inst._selectedValues[val] = val;
                }

                if (s.display == 'inline') {
                    setVal(val, true);
                }
                return false;
            }
        }

        // if groups is true and there are no groups fall back to no grouping
        if (s.group && !$('optgroup', elm).length) {
            s.group = false;
        }

        if (!s.invalid.length) {
            s.invalid = invalid;
        }

        if (s.group) {
            if (s.rtl) {
                grIdx = 1;
                optIdx = 0;
            } else {
                grIdx = 0;
                optIdx = 1;
            }
        } else {
            grIdx = -1;
            optIdx = 0;
        }

        $('#' + id).remove();

        input = $('<input type="text" id="' + id + '" class="' + s.inputClass + '" readonly />').insertBefore(elm),

            $('option', elm).each(function () {
                main[$(this).attr('value')] = $(this).text();
            });

        if (s.showOnFocus) {
            input.focus(function () {
                inst.show();
            });
        }

        if (s.showOnTap) {
            inst.tap(input, function () {
                inst.show();
            });
        }

        var v = elm.val() || [],
            i = 0;

        for (i; i < v.length; i++) {
            inst._selectedValues[v[i]] = v[i];
        }

        setVal(main[option]);

        elm.off('.dwsel').on('change.dwsel', function () {
            if (!prevent) {
                inst.setValue(multiple ? elm.val() || [] : [elm.val()], true);
            }
            prevent = false;
        }).hide().closest('.ui-field-contain').trigger('create');

        // Extended methods
        // ---

        if (!inst._setValue) {
            inst._setValue = inst.setValue;
        }

        inst.setValue = function (d, fill, time, noscroll, temp) {
            var value,
                v = $.isArray(d) ? d[0] : d;

            option = v !== undefined ? v : $('option', elm).attr('value');

            if (multiple) {
                inst._selectedValues = {};
                var i = 0;
                for (i; i < d.length; i++) {
                    inst._selectedValues[d[i]] = d[i];
                }
            }

            if (s.group) {
                group = elm.find('option[value="' + option + '"]').parent();
                gr = group.index();
                value = s.rtl ? [option, group.index()] : [group.index(), option];
                if (gr !== prev) { // Need to regenerate wheels, if group changed
                    s.wheels = genWheels();
                    inst.changeWheel([optIdx]);
                    prev = gr + '';
                }
            } else {
                value = [option];
            }

            inst._setValue(value, fill, time, noscroll, temp);

            // Set input/select values
            if (fill) {
                var changed = multiple ? true : option !== elm.val();
                setVal(main[option], changed);
            }
        };

        inst.getValue = function (temp) {
            var val = temp ? inst.temp : inst.values;
            return val[optIdx];
        };

        // ---

        return {
            width: 50,
            wheels: w,
            headerText: false,
            multiple: multiple,
            anchor: input,
            formatResult: function (d) {
                return main[d[optIdx]];
            },
            parseValue: function () {
                var v = elm.val() || [],
                    i = 0;

                if (multiple) {
                    inst._selectedValues = {};
                    for (i; i < v.length; i++) {
                        inst._selectedValues[v[i]] = v[i];
                    }
                }

                option = multiple ? (elm.val() ? elm.val()[0] : $('option', elm).attr('value')) : elm.val();

                group = elm.find('option[value="' + option + '"]').parent();
                gr = group.index();
                prev = gr + '';
                return s.group && s.rtl ? [option, gr] : s.group ? [gr, option] : [option];
            },
            validate: function (dw, i, time) {
                if (i === undefined && multiple) {
                    var v = inst._selectedValues,
                        j = 0;

                    $('.dwwl' + optIdx + ' .dw-li', dw).removeClass('dw-msel').removeAttr('aria-selected');

                    for (j in v) {
                        $('.dwwl' + optIdx + ' .dw-li[data-val="' + v[j] + '"]', dw).addClass('dw-msel').attr('aria-selected', 'true');
                    }
                }

                if (i === grIdx) {
                    gr = inst.temp[grIdx];
                    if (gr !== prev) {
                        group = elm.find('optgroup').eq(gr);
                        gr = group.index();
                        option = group.find('option').eq(0).val();
                        option = option || elm.val();
                        s.wheels = genWheels();
                        if (s.group) {
                            inst.temp = s.rtl ? [option, gr] : [gr, option];
                            s.readonly = [s.rtl, !s.rtl];
                            clearTimeout(timer);
                            timer = setTimeout(function () {
                                inst.changeWheel([optIdx]);
                                s.readonly = roPre;
                                prev = gr + '';
                            }, time * 1000);
                            return false;
                        }
                    } else {
                        s.readonly = roPre;
                    }
                } else {
                    option = inst.temp[optIdx];
                }

                var t = $('.dw-ul', dw).eq(optIdx);
                $.each(s.invalid, function (i, v) {
                    $('.dw-li[data-val="' + v + '"]', t).removeClass('dw-v');
                });
            },
            onBeforeShow: function (dw) {
                s.wheels = genWheels();
                if (s.group) {
                    inst.temp = s.rtl ? [option, group.index()] : [group.index(), option];
                }
            },
            onMarkupReady: function (dw) {
                $('.dwwl' + grIdx, dw).on('mousedown touchstart', function () {
                    clearTimeout(timer);
                });
                if (multiple) {
                    dw.addClass('dwms');
                    $('.dwwl', dw).eq(optIdx).addClass('dwwms').attr('aria-multiselectable', 'true');
                    $('.dwwl', dw).on('keydown', function (e) {
                        if (e.keyCode == 32) { // Space
                            e.preventDefault();
                            e.stopPropagation();
                            onTap($('.dw-sel', this));
                        }
                    });
                    origValues = {};
                    var i;
                    for (i in inst._selectedValues) {
                        origValues[i] = inst._selectedValues[i];
                    }
                }
            },
            onValueTap: onTap,
            onSelect: function (v) {
                setVal(v, true);
                if (s.group) {
                    inst.values = null;
                }
            },
            onCancel: function () {
                if (s.group) {
                    inst.values = null;
                }
                if (multiple) {
                    inst._selectedValues = {};
                    var i;
                    for (i in origValues) {
                        inst._selectedValues[i] = origValues[i];
                    }
                }
            },
            onChange: function (v) {
                if (s.display == 'inline' && !multiple) {
                    input.val(v);
                    prevent = true;
                    elm.val(inst.temp[optIdx]).trigger('change');
                }
            },
            onClose: function () {
                input.blur();
            }
        };
    };

})(jQuery);

(function ($) {

    var anim;

    $.mobiscroll.themes.wp = {
        defaults: {
            width: 70,
            height: 76,
            accent: 'none',
            dateOrder: 'mmMMddDDyy',
            showLabel: false,
            onAnimStart: function (dw, i, time) {
                $('.dwwl' + i, dw).addClass('wpam');
                clearTimeout(anim[i]);
                anim[i] = setTimeout(function () {
                    $('.dwwl' + i, dw).removeClass('wpam');
                }, time * 1000 + 100);
            }
        },
        init: function (elm, inst) {
            var click,
                active;

            anim = {};

            $('.dw', elm).addClass('wp-' + inst.settings.accent);

            //$('.dwwl', elm).on('touchstart mousedown DOMMouseScroll mousewheel', function () {
            $('.dwwl', elm).on('touchstart mousedown DOMMouseScroll mousewheel', '.dw-sel', function () {
                click = true;
                active = $(this).closest('.dwwl').hasClass('wpa');
                $('.dwwl', elm).removeClass('wpa');
                $(this).closest('.dwwl').addClass('wpa');
            }).on('touchmove mousemove', function () {
                click = false;
            }).on('touchend mouseup', function () {
                if (click && active) {
                    $(this).closest('.dwwl').removeClass('wpa');
                }
            });
        }
    };

    $.mobiscroll.themes['wp light'] = $.mobiscroll.themes.wp;

})(jQuery);


