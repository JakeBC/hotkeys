/*!
 * hotkeys-js v3.6.12
 * A simple micro-library for defining and dispatching keyboard shortcuts. It has no dependencies.
 * 
 * Copyright (c) 2019 kenny wong <wowohoo@qq.com>
 * http://jaywcjlove.github.io/hotkeys
 * 
 * Licensed under the MIT license.
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.hotkeys = factory());
}(this, function () { 'use strict';

  var isff = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase().indexOf('firefox') > 0 : false; // 绑定事件

  function addEvent(object, event, method) {
    if (object.addEventListener) {
      object.addEventListener(event, method, false);
    } else if (object.attachEvent) {
      object.attachEvent("on".concat(event), function () {
        method(window.event);
      });
    }
  } // 修饰键转换成对应的键码


  function getMods(modifier, key) {
    var mods = key.slice(0, key.length - 1);

    for (var i = 0; i < mods.length; i++) {
      mods[i] = modifier[mods[i].toLowerCase()];
    }

    return mods;
  } // 处理传的key字符串转换成数组


  function getKeys(key) {
    if (!key) key = '';
    key = key.replace(/\s/g, ''); // 匹配任何空白字符,包括空格、制表符、换页符等等

    var keys = key.split(','); // 同时设置多个快捷键，以','分割

    var index = keys.lastIndexOf(''); // 快捷键可能包含','，需特殊处理

    for (; index >= 0;) {
      keys[index - 1] += ',';
      keys.splice(index, 1);
      index = keys.lastIndexOf('');
    }

    return keys;
  } // 比较修饰键的数组


  function compareArray(a1, a2) {
    var arr1 = a1.length >= a2.length ? a1 : a2;
    var arr2 = a1.length >= a2.length ? a2 : a1;
    var isIndex = true;

    for (var i = 0; i < arr1.length; i++) {
      if (arr2.indexOf(arr1[i]) === -1) isIndex = false;
    }

    return isIndex;
  }

  var _keyMap = {
    // 特殊键
    backspace: 8,
    tab: 9,
    clear: 12,
    enter: 13,
    "return": 13,
    esc: 27,
    escape: 27,
    space: 32,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    del: 46,
    "delete": 46,
    ins: 45,
    insert: 45,
    home: 36,
    end: 35,
    pageup: 33,
    pagedown: 34,
    capslock: 20,
    '⇪': 20,
    ',': 188,
    '.': 190,
    '/': 191,
    '`': 192,
    '-': isff ? 173 : 189,
    '=': isff ? 61 : 187,
    ';': isff ? 59 : 186,
    '\'': 222,
    '[': 219,
    ']': 221,
    '\\': 220
  };
  var _modifier = {
    // 修饰键
    '⇧': 16,
    shift: 16,
    '⌥': 18,
    alt: 18,
    option: 18,
    '⌃': 17,
    ctrl: 17,
    control: 17,
    '⌘': isff ? 224 : 91,
    cmd: isff ? 224 : 91,
    command: isff ? 224 : 91
  };
  var modifierMap = {
    16: 'shiftKey',
    18: 'altKey',
    17: 'ctrlKey'
  };
  var _mods = {
    16: false,
    18: false,
    17: false
  };
  var _handlers = {}; // F1~F12 特殊键

  for (var k = 1; k < 20; k++) {
    _keyMap["f".concat(k)] = 111 + k;
  } // 兼容Firefox处理


  modifierMap[isff ? 224 : 91] = 'metaKey';
  _mods[isff ? 224 : 91] = false;

  var _downKeys = []; // 记录摁下的绑定键

  var _scope = 'all'; // 默认热键范围

  var elementHasBindEvent = []; // 已绑定事件的节点记录
  // 返回键码

  var code = function code(x) {
    return _keyMap[x.toLowerCase()] || _modifier[x.toLowerCase()] || x.toUpperCase().charCodeAt(0);
  }; // 设置获取当前范围（默认为'所有'）


  function setScope(scope) {
    _scope = scope || 'all';
  } // 获取当前范围


  function getScope() {
    return _scope || 'all';
  } // 获取摁下绑定键的键值


  function getPressedKeyCodes() {
    return _downKeys.slice(0);
  } // 表单控件控件判断 返回 Boolean
  // hotkey is effective only when filter return true


  function filter(event) {
    var target = event.target || event.srcElement;
    var tagName = target.tagName;
    var flag = true; // ignore: isContentEditable === 'true', <input> and <textarea> when readOnly state is false, <select>

    if (target.isContentEditable || tagName === 'TEXTAREA' || (tagName === 'INPUT' || tagName === 'TEXTAREA') && !target.readOnly) {
      flag = false;
    }

    return flag;
  } // 判断摁下的键是否为某个键，返回true或者false


  function isPressed(keyCode) {
    if (typeof keyCode === 'string') {
      keyCode = code(keyCode); // 转换成键码
    }

    return _downKeys.indexOf(keyCode) !== -1;
  } // 循环删除handlers中的所有 scope(范围)


  function deleteScope(scope, newScope) {
    var handlers;
    var i; // 没有指定scope，获取scope

    if (!scope) scope = getScope();

    for (var key in _handlers) {
      if (Object.prototype.hasOwnProperty.call(_handlers, key)) {
        handlers = _handlers[key];

        for (i = 0; i < handlers.length;) {
          if (handlers[i].scope === scope) handlers.splice(i, 1);else i++;
        }
      }
    } // 如果scope被删除，将scope重置为all


    if (getScope() === scope) setScope(newScope || 'all');
  } // 清除修饰键


  function clearModifier(event) {
    var key = event.keyCode || event.which || event.charCode;

    var i = _downKeys.indexOf(key); // 从列表中清除按压过的键


    if (i >= 0) {
      _downKeys.splice(i, 1);
    } // 特殊处理 cmmand 键，在 cmmand 组合快捷键 keyup 只执行一次的问题


    if (event.key && event.key.toLowerCase() === 'meta') {
      _downKeys.splice(0, _downKeys.length);
    } // 修饰键 shiftKey altKey ctrlKey (command||metaKey) 清除


    if (key === 93 || key === 224) key = 91;

    if (key in _mods) {
      _mods[key] = false; // 将修饰键重置为false

      for (var k in _modifier) {
        if (_modifier[k] === key) hotkeys[k] = false;
      }
    }
  } // 解除绑定某个范围的快捷键


  function unbind(key, scope, method) {
    var multipleKeys = getKeys(key);
    var keys;
    var mods = [];
    var obj; // 通过函数判断，是否解除绑定
    // https://github.com/jaywcjlove/hotkeys/issues/44

    if (typeof scope === 'function') {
      method = scope;
      scope = 'all';
    }

    for (var i = 0; i < multipleKeys.length; i++) {
      // 将组合快捷键拆分为数组
      keys = multipleKeys[i].split('+'); // 记录每个组合键中的修饰键的键码 返回数组

      if (keys.length > 1) {
        mods = getMods(_modifier, keys);
      } else {
        mods = [];
      } // 获取除修饰键外的键值key


      key = keys[keys.length - 1];
      key = key === '*' ? '*' : code(key); // 判断是否传入范围，没有就获取范围

      if (!scope) scope = getScope(); // 如何key不在 _handlers 中返回不做处理

      if (!_handlers[key]) return; // 清空 handlers 中数据，
      // 让触发快捷键键之后没有事件执行到达解除快捷键绑定的目的

      for (var r = 0; r < _handlers[key].length; r++) {
        obj = _handlers[key][r]; // 通过函数判断，是否解除绑定，函数相等直接返回

        var isMatchingMethod = method ? obj.method === method : true; // 判断是否在范围内并且键值相同

        if (isMatchingMethod && obj.scope === scope && compareArray(obj.mods, mods)) {
          _handlers[key][r] = {};
        }
      }
    }
  } // 对监听对应快捷键的回调函数进行处理


  function eventHandler(event, handler, scope) {
    var modifiersMatch; // 看它是否在当前范围

    if (handler.scope === scope || handler.scope === 'all') {
      // 检查是否匹配修饰符（如果有返回true）
      modifiersMatch = handler.mods.length > 0;

      for (var y in _mods) {
        if (Object.prototype.hasOwnProperty.call(_mods, y)) {
          if (!_mods[y] && handler.mods.indexOf(+y) > -1 || _mods[y] && handler.mods.indexOf(+y) === -1) modifiersMatch = false;
        }
      } // 调用处理程序，如果是修饰键不做处理


      if (handler.mods.length === 0 && !_mods[16] && !_mods[18] && !_mods[17] && !_mods[91] || modifiersMatch || handler.shortcut === '*') {
        if (handler.method(event, handler) === false) {
          if (event.preventDefault) event.preventDefault();else event.returnValue = false;
          if (event.stopPropagation) event.stopPropagation();
          if (event.cancelBubble) event.cancelBubble = true;
        }
      }
    }
  } // 处理keydown事件


  function dispatch(event) {
    var asterisk = _handlers['*'];
    var key = event.keyCode || event.which || event.charCode; // 表单控件过滤 默认表单控件不触发快捷键

    if (!hotkeys.filter.call(this, event)) return; // Collect bound keys
    // If an Input Method Editor is processing key input and the event is keydown, return 229.
    // https://stackoverflow.com/questions/25043934/is-it-ok-to-ignore-keydown-events-with-keycode-229
    // http://lists.w3.org/Archives/Public/www-dom/2010JulSep/att-0182/keyCode-spec.html

    if (_downKeys.indexOf(key) === -1 && key !== 229) _downKeys.push(key); // Gecko(Firefox)的command键值224，在Webkit(Chrome)中保持一致
    // Webkit左右command键值不一样

    if (key === 93 || key === 224) key = 91;

    if (key in _mods) {
      _mods[key] = true; // 将特殊字符的key注册到 hotkeys 上

      for (var k in _modifier) {
        if (_modifier[k] === key) hotkeys[k] = true;
      }

      if (!asterisk) return;
    } // 将modifierMap里面的修饰键绑定到event中


    for (var e in _mods) {
      if (Object.prototype.hasOwnProperty.call(_mods, e)) {
        _mods[e] = event[modifierMap[e]];
      }
    } // 获取范围 默认为all


    var scope = getScope(); // 对任何快捷键都需要做的处理

    if (asterisk) {
      for (var i = 0; i < asterisk.length; i++) {
        if (asterisk[i].scope === scope && (event.type === 'keydown' && asterisk[i].keydown || event.type === 'keyup' && asterisk[i].keyup)) {
          eventHandler(event, asterisk[i], scope);
        }
      }
    } // key 不在_handlers中返回


    if (!(key in _handlers)) return;

    for (var _i = 0; _i < _handlers[key].length; _i++) {
      if (event.type === 'keydown' && _handlers[key][_i].keydown || event.type === 'keyup' && _handlers[key][_i].keyup) {
        if (_handlers[key][_i].key) {
          var keyShortcut = _handlers[key][_i].key.split('+');

          var _downKeysCurrent = []; // 记录当前按键键值

          for (var a = 0; a < keyShortcut.length; a++) {
            _downKeysCurrent.push(code(keyShortcut[a]));
          }

          _downKeysCurrent = _downKeysCurrent.sort();

          if (_downKeysCurrent.join('') === _downKeys.sort().join('')) {
            // 找到处理内容
            eventHandler(event, _handlers[key][_i], scope);
          }
        }
      }
    }
  } // 判断 element 是否已经绑定事件


  function isElementBind(element) {
    return elementHasBindEvent.indexOf(element) > -1;
  }

  function hotkeys(key, option, method) {
    var keys = getKeys(key); // 需要处理的快捷键列表

    var mods = [];
    var scope = 'all'; // scope默认为all，所有范围都有效

    var element = document; // 快捷键事件绑定节点

    var i = 0;
    var keyup = false;
    var keydown = true; // 对为设定范围的判断

    if (method === undefined && typeof option === 'function') {
      method = option;
    }

    if (Object.prototype.toString.call(option) === '[object Object]') {
      if (option.scope) scope = option.scope; // eslint-disable-line

      if (option.element) element = option.element; // eslint-disable-line

      if (option.keyup) keyup = option.keyup; // eslint-disable-line

      if (option.keydown) keydown = option.keydown; // eslint-disable-line
    }

    if (typeof option === 'string') scope = option; // 对于每个快捷键进行处理

    for (; i < keys.length; i++) {
      key = keys[i].split('+'); // 按键列表

      mods = []; // 如果是组合快捷键取得组合快捷键

      if (key.length > 1) mods = getMods(_modifier, key); // 将非修饰键转化为键码

      key = key[key.length - 1];
      key = key === '*' ? '*' : code(key); // *表示匹配所有快捷键
      // 判断key是否在_handlers中，不在就赋一个空数组

      if (!(key in _handlers)) _handlers[key] = [];

      _handlers[key].push({
        keyup: keyup,
        keydown: keydown,
        scope: scope,
        mods: mods,
        shortcut: keys[i],
        method: method,
        key: keys[i]
      });
    } // 在全局document上设置快捷键


    if (typeof element !== 'undefined' && !isElementBind(element) && window) {
      elementHasBindEvent.push(element);
      addEvent(element, 'keydown', function (e) {
        dispatch(e);
      });
      addEvent(window, 'focus', function () {
        _downKeys = [];
      });
      addEvent(element, 'keyup', function (e) {
        dispatch(e);
        clearModifier(e);
      });
    }
  }

  var _api = {
    setScope: setScope,
    getScope: getScope,
    deleteScope: deleteScope,
    getPressedKeyCodes: getPressedKeyCodes,
    isPressed: isPressed,
    filter: filter,
    unbind: unbind
  };

  for (var a in _api) {
    if (Object.prototype.hasOwnProperty.call(_api, a)) {
      hotkeys[a] = _api[a];
    }
  }

  if (typeof window !== 'undefined') {
    var _hotkeys = window.hotkeys;

    hotkeys.noConflict = function (deep) {
      if (deep && window.hotkeys === hotkeys) {
        window.hotkeys = _hotkeys;
      }

      return hotkeys;
    };

    window.hotkeys = hotkeys;
  }

  return hotkeys;

}));
